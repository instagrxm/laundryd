import { flags } from "@oclif/command";
import { OutputArgs, OutputFlags, parse } from "@oclif/parser";
import * as Globby from "globby";
import path from "path";
import BaseCommand from "../core/baseCommand";
import { Config } from "../core/config";
import { Files } from "../core/files";
import { Log } from "../core/log";
import { Settings } from "../core/settings";
import { Dry } from "../core/washers/dry";
import { Fix } from "../core/washers/fix";
import { Rinse } from "../core/washers/rinse";
import { WasherType } from "../core/washers/shared";
import { Wash } from "../core/washers/wash";
import { Washer } from "../core/washers/washer";
import { WasherInfo } from "../core/washers/washerInfo";
import { LocalFiles } from "../drivers/localFiles";
import { S3Files } from "../drivers/s3files";

export default class Run extends BaseCommand {
  static description = "";

  static flags = {
    ...BaseCommand.flags,

    config: flags.string({
      required: true,
      env: "LAUNDRY_CONFIG",
      description:
        "path to a javascript file exporting an array of washer settings"
    }),

    port: flags.integer({
      required: true,
      default: 3000,
      env: "LAUNDRY_PORT",
      description:
        "the port to use for the web server which hosts files and the admin interface"
    }),

    files: Settings.files(),
    fileUrl: Settings.filesUrl(),
    downloadPool: Settings.downloadPool()
  };

  static args = [];

  flags!: OutputFlags<typeof Run.flags>;
  args!: OutputArgs<typeof Run.args>;
  washers!: Record<string, Washer>;

  async run(): Promise<void> {
    await super.run(Run);

    if (this.flags.files === Settings.filesHelp) {
      this.flags.files = Config.config.dataDir;
    }

    const washerTypes = await this.loadWasherTypes();
    const settings = await this.loadSettings(this.flags.config);
    this.washers = await this.createWashers(washerTypes, settings);
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
        let name = parsedFile.dir;
        name = name ? name + "/" : "";
        name += parsedFile.name;

        files.push({ dir, file, name, exported });
      }
    }

    const types = [Wash, Rinse, Dry, Fix];
    const washers: Record<string, WasherType> = {};

    // Search each file for Washers.
    for (const file of files) {
      for (const key of Object.keys(file.exported)) {
        const exported = file.exported[key] as Function;
        // @ts-ignore
        const info: WasherInfo = exported.info;
        if (info.abstract) {
          continue;
        }
        let prototype = Object.getPrototypeOf(exported);
        while (prototype) {
          if (types.includes(prototype)) {
            info.name = file.name;
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
  private async loadSettings(file: string): Promise<Record<string, any>[]> {
    let config: Record<string, any>[];
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
    settings: Record<string, any>[]
  ): Promise<Record<string, Washer>> {
    for (const setting of settings) {
      if (!setting.name) {
        throw new Error(`missing title: ${setting.id}`);
      }
      if (!types[setting.name]) {
        throw new Error(`washer not found: ${setting.name}`);
      }
      if (
        setting.id &&
        settings.some(s => s !== setting && s.id === setting.id)
      ) {
        throw new Error(`duplicate washer id: ${setting.id}`);
      }
    }

    // Actually create the instances
    const washers: Record<string, Washer> = {};
    const sources: Record<string, Wash | Rinse> = {};
    for (const setting of settings) {
      // Let washers inherit settings from the run command.
      const flags = Object.keys(types[setting.name].settings);
      const keys = Object.keys(this.flags);
      const vals = Object.values(this.flags);
      keys.forEach((key, index) => {
        if (setting[key] === undefined && flags.includes(key)) {
          setting[key] = vals[index];
        }
      });

      // Convert the settings into something that looks like command-line args,
      // since that's what the oclif parser is expecting. This is kind of janky
      // but it beats writing my own parser.
      const argv = Object.keys(setting)
        .filter(key => key !== "name")
        .map(key => {
          const val = setting[key];
          if (typeof val === "boolean") {
            return val ? `--${key}` : `--no-${key}`;
          } else if (
            typeof val === "string" ||
            typeof val === "number" ||
            val.length !== undefined
          ) {
            return `--${key}=${val}`;
          } else {
            return `--${key}=${JSON.stringify(val)}`;
          }
        })
        .filter(s => s);

      // Create and set up the washer
      let washer;
      try {
        const { flags } = parse(argv, { flags: types[setting.name].settings });

        washer = new types[setting.name](flags, this.database);
      } catch (error) {
        throw new Error(`${setting.id}: ${error.message}`);
      }
      washers[setting.id] = washer;
      if (washer instanceof Wash || washer instanceof Rinse) {
        sources[setting.id] = washer as Wash | Rinse;
      }

      await Log.debug(this, { msg: `washer "${setting.name}" created` });
    }

    for (const washer of Object.values(washers)) {
      if (!washer.config.enabled) {
        continue;
      }

      if (washer instanceof Fix) {
        washer.runExclusive = this.runExclusive.bind(this);
      }

      try {
        let fileStore: Files;
        if (washer.config.files.startsWith("s3://")) {
          fileStore = new S3Files(washer, washer.config.files);
        } else {
          fileStore = new LocalFiles(
            washer,
            washer.config.files,
            washer.config.fileUrl
          );
        }
        await fileStore.validate();
        washer.files = fileStore;

        if (washer instanceof Rinse || washer instanceof Dry) {
          // Init the washers with any others that they can subscribe to
          await washer.preInit(fileStore, sources);
        } else {
          await washer.preInit(fileStore);
        }
        await washer.init();
      } catch (error) {
        throw new Error(`${washer.config.id}: ${error.message}`);
      }
    }

    return washers;
  }

  /**
   * Request to pause all washers, wait for them to complete, and run an exclusive task.
   * @param washer a "fix" washer requesting to run an exclusive task
   */
  async runExclusive(washer: Fix): Promise<void> {
    const washers = Object.values(this.washers).filter(w => w != washer);

    // Pause all washers
    washers.forEach(w => (w.paused = true));

    // Wait for anything running to finish
    const exclusive = new Promise((resolve, reject) => {
      const wait = (): void => {
        if (!washers.some(w => w.running)) {
          resolve();
        } else {
          setTimeout(wait, 1000);
        }
      };
      wait();
    });
    await exclusive;

    // Run the exclusive task
    await washer.run();

    // Unpause
    washers.forEach(w => (w.paused = false));
  }
}
