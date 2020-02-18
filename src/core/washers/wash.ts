import { CronJob } from "cron";
import { Item } from "../Item";
import { Setting } from "../setting";
import { Settings } from "../settings";
import { Washer } from "./washer";

export class Wash extends Washer {
  static readonly title: string = "wash";
  static readonly description: string =
    "retrieve data on a schedule and parse it into a normalized format";

  static settings = {
    ...Washer.settings,

    schedule: Setting.cron({
      def: new CronJob("0 * * * *", () => {}),
      description: "when to run the washer"
    }),

    begin: Setting.number({
      def: 0,
      description: "the number of days of past items to load in the first run"
    }),

    retain: Setting.number({
      description:
        "the number of days to keep items, 0 to keep forever or empty to not keep at all"
    })
  };

  readonly schedule: CronJob;
  readonly begin: number;
  readonly retain?: number;

  constructor(settings: Settings) {
    super(settings);

    const schedule = Wash.settings.schedule.parse(settings.schedule);
    if (!schedule) {
      throw new Error(`${this.id}: missing schedule`);
    }
    this.schedule = schedule;

    this.begin = Wash.settings.begin.parse(settings.begin) as number;
    this.retain = Wash.settings.retain.parse(settings.retain);
  }

  async run(): Promise<Item[]> {
    return [];
  }
}
