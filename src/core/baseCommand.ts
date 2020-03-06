import { Command } from "@oclif/command";
import { OutputArgs, OutputFlags } from "@oclif/parser";
import fs from "fs-extra";
import { MongoDB } from "../drivers/mongodb";
import { Config } from "./config";
import { Database } from "./database";
import { Settings } from "./settings";

export type CommandType = typeof Command;

export default class BaseCommand extends Command {
  static flags = {
    database: Settings.database()
  };

  static args = [];

  protected flags!: OutputFlags<typeof BaseCommand.flags>;
  protected args!: OutputArgs<typeof BaseCommand.args>;

  database!: Database;

  async run(commandClass?: any): Promise<void> {
    const { args, flags } = this.parse(commandClass || BaseCommand);
    this.flags = flags as OutputFlags<typeof BaseCommand.flags>;
    this.args = args as OutputArgs<typeof BaseCommand.args>;

    Config.init(this.config);

    this.database = new MongoDB();
    await this.database.init(this.flags.database);

    await fs.ensureDir(this.config.cacheDir);
    await fs.ensureDir(this.config.dataDir);
  }

  get static(): CommandType {
    return Object.getPrototypeOf(this).constructor;
  }
}
