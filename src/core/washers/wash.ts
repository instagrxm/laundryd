import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import { Database } from "../../storage/database";
import { Item } from "../item";
import { Log } from "../log";
import { Rinse } from "./rinse";
import { Shared } from "./shared";
import { Washer } from "./washer";

export class Wash extends Washer {
  static readonly title: string = "wash";
  static readonly description: string =
    "retrieve data on a schedule and parse it into a normalized format";

  static flags = {
    ...Washer.flags,
    schedule: Shared.flags.schedule(true),
    retain: Shared.flags.retain,

    begin: flags.integer({
      default: 0,
      parse: (input: string) => Math.abs(Math.round(parseFloat(input))),
      description: "the number of days of past items to load in the first run"
    })
  };

  config!: OutputFlags<typeof Wash.flags>;

  async init(sources: Record<string, Wash | Rinse>): Promise<void> {
    await super.init(sources);

    Shared.startCron(this, async () => await this.exec());
  }

  async exec(): Promise<void> {
    try {
      const items = await this.run();
      await Database.saveItems(this, items);
      await Database.saveMemory(this);
    } catch (error) {
      Log.error(this, { error });
    }
  }

  async run(): Promise<Item[]> {
    return [];
  }
}
