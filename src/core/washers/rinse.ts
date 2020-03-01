import { OutputFlags } from "@oclif/parser/lib/parse";
import { Database } from "../../storage/database";
import { Downloader } from "../../storage/downloader";
import { Item, LoadedItem } from "../item";
import { Log } from "../log";
import { Settings } from "../settings";
import { Shared, Sources } from "./shared";
import { Washer } from "./washer";
import { WasherInfo } from "./washerInfo";

export class Rinse extends Washer {
  static readonly info = new WasherInfo({
    title: "rinse base class",
    description:
      "accept normalized data on a schedule or as it arrives, analyze it, and return new data",
    abstract: true
  });

  static settings = {
    ...Washer.settings,
    schedule: Settings.schedule(),
    subscribe: Settings.subscribe(),
    filter: Settings.filter(),

    download: Settings.download(),
    downloadPool: Settings.downloadPool()
  };

  config!: OutputFlags<typeof Rinse.settings>;

  downloader: Downloader = new Downloader(this);

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
      let items = await this.run(input);

      items = await Shared.checkItems(this, items);

      if (this.config.download) {
        items = await Shared.downloadItems(this, items);
      }

      await Database.saveItems(this, items);

      await Database.saveMemory(this);
      await this.fileStore.clean();
    } catch (error) {
      await Log.error(this, { error });
    }
  }

  async run(items: LoadedItem[]): Promise<Item[]> {
    return [];
  }
}
