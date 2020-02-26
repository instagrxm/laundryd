import { OutputFlags } from "@oclif/parser/lib/parse";
import { Database } from "../../storage/database";
import { Log } from "../log";
import { Shared, Sources } from "./shared";
import { Washer } from "./washer";

export class Fix extends Washer {
  static readonly title: string = "fix";
  static readonly description: string =
    "perform a task that requires all other washers to pause";

  static flags = {
    ...Washer.flags,
    schedule: Shared.flags.schedule(true, "0 0 0 * * *")
  };

  config!: OutputFlags<typeof Fix.flags>;
  runExclusive!: (washer: Fix) => Promise<void>;

  async init(sources: Sources): Promise<void> {
    await super.init(sources);

    Shared.startSchedule(this, async () => {
      await this.exec();
    });
  }

  async exec(): Promise<void> {
    try {
      await this.runExclusive(this);
      await Database.saveMemory(this);
    } catch (error) {
      await Log.error(this, { error });
    }
  }

  async run(): Promise<void> {
    return;
  }
}
