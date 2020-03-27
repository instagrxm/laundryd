import { OutputFlags } from "@oclif/parser/lib/parse";
import { DateTime } from "luxon";
import { Downloader } from "../downloader";
import { Files } from "../files";
import { Item } from "../item";
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
    subscribe: Settings.subscribe(),
    filter: Settings.filter(),
    download: Settings.download()
  };

  config!: OutputFlags<typeof Rinse.settings>;

  downloader: Downloader = new Downloader(this);

  async preInit(files: Files, sources: Sources): Promise<void> {
    await super.preInit(files, sources);
    Shared.validateSubscriptions(this, sources);
    await this.init();

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

  async exec(input: Item[]): Promise<void> {
    if (!this.config.enabled || !input || !input.length) {
      return;
    }

    try {
      this.startTime = DateTime.utc();
      await Log.info(this, { msg: "start" });
      let items = await this.run(input);
      items = items || [];
      items = await Shared.checkItems(this, items);
      items = await Shared.downloadItems(this, items);
      await this.database.saveItems(this, items);
      await this.database.saveMemory(this);
      await this.files.clean();
      await Log.info(this, { msg: "complete" });
    } catch (error) {
      await Log.error(this, { error });
    }
  }

  async run(items: Item[]): Promise<Item[]> {
    return [];
  }
}
