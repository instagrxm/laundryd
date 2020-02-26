import { Command } from "@oclif/command";
import { SharedFlags } from "./core/sharedFlags";

export type CommandType = typeof Command;

export default class BaseCommand extends Command {
  static flags = {
    mongo: SharedFlags.mongo()
  };

  static args = [];

  async run(): Promise<void> {
    const { args, flags } = this.parse(BaseCommand);
  }

  getType(): CommandType {
    return Object.getPrototypeOf(this).constructor;
  }
}
