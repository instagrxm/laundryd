import { Item } from "../item";
import { Setting } from "../setting";
import { Settings } from "../settings";
import { Washer } from "./washer";

export class Wash extends Washer {
  static readonly title: string = "wash";
  static readonly description: string =
    "retrieve data on a schedule and parse it into a normalized format";

  static settings = {
    ...Washer.settings,

    begin: Setting.number({
      def: 0,
      description: "the number of days of past items to load in the first run"
    }),

    retain: Setting.number({
      description:
        "the number of days to keep items, 0 to keep forever or empty to not keep at all"
    })
  };

  readonly begin: number;
  readonly beginDate: Date;
  readonly retain?: number;
  readonly retainDate?: Date;

  constructor(settings: Settings) {
    super(settings);

    const retain = Wash.settings.retain.parse(settings.retain);
    if (retain !== undefined) {
      this.retain = Math.abs(retain);
      this.retainDate = this.retain
        ? new Date(Date.now() - this.retain * 24 * 60 * 60 * 1000)
        : new Date(0);
    }

    const begin = Wash.settings.begin.parse(settings.begin) as number;
    this.begin = Math.max(Math.abs(begin), retain || 0);
    this.beginDate = new Date(Date.now() - this.begin * 24 * 60 * 60 * 1000);
  }

  async run(): Promise<Item[]> {
    return [];
  }
}
