import { OutputFlags } from "@oclif/parser/lib/parse";
import { DateTime } from "luxon";
import { Files } from "../files";
import { Log } from "../log";
import { Settings } from "../settings";
import { Shared } from "./shared";
import { Washer } from "./washer";
import { WasherInfo } from "./washerInfo";

export class Fix extends Washer {
  static readonly info = new WasherInfo({
    title: "fix base class",
    description: "perform a task that requires all other washers to pause",
    abstract: true
  });

  static settings = {
    ...Washer.settings,
    schedule: Settings.schedule(true, "0 0 0 * * *"),
    retain: Settings.retain(7)
  };

  config!: OutputFlags<typeof Fix.settings>;

  runExclusive!: (washer: Fix) => Promise<void>;

  async preInit(files: Files): Promise<void> {
    await super.preInit(files);
    Shared.startSchedule(this, async () => {
      await this.exec();
    });
  }

  async exec(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      this.startTime = DateTime.utc();
      await Log.info(this, { msg: "start" });
      await this.runExclusive(this);
      await this.database.saveMemory(this);
      await this.files.clean();
      await Log.info(this, { msg: "complete" });
    } catch (error) {
      await Log.error(this, { error });
    }
  }

  async run(): Promise<void> {
    return;
  }
}
