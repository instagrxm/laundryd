import { Command, flags } from "@oclif/command";

export type CommandType = typeof Command;

export default class BaseCommand extends Command {
  static flags = {
    mongo: flags.string({
      required: true,
      description: "mongodb connection string",
      default: "mongodb://localhost:27017/laundry"
    })
  };

  static args = [];

  async run(): Promise<void> {
    const { args, flags } = this.parse(BaseCommand);
  }

  getInfo(): CommandType {
    return Object.getPrototypeOf(this).constructor;
  }
}
