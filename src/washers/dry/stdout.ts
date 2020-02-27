import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import clone from "clone";
import util from "util";
import { LoadedItem } from "../../core/item";
import { Dry } from "../../core/washers/dry";

export class Stdout extends Dry {
  static readonly title: string = "stdout";
  static readonly description: string = "output items to the console";

  static flags = {
    ...Dry.flags,

    memory: flags.boolean({
      default: false
    }),

    color: flags.boolean({
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
