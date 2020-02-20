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
    this.washers = await this.createWashers(this.washerTypes, settings);
    this.startSchedules(Object.values(this.washers));
    this.startSubscriptions(this.washers);
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
  private async createWashers(
    types: Record<string, WasherType>,
    settings: Settings[]
  ): Promise<Record<string, WasherInstance>> {
    for (const setting of settings) {
      if (!setting.id) {
        throw new Error(`missing id: ${setting.name}`);
      }
      if (!setting.name) {
        throw new Error(`missing name: ${setting.id}`);
      }
      if (settings.filter(s => s.id === setting.id).length > 1) {
        throw new Error(`duplicate id: ${setting.id}`);
      }
      if (!types[setting.name]) {
        throw new Error(`washer not found: ${setting.name}`);
      }
      if (setting.subscribe) {
        if (!(setting.subscribe instanceof Array)) {
          throw new Error(`subscribe should be an array: ${setting.name}`);
        }
        for (const sub of setting.subscribe) {
          if (!settings.find(s => s.id === sub)) {
            throw new Error(
              `washer ${setting.name} subscribed to ${sub} but ${sub} was not found`
            );
          }
        }
      }
    }

    // Actually create the instances
    const washers: Record<string, WasherInstance> = {};
    for (const setting of settings) {
      const washer = new types[setting.name](setting);
      await this.database.loadMemory(washer);
      washers[setting.id] = washer;
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
        onTick: async (): Promise<void> => await this.runSchedule(washer),
        start: true
      });
    }
  }

  /**
   * Run a scheduled washer.
   * @param washer the washer to run
   */
  private async runSchedule(washer: WasherInstance): Promise<void> {
    // Load items since memory.lastRun from the database
    let input: LoadedItem[] = [];
    if (washer instanceof Rinse || washer instanceof Dry) {
      for (const id of washer.subscribe) {
        const since = washer.memory.lastRun || new Date();
        const items = await this.database.loadItems(this.washers[id], since);
        input = input.concat(items);
      }
      if (!input.length) {
        return;
      }
    }

    await this.runWasher(washer, input);
  }

  /**
   * Set up real-time subscriptions between washers.
   * @param washers all running washers
   */
  private startSubscriptions(washers: Record<string, WasherInstance>): void {
    for (const washer of Object.values(washers).filter(w => !w.schedule)) {
      if (washer instanceof Rinse || washer instanceof Dry) {
        for (const sub of washer.subscribe) {
          this.database.subscribe(washers[sub], (item: LoadedItem) => {
            this.runWasher(washer, [item]);
          });
        }
      }
    }
  }

  /**
   * Run washer logic and save its output.
   * @param washer the washer to run
   * @param input the items the washer should process
   */
  private async runWasher(
    washer: WasherInstance,
    input: LoadedItem[] = []
  ): Promise<void> {
    // Run the washer logic and capture the output
    let output: Item[] = [];

    try {
      if (washer instanceof Wash) {
        output = await washer.run();
      } else if (washer instanceof Rinse) {
        output = await washer.run(input);
      } else if (washer instanceof Dry) {
        await washer.run(input);
      }
    } catch (error) {
      console.error(error, washer.id, washer.getInfo().title);
      return;
    }

    // Newest items first
    output.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Write output to the database
    await this.database.saveItems(washer, output);

    // Write memory to the database
    washer.memory.lastRun = new Date();
    if (input && input.length) {
      washer.memory.lastItem = input[0];
    }
    await this.database.saveMemory(washer);
  }
}
