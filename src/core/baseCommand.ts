import { Command } from "@oclif/command";
import { OutputArgs, OutputFlags } from "@oclif/parser";
import fs from "fs-extra";
import { Config } from "./config";

export type CommandType = typeof Command;

export default class BaseCommand extends Command {
  static flags = {};
  static args = [];

  protected flags!: OutputFlags<typeof BaseCommand.flags>;
  protected args!: OutputArgs<typeof BaseCommand.args>;

  async run(commandClass?: any): Promise<void> {
    const { args, flags } = this.parse(commandClass || BaseCommand);
    this.flags = flags as OutputFlags<typeof BaseCommand.flags>;
    this.args = args as OutputArgs<typeof BaseCommand.args>;

    Config.init(this.config);

    await fs.ensureDir(this.config.cacheDir);
    await fs.ensureDir(this.config.dataDir);
  }

  get static(): CommandType {
    return Object.getPrototypeOf(this).constructor;
  }
}
