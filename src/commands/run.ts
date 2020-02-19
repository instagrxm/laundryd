import { Command, flags } from "@oclif/command";
import { CronJob } from "cron";
import * as Globby from "globby";
import path from "path";
import { Item, LoadedItem } from "../core/item";
import { Settings } from "../core/settings";
import { Dry } from "../core/washers/dry";
import { Rinse } from "../core/washers/rinse";
import { Wash } from "../core/washers/wash";
import { WasherInstance, WasherType } from "../core/washers/washer";
import { Database } from "../storage/database";

// TODO: Temporary web server
const server = require("net")
  .createServer()
  .listen();

export default class Run extends Command {
  static description = "";

  static flags = {
    config: flags.string({
      required: true,
      description:
        "path to a javascript file exporting an array of washer settings"
    }),

    mongo: flags.string({
      required: true,
      description: "mongodb connection string"
    })
  };

  static args = [];

  private washerTypes!: Record<string, WasherType>;
  private washers!: Record<string, WasherInstance>;
  private database!: Database;

  async run(): Promise<void> {
    const { args, flags } = this.parse(Run);

    this.database = new Database();
    await this.database.init(flags.mongo);

    this.washerTypes = await this.loadWasherTypes();
    const settings = await this.loadSettings(flags.config);
    this.washers = this.createWashers(this.washerTypes, settings);
    this.startSchedules(Object.values(this.washers));

    // const pipeline = [{ $match: { "fullDocument.foo": "bar" } }];
    // const collection = db.collection("laundry");

    // const changeStream = collection.watch(pipeline);
    // changeStream.on("change", function(change) {
    //   console.log(change);
    // });

    // setTimeout(function() {
    //   collection.insertOne({ foo: "bar" });
    // }, 1000);
  }

  /**
   * Find files which could contain washers.
   */
  private async loadWasherTypes(): Promise<Record<string, WasherType>> {
    const patterns = [
      "**/*.+(js|ts|tsx)",
      "!**/*.+(d.ts|test.ts|test.js|spec.ts|spec.js)?(x)"
    ];

    // Eventually add plugin paths here.
    const dirs = [path.join(__dirname, "../washers")];
    const files: {
      dir: string;
      file: string;
      name: string;
      exported: any;
    }[] = [];

    for (const dir of dirs) {
      for (const file of Globby.sync(patterns, { cwd: dir })) {
        let exported;
        try {
          exported = await require(path.join(dir, file));
        } catch {
          continue;
        }
        const parsedFile = path.parse(file);
        const name = `${parsedFile.dir}/${parsedFile.name}`;
        files.push({ dir, file, name, exported });
      }
    }

    const types = [Wash, Rinse, Dry];
    const washers: Record<string, WasherType> = {};

    // Search each file for Washers.
    for (const file of files) {
      for (const key of Object.keys(file.exported)) {
        const exported = file.exported[key] as Function;
        let prototype = Object.getPrototypeOf(exported);
        while (prototype) {
          if (types.includes(prototype)) {
            washers[file.name] = exported as WasherType;
            break;
          }
          prototype = Object.getPrototypeOf(prototype);
        }
      }
    }

    return washers;
  }

  /**
   * Load settings from a file.
   * @param file a script which exports an array of washer settings
   */
  private async loadSettings(file: string): Promise<Settings[]> {
    let config: Settings[];
    try {
      config = await require(file);
    } catch {
      throw new Error("couldn't read config file");
    }

    if (Object.getPrototypeOf(config) !== Object.getPrototypeOf([])) {
      throw new Error("washers array not found in config file");
    }

    return config;
  }

  /**
   * Given information about the washers on disk and the desired settings,
   * instantiate the washers.
   * @param types the washer types detected on disk, associated with a name derived from their file path
   * @param settings the settings loaded from the settings file
   */
  private createWashers(
    types: Record<string, WasherType>,
    settings: Settings[]
  ): Record<string, WasherInstance> {
    // Washer IDs must be unique
    const ids = settings.map(c => c.id).filter(c => c);
    for (const id of ids) {
      const dupes = ids.filter(i => i === id);
      if (dupes.length > 1) {
        throw new Error(`duplicate id "${id}"`);
      }
    }

    const washers: Record<string, WasherInstance> = {};

    for (const setting of settings) {
      if (!types[setting.name]) {
        console.warn(`washer "${setting.name}" was not found`);
        continue;
      }

      washers[setting.id] = new types[setting.name](setting);
      console.info(`washer "${setting.name}" created`);
    }

    return washers;
  }

  /**
   * Kick off the cron schedules for any washers that have them.
   * @param washers all running washers
   */
  private startSchedules(washers: WasherInstance[]): void {
    for (const washer of washers) {
      if (!washer.schedule) {
        continue;
      }

      new CronJob({
        cronTime: washer.schedule,
        onTick: async (): Promise<void> => await this.queueSchedule(washer),
        start: true
      });
    }
  }

  private scheduleQueue: Record<string, Array<WasherInstance>> = {};
  /**
   * Given a washer, get the run queue for its source.
   * @param washer a washer that would be placed in the queue
   */
  private getQueue(washer: WasherInstance): Array<WasherInstance> {
    const info: WasherType = Object.getPrototypeOf(washer).constructor;
    this.scheduleQueue[info.source] = this.scheduleQueue[info.source] || [];
    return this.scheduleQueue[info.source];
  }

  /**
   * When a washer's schedule ticks, put it in a queue to run after others with the same source.
   * @param washer the washer to put into the queue
   */
  private async queueSchedule(washer: WasherInstance): Promise<void> {
    const queue = this.getQueue(washer);
    if (queue.includes(washer)) {
      return;
    }
    queue.push(washer);
    if (queue.length === 1) {
      await this.runSchedule(washer);
    }
  }

  /**
   * Run a scheduled washer
   * @param washer the washer to run
   */
  async runSchedule(washer: WasherInstance): Promise<void> {
    let input: LoadedItem[] = [];
    let output: Item[] = [];

    // Load memory
    washer.memory = await this.database.loadMemory(washer);

    if (washer instanceof Rinse || washer instanceof Dry) {
      // Load items since memory.lastRun from the database
      for (const id of washer.subscribe) {
        const since = washer.memory.lastRun || new Date();
        const items = await this.database.loadItems(this.washers[id], since);
        input = input.concat(items);
      }
    }

    if (washer instanceof Wash) {
      output = await washer.run();
    } else if (washer instanceof Rinse) {
      output = await washer.run(input);
    } else if (washer instanceof Dry) {
      await washer.run(input);
    }

    // Write output to the database
    await this.database.saveItems(washer, output);

    // Write memory
    washer.memory.lastRun = new Date();
    if (input && input.length) {
      washer.memory.lastItem = input[0];
    }
    await this.database.saveMemory(washer);

    const queue = this.getQueue(washer);
    queue.shift();
    if (queue.length) {
      await this.runSchedule(queue[0]);
    }
  }
}
