import { flags } from "@oclif/command";
import { parse } from "@oclif/parser";
import * as Globby from "globby";
import path from "path";
import BaseCommand from "../baseCommand";
import { Config } from "../core/config";
import { Log } from "../core/log";
import { Dry } from "../core/washers/dry";
import { Rinse } from "../core/washers/rinse";
import { Wash } from "../core/washers/wash";
import { Washer, WasherType } from "../core/washers/washer";

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

    files: flags.string({
      required: true,
      default: "(OS cache dir)",
      env: "LAUNDRY_FILES",
      description:
        "where to store downloaded files, either a local path or an s3:// location"
    }),

    fileUrl: flags.string({
      required: true,
      default: "http://localhost:3000/files",
      env: "LAUNDRY_URL",
      description: "a URL which maps to the file location"
    }),

    port: flags.integer({
      required: true,
      default: 3000,
      env: "LAUNDRY_PORT",
      description:
        "the port to use for the web server which hosts files and the admin interface"
    })
  };

  static args = [];

  private washerTypes!: Record<string, WasherType>;
  private washers!: Record<string, Washer>;
  private fileConn!: string;
  private fileUrl!: string;

  async run(): Promise<void> {
    const { args, flags } = this.parse(Run);

    if (flags.files === Run.flags.files.default) {
      flags.files = Config.config.cacheDir;
    }

    this.fileConn = flags.files;
    this.fileUrl = flags.fileUrl;

    this.washerTypes = await this.loadWasherTypes();
    const settings = await this.loadSettings(flags.config);
    this.washers = await this.createWashers(this.washerTypes, settings);
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

      // let fileStore: FileStore;
      // if (this.fileConn.startsWith("s3://")) {
      //   fileStore = new S3(washer, this.fileConn);
      // } else {
      //   fileStore = new FileStore(washer, this.fileConn, this.fileUrl);
      // }
      // await fileStore.validate();

      Log.info(this, `washer "${setting.title}" created`);
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
