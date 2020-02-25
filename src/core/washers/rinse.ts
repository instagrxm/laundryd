import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import { Item, LoadedItem } from "../item";
import { Log } from "../log";
import { Washer } from "./washer";

export class Rinse extends Washer {
  static readonly title: string = "rinse";
  static readonly description: string =
    "accept normalized data on a schedule or as it arrives, analyze it, and return new data";

  static flags = {
    ...Washer.flags,

    subscribe: flags.build<string[]>({
      default: [],
      parse: (input: string) => input.split(","),
      description: "listen for items from this washer id"
    })(),

    retain: flags.integer({
      default: 0,
      parse: (input: string) => Math.abs(Math.round(parseFloat(input))),
      description: "the number of days to keep items, or 0 to keep forever"
    })
  };

  config!: OutputFlags<typeof Rinse.flags>;

  async init(): Promise<void> {
    if (!this.config.subscribe.length) {
      Log.error(this, `missing subscribe`);
    } else if (this.config.subscribe.includes(this.config.id)) {
      Log.error(this, `can't subscribe to itself`);
    }
  }

  async run(items: LoadedItem[]): Promise<Item[]> {
    return [];
  }
}
