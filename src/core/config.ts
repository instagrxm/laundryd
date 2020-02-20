import { IConfig } from "@oclif/config";

/**
 * Provide global access to the oclif config object.
 */
export class Config {
  static config: IConfig;

  static init(config: IConfig): void {
    Config.config = config;
  }
}
