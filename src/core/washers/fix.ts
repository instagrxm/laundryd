import { OutputFlags } from "@oclif/parser/lib/parse";
import { Database } from "../../storage/database";
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

  async init(): Promise<void> {
    await super.init();
    Shared.startSchedule(this, async () => {
      await this.exec();
    });
  }

  async exec(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      await this.runExclusive(this);

      await Database.saveMemory(this);
      await this.fileStore.clean();
    } catch (error) {
      await Log.error(this, { error });
    }
  }

  async run(): Promise<void> {
    return;
  }
}
