import { OutputFlags } from "@oclif/parser/lib/parse";
import clone from "clone";
import util from "util";
import { Dry, Item, Settings, WasherInfo } from "../../core";

export class Stdout extends Dry {
  static readonly info = new WasherInfo({
    title: "stdout",
    description: "output items to the console",
    memory: false
  });

  static settings = {
    ...Dry.settings,

    color: Settings.boolean({
      default: false,
      description: "output in color"
    })
  };

  config!: OutputFlags<typeof Stdout.settings>;

  async run(items: Item[]): Promise<void> {
    for (const item of items) {
      const i: any = clone(item);
      if (item.saved) {
        i.saved = item.saved.toJSDate();
      }
      i.created = item.created.toJSDate();
      const json = util.inspect(i, undefined, undefined, this.config.color);
      process.stdout.write(json + "\n");
    }
  }
}
