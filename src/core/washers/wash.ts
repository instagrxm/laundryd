import { CronJob } from "cron";
import { Item } from "../Item";
import { Memory } from "../memory";
import { Setting } from "../setting";
import { Settings } from "../settings";
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
    }),

    begin: Setting.number({
      def: 7,
      description: "the number of days to load in the first run"
    }),

    retain: Setting.number({
      description: "the number of days to keep items"
    })
  };

  readonly schedule: CronJob;
  readonly begin: number;
  readonly retain?: number;

  constructor(settings: Settings, memory: Memory) {
    super(settings, memory);

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
