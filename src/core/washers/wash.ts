import { CronJob } from "cron";
import { Item } from "../Item";
import { Setting } from "../setting";
import { Washer } from "./washer";

export class Wash extends Washer {
  static readonly title: string = "wash";
  static readonly description: string =
    "retrieve data from a remote API on a schedule and parse it into a normalized format";

  static settings = {
    ...Washer.settings,

    schedule: Setting.cron({
      def: new CronJob("0 * * * *", () => {}),
      description: "when to run the washer"
    })
  };

  readonly schedule: CronJob;

  constructor(settings: any = {}) {
    super(settings);

    const schedule = Wash.settings.schedule.parse(settings.schedule);
    if (!schedule) {
      throw new Error(`${this.id}: missing schedule`);
    }
    this.schedule = schedule;
  }

  async run(): Promise<Item[]> {
    return [];
  }
}
