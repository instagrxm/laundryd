import { OutputFlags } from "@oclif/parser/lib/parse";
import clone from "clone";
import util, { InspectOptions } from "util";
import { Dry, Item, Settings, WasherInfo } from "../../core";

export class Stdout extends Dry {
  static readonly info = new WasherInfo({
    title: "stdout",
    description: "output items to the console",
    memory: false,
  });

  static settings = {
    ...Dry.settings,

    color: Settings.boolean({
      default: false,
      description: "output in color",
    }),

    compact: Settings.boolean({
      default: false,
      description: "false to output each object to a single line",
    }),
  };

  config!: OutputFlags<typeof Stdout.settings>;
  inspectOptions!: InspectOptions;

  async init(): Promise<void> {
    this.inspectOptions = {
      colors: this.config.color,
      compact: this.config.compact,
      breakLength: Number.POSITIVE_INFINITY,
    };
  }

  async run(items: Item[]): Promise<void> {
    for (const item of items) {
      const i: any = clone(item);
      if (item.saved) {
        i.saved = item.saved.toJSDate();
      }
      i.created = item.created.toJSDate();

      const json = util.inspect(i, this.inspectOptions);
      process.stdout.write(json + "\n");
    }
  }
}
