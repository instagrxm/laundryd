import { OutputFlags } from "@oclif/parser/lib/parse";
import clone from "clone";
import util from "util";
import { LoadedItem } from "../../core/item";
import { Settings } from "../../core/settings";
import { Dry } from "../../core/washers/dry";
import { WasherInfo } from "../../core/washers/washerInfo";

export class Stdout extends Dry {
  static readonly info = new WasherInfo({
    title: "stdout",
    description: "output items to the console"
  });

  static settings = {
    ...Dry.settings,

    memory: Settings.boolean({
      default: false
    }),

    color: Settings.boolean({
      default: false,
      description: "output in color"
    })
  };

  config!: OutputFlags<typeof Stdout.settings>;

  async run(items: LoadedItem[]): Promise<void> {
    for (const item of items) {
      const i: any = clone(item);
      i.saved = item.saved.toJSDate();
      i.created = item.created.toJSDate();
      const json = util.inspect(i, undefined, undefined, this.config.color);
      process.stdout.write(json + "\n");
    }
  }
}
