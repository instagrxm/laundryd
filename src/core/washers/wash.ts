import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import { DateTime, Duration } from "luxon";
import { Item } from "../item";
import { Log } from "../log";
import { Settings } from "../settings";
import { Database } from "../storage/database";
import { Shared } from "./shared";
import { Washer } from "./washer";
import { WasherInfo } from "./washerInfo";

export class Wash extends Washer {
  static readonly info = new WasherInfo({
    title: "wash base class",
    description:
      "retrieve data on a schedule and parse it into a normalized format",
    abstract: true
  });

  static settings = {
    ...Washer.settings,
    schedule: Settings.schedule(true),
    download: Settings.download(),
    downloadPool: Settings.downloadPool(),

    begin: flags.integer({
      default: 0,
      description: "the number of days of past items to load in the first run"
    })
  };

  config!: OutputFlags<typeof Wash.settings>;

  async preInit(): Promise<void> {
    await super.preInit();

    if (this.config.retain > 0 && this.config.retain < this.config.begin) {
      throw new Error("retain should be larger than begin");
    }

    // The first time the washer runs, set the last run to be "begin" days in the past
    const beginDate = DateTime.utc().minus(
      Duration.fromObject({ days: this.config.begin })
    );

    const firstRun = beginDate.diff(this.memory.lastRun).milliseconds > 0;
    const lastConfig = this.memory.config as OutputFlags<typeof Wash.settings>;
    const beginChanged = this.config.begin !== lastConfig.begin;

    if (firstRun || beginChanged) {
      this.memory.lastRun = beginDate;
    }

    Shared.startSchedule(this, async () => await this.exec());
  }

  async exec(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      this.startTime = DateTime.utc();
      await Log.info(this, { msg: "start" });
      let items = await this.run();
      items = items || [];
      items = await Shared.checkItems(this, items);
      items = await Shared.downloadItems(this, items);
      await Database.saveItems(this, items);
      await Database.saveMemory(this);
      await this.fileStore.clean();
      await Log.info(this, { msg: "complete" });
    } catch (error) {
      await Log.error(this, { error });
    }
  }

  async run(): Promise<Item[]> {
    return [];
  }
}
