import { flags } from "@oclif/command";
import { parse } from "@oclif/parser";
import { OutputFlags } from "@oclif/parser/lib/parse";
import * as Globby from "globby";
import path from "path";
import BaseCommand from "../baseCommand";
import { Config } from "../core/config";
import { Log } from "../core/log";
import { Dry } from "../core/washers/dry";
import { Rinse } from "../core/washers/rinse";
import { Shared, WasherType } from "../core/washers/shared";
import { Wash } from "../core/washers/wash";
import { Washer } from "../core/washers/washer";

// TODO: Temporary web server
const server = require("net")
  .createServer()
  .listen();

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

    files: Shared.flags.files,
    fileUrl: Shared.flags.fileUrl,
    downloadPool: Shared.flags.downloadPool,
    retain: Shared.flags.retain
  };

  static args = [];

  flags!: OutputFlags<typeof Run.flags>;

  async run(): Promise<void> {
    const { args, flags } = this.parse(Run);

    if (flags.files === Run.flags.files.default) {
      flags.files = Config.config.cacheDir;
    }

    this.flags = flags;

    const washerTypes = await this.loadWasherTypes();
    const settings = await this.loadSettings(flags.config);
    const washers = await this.createWashers(washerTypes, settings);
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
      if (!setting.title) {
        throw new Error(`missing title: ${setting.id}`);
      }
      if (!types[setting.title]) {
        throw new Error(`washer not found: ${setting.title}`);
      }
    }

    // Actually create the instances
    const washers: Record<string, Washer> = {};
    const sources: Record<string, Wash | Rinse> = {};
    for (const setting of settings) {
      const flags = Object.keys(types[setting.title].flags);
      if (setting.files === undefined && flags.includes("files")) {
        setting.files = this.flags.files;
      }
      if (setting.fileUrl === undefined && flags.includes("fileUrl")) {
        setting.fileUrl = this.flags.fileUrl;
      }
      if (setting.retain === undefined && flags.includes("retain")) {
        setting.retain = this.flags.retain;
      }

      // Convert the settings into something that looks like command-line args,
      // since that's what the oclif parser is expecting.
      const argv = Object.keys(setting)
        .filter(key => key !== "title")
        .map(key => {
          const val = setting[key];
          if (typeof val === "boolean") {
            return val ? `--${key}` : "";
          }
          return `--${key}=${setting[key]}`;
        });

      // @ts-ignore: parse the arguments
      const config = parse(argv, { flags: types[setting.title].flags });

      // Create and set up the washer
      let washer;
      try {
        washer = new types[setting.title](config.flags);
      } catch (error) {
        throw new Error(`${setting.id}: ${error}`);
      }
      washers[setting.id] = washer;
      if (washer instanceof Wash || washer instanceof Rinse) {
        sources[setting.id] = washer as Wash | Rinse;
      }

      await Log.info(this, `washer "${setting.title}" created`);
    }

    // Init the washers with any others that they can subscribe to
    for (const washer in washers) {
      try {
        await washers[washer].init(sources);
      } catch (error) {
        throw new Error(`${washers[washer].config.id}: ${error}`);
      }
    }

    return washers;
  }
}
