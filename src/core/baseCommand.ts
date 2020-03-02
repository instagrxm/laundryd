import { Command } from "@oclif/command";
import { Input } from "@oclif/command/lib/flags";
import { OutputArgs, OutputFlags } from "@oclif/parser";
import fs from "fs-extra";
import { Config } from "./config";

export type CommandType = typeof Command;

export default class BaseCommand extends Command {
  static flags = {};
  protected flags!: OutputFlags<typeof BaseCommand.flags>;

  static args = [];
  protected args!: OutputArgs<typeof BaseCommand.args>;

  async run(): Promise<void> {
    const { flags, args } = this.parse(
      this.constructor as Input<typeof BaseCommand.flags>
    );

    this.flags = flags;
    this.args = args;

    Config.init(this.config);

    await fs.ensureDir(this.config.cacheDir);
    await fs.ensureDir(this.config.dataDir);
  }

  get static(): CommandType {
    return Object.getPrototypeOf(this).constructor;
  }
}
