import { IConfig } from "@oclif/config";
import { OutputArgs, OutputFlags } from "@oclif/parser";
import BaseCommand from "./baseCommand";

/**
 * Provide global access to the oclif config object.
 */
export class Config {
  static config: IConfig;
  static args: OutputArgs<typeof BaseCommand.args>;
  static flags: OutputFlags<typeof BaseCommand.flags>;

  static init(
    config: IConfig,
    flags: OutputFlags<typeof BaseCommand.flags>,
    args: OutputArgs<typeof BaseCommand.args>
  ): void {
    Config.config = config;
    Config.flags = flags;
    Config.args = args;
  }
}
