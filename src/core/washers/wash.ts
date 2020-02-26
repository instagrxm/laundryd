import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import { Database } from "../../storage/database";
import { Item } from "../item";
import { Log } from "../log";
import { SharedFlags } from "../sharedFlags";
import { Shared } from "./shared";
import { Washer } from "./washer";

export class Wash extends Washer {
  static readonly title: string = "wash";
  static readonly description: string =
    "retrieve data on a schedule and parse it into a normalized format";

  static flags = {
    ...Washer.flags,
    schedule: SharedFlags.schedule(true),

    begin: flags.integer({
      default: 0,
      parse: (input: string) => Math.abs(Math.round(parseFloat(input))),
      description: "the number of days of past items to load in the first run"
    })
  };

  config!: OutputFlags<typeof Wash.flags>;

  async init(): Promise<void> {
    await super.init();
    Shared.startSchedule(this, async () => await this.exec());
  }

  async exec(): Promise<void> {
    try {
      let items = await this.run();
      items = await Shared.downloadItems(this, items);
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
