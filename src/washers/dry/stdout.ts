import { OutputFlags } from "@oclif/parser/lib/parse";
import clone from "clone";
import util from "util";
import { LoadedItem } from "../../core/item";
import { SharedFlags } from "../../core/sharedFlags";
import { Dry } from "../../core/washers/dry";

export class Stdout extends Dry {
  static readonly title = "dry/stdout";
  static readonly description = "output items to the console";

  static flags = {
    ...Dry.flags,

    memory: SharedFlags.boolean({
      default: false
    }),

    color: SharedFlags.boolean({
      default: false,
      description: "output in color"
    })
  };

  config!: OutputFlags<typeof Stdout.flags>;

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
