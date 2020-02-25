import { OutputFlags } from "@oclif/parser/lib/parse";
import { Database } from "../../storage/database";
import { LoadedItem } from "../item";
import { Log } from "../log";
import { Rinse } from "./rinse";
import { Shared } from "./shared";
import { Wash } from "./wash";
import { Washer } from "./washer";

export class Dry extends Washer {
  static readonly title: string = "dry";
  static readonly description: string =
    "accept normalized data on a schedule or as it arrives, and take actions on it";

  static flags = {
    ...Washer.flags,
    schedule: Shared.flags.schedule(),
    subscribe: Shared.flags.subscribe
  };

  config!: OutputFlags<typeof Dry.flags>;

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
      await this.run(input);
      await Database.saveMemory(this);
    } catch (error) {
      Log.error(this, { error });
    }
  }

  async run(items: LoadedItem[]): Promise<void> {
    return;
  }
}
