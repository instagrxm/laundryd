import { OutputFlags } from "@oclif/parser/lib/parse";
import { DateTime } from "luxon";
import { Database } from "../../storage/database";
import { LoadedItem } from "../item";
import { Log } from "../log";
import { Settings } from "../settings";
import { Shared, Sources } from "./shared";
import { Washer } from "./washer";
import { WasherInfo } from "./washerInfo";

export class Dry extends Washer {
  static readonly info = new WasherInfo({
    title: "dry base class",
    description:
      "accept normalized data on a schedule or as it arrives, and take actions on it",
    abstract: true
  });

  static settings = {
    ...Washer.settings,
    schedule: Settings.schedule(),
    subscribe: Settings.subscribe(),
    filter: Settings.filter()
  };

  config!: OutputFlags<typeof Dry.settings>;

  async init(sources: Sources): Promise<void> {
    await super.init();

    Shared.validateSubscriptions(this, sources);

    if (this.config.schedule) {
      Shared.startSchedule(this, async () => {
        const input = await Shared.loadSubscriptions(
          this,
          sources,
          this.memory.lastRun
        );
        await this.exec(input);
      });
    } else {
      Shared.initRealtimeSubscriptions(
        this,
        sources,
        async item => await this.exec([item])
      );
    }
  }

  async exec(input: LoadedItem[]): Promise<void> {
    if (!this.config.enabled || !input || !input.length) {
      return;
    }

    try {
      this.startTime = DateTime.utc();
      await this.run(input);
      await Database.saveMemory(this);
      await this.fileStore.clean();
    } catch (error) {
      await Log.error(this, { error });
    }
  }

  async run(items: LoadedItem[]): Promise<void> {
    return;
  }
}
