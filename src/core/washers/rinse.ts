import { OutputFlags } from "@oclif/parser/lib/parse";
import { Database } from "../../storage/database";
import { Downloader } from "../../storage/downloader";
import { FileStore } from "../../storage/fileStore";
import { Item, LoadedItem } from "../item";
import { Log } from "../log";
import { Shared, Sources } from "./shared";
import { Washer } from "./washer";

export class Rinse extends Washer {
  static readonly title: string = "rinse";
  static readonly description: string =
    "accept normalized data on a schedule or as it arrives, analyze it, and return new data";

  static flags = {
    ...Washer.flags,
    schedule: Shared.flags.schedule(),
    subscribe: Shared.flags.subscribe,

    files: Shared.flags.files,
    fileUrl: Shared.flags.fileUrl,
    retain: Shared.flags.retain,
    downloadPool: Shared.flags.downloadPool
  };

  config!: OutputFlags<typeof Rinse.flags>;

  fileStore!: FileStore;
  downloader: Downloader = new Downloader(this);

  async init(sources: Sources): Promise<void> {
    await super.init(sources);
    await Shared.initFileStore(this);
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
    if (!input || !input.length) {
      return;
    }

    try {
      let items = await this.run(input);
      items = await Shared.downloadItems(this, items);
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

  retainDate(): Date | undefined {
    return Shared.retainDate(this);
  }
}
