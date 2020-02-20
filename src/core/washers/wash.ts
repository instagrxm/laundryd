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
      def: 0,
      description: "the number of days to keep items, or 0 to keep forever"
    })
  };

  readonly begin: number = 0;
  readonly retain: number = 0;

  constructor(settings: Settings) {
    super(settings);

    this.begin = Math.abs(Wash.settings.begin.parse(settings.begin) as number);

    this.retain = Math.abs(
      Wash.settings.retain.parse(settings.retain) as number
    );
  }

  async run(): Promise<Item[]> {
    return [];
  }
}
