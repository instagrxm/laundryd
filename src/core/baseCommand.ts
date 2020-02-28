import { Command } from "@oclif/command";

export type CommandType = typeof Command;

export default class BaseCommand extends Command {
  static flags = {};

  static args = [];

  async run(): Promise<void> {
    const { args, flags } = this.parse(BaseCommand);
  }

  get static(): CommandType {
    return Object.getPrototypeOf(this).constructor;
  }
}
