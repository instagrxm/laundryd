import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import { LoadedItem } from "../item";
import { Log } from "../log";
import { Washer } from "./washer";

export class Dry extends Washer {
  static readonly title: string = "dry";
  static readonly description: string =
    "accept normalized data on a schedule or as it arrives, and take actions on it";

  static flags = {
    ...Washer.flags,

    subscribe: flags.build<string[]>({
      default: [],
      parse: (input: string) => input.split(","),
      description: "listen for items from this washer id"
    })()
  };

  config!: OutputFlags<typeof Dry.flags>;

  async init(): Promise<void> {
    if (!this.config.subscribe.length) {
      Log.error(this, `missing subscribe`);
    } else if (this.config.subscribe.includes(this.config.id)) {
      Log.error(this, `can't subscribe to itself`);
    }
  }

  async run(items: LoadedItem[]): Promise<void> {
    return;
  }
}
