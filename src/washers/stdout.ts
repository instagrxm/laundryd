import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import util from "util";
import { LoadedItem } from "../core/item";
import { LogLevel } from "../core/log";
import { Dry } from "../core/washers/dry";

export class Stdout extends Dry {
  static readonly title: string = "stdout";

  static flags = {
    ...Dry.flags,

    memory: flags.boolean({
      default: false
    }),

    color: flags.boolean({
      default: false,
      description: "output in color"
    }),

    levels: flags.build<LogLevel[]>({
      default: [LogLevel.info, LogLevel.warn, LogLevel.error],
      parse: (input: string) => {
        if (!(input in LogLevel)) {
          return [LogLevel.info, LogLevel.warn, LogLevel.error];
        }

        const levels = Object.values(LogLevel);
        return levels.slice(levels.indexOf(input as LogLevel));
      },
      description: "get this log level and higher"
    })()
  };

  config!: OutputFlags<typeof Stdout.flags>;

  async run(items: LoadedItem[]): Promise<void> {
    for (const item of items) {
      if (this.config.levels.includes(item.text)) {
        const json = util.inspect(
          item,
          undefined,
          undefined,
          this.config.color
        );
        process.stdout.write(json + "\n");
      }
    }
  }
}
