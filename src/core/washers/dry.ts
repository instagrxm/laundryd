import { CronJob } from "cron";
import { Item } from "../Item";
import { Setting } from "../setting";
import { Washer } from "./washer";

export class Dry extends Washer {
  static readonly title: string = "dry";
  static readonly description: string =
    "accept normalized data on a schedule or as it arrives, and take actions on it";

  static settings = {
    ...Washer.settings,

    schedule: Setting.cron({
      def: new CronJob("0 * * * *", () => {}),
      description: "when to run the washer"
    }),

    query: Setting.query({
      description: "items to listen for"
    })
  };

  readonly schedule?: CronJob;

  readonly query: string;

  constructor(settings: any = {}, memory: any = {}) {
    super(settings, memory);

    this.schedule = Dry.settings.schedule.parse(settings.schedule);

    const query = Dry.settings.query.parse(settings.query);
    if (!query) {
      throw new Error(`${this.id}: missing query`);
    }
    this.query = query;
  }

  async run(items: Item[]): Promise<void> {
    return;
  }
}
