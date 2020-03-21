import { Command, flags } from "@oclif/command";
import { OutputArgs, OutputFlags } from "@oclif/parser";
import fs from "fs-extra";
import os from "os";
import { MongoDB } from "../drivers/mongodb";
import { Config } from "./config";
import { Database } from "./database";

export type CommandType = typeof Command;

export default class BaseCommand extends Command {
  static filesHelp =
    os.platform() === "win32"
      ? "%LOCALAPPDATA%laundry"
      : "~/.local/share/laundry";

  static flags = {
    database: flags.string({
      required: true,
      default: () =>
        process.env.LAUNDRY_DB || "mongodb://localhost:27017/laundry",
      description: "database connection string\n(env: LAUNDRY_DB)"
    }),

    files: flags.string({
      required: true,
      default: () => process.env.LAUNDRY_FILES || BaseCommand.filesHelp,
      description:
        "where to store downloaded files, either a local path or an s3:// location\n(env: LAUNDRY_FILES)"
    }),

    fileUrl: flags.string({
      required: true,
      default: () =>
        process.env.LAUNDRY_FILES_URL || "http://localhost:3000/files",
      description:
        "a URL which maps to the file location\n(env: LAUNDRY_FILES_URL)"
    }),

    downloadPool: flags.integer({
      required: true,
      default: () => {
        const env = process.env.LAUNDRY_DOWNLOAD_POOL;
        if (env) {
          const n = parseInt(env);
          if (!isNaN(n)) {
            return n;
          }
        }
        return 5;
      },
      hidden: true,
      description:
        "how many downloads to perform simultaneously\n(env: LAUNDRY_DOWNLOAD_POOL)"
    })
  };

  static args = [];

  protected flags!: OutputFlags<typeof BaseCommand.flags>;
  protected args!: OutputArgs<typeof BaseCommand.args>;

  database!: Database;

  async run(commandClass?: any): Promise<void> {
    const { args, flags } = this.parse(commandClass || BaseCommand);
    this.flags = flags as OutputFlags<typeof BaseCommand.flags>;
    this.args = args as OutputArgs<typeof BaseCommand.args>;

    Config.init(this.config, this.flags, this.args);

    if (this.flags.files === BaseCommand.filesHelp) {
      this.flags.files = Config.config.dataDir;
    }

    this.database = new MongoDB();
    await this.database.init(this.flags.database);

    await fs.ensureDir(this.config.cacheDir);
    await fs.ensureDir(this.config.dataDir);
  }

  get static(): CommandType {
    return Object.getPrototypeOf(this).constructor;
  }
}
