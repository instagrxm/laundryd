import { OutputFlags } from "@oclif/parser/lib/parse";
import { Database } from "../../storage/database";
import { Item, LoadedItem } from "../item";
import { Log } from "../log";
import { Shared } from "./shared";
import { Wash } from "./wash";
import { Washer } from "./washer";

export class Rinse extends Washer {
  static readonly title: string = "rinse";
  static readonly description: string =
    "accept normalized data on a schedule or as it arrives, analyze it, and return new data";

  static flags = {
    ...Washer.flags,
    schedule: Shared.flags.schedule(),
    subscribe: Shared.flags.subscribe,
    retain: Shared.flags.retain
  };

  config!: OutputFlags<typeof Rinse.flags>;

  async init(sources: Record<string, Wash | Rinse>): Promise<void> {
    await super.init(sources);

    Shared.validateSubscribe(this, sources);

    if (this.config.schedule) {
      Shared.startCron(this, async () => {
        const input = await Shared.loadSubscribed(
          this,
          sources,
          this.memory.lastRun
        );
        await this.exec(input);
      });
    } else {
      Shared.subscribe(this, sources, async item => await this.exec([item]));
    }
  }

  async exec(input: LoadedItem[]): Promise<void> {
    if (!input || !input.length) {
      return;
    }

    try {
      const output = await this.run(input);
      await Database.saveItems(this, output);
      await Database.saveMemory(this);
    } catch (error) {
      Log.error(this, { error });
    }
  }

  async run(items: LoadedItem[]): Promise<Item[]> {
    return [];
  }
}
