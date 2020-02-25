import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import { Database } from "../../storage/database";
import { Downloader } from "../../storage/downloader";
import { FileStore } from "../../storage/fileStore";
import { Item } from "../item";
import { Log } from "../log";
import { Shared, Sources } from "./shared";
import { Washer } from "./washer";

export class Wash extends Washer {
  static readonly title: string = "wash";
  static readonly description: string =
    "retrieve data on a schedule and parse it into a normalized format";

  static flags = {
    ...Washer.flags,
    schedule: Shared.flags.schedule(true),

    begin: flags.integer({
      default: 0,
      parse: (input: string) => Math.abs(Math.round(parseFloat(input))),
      description: "the number of days of past items to load in the first run"
    }),

    files: Shared.flags.files,
    fileUrl: Shared.flags.fileUrl,
    retain: Shared.flags.retain,
    downloadPool: Shared.flags.downloadPool
  };

  config!: OutputFlags<typeof Wash.flags>;

  fileStore!: FileStore;
  downloader: Downloader = new Downloader(this);

  async init(sources: Sources): Promise<void> {
    await super.init(sources);
    await Shared.fileStore(this);
    Shared.startCron(this, async () => await this.exec());
  }

  async exec(): Promise<void> {
    try {
      let items = await this.run();
      items = await Shared.doDownloads(this, items);
      await Database.saveItems(this, items);
      await Database.saveMemory(this);
      await this.fileStore.clean();
    } catch (error) {
      await Log.error(this, { error });
    }
  }

  async run(): Promise<Item[]> {
    return [];
  }
}
