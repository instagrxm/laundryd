import { Item, LoadedItem } from "../item";
import { Log } from "../log";
import { Setting } from "../setting";
import { Settings } from "../settings";
import { Washer } from "./washer";

export class Rinse extends Washer {
  static readonly title: string = "rinse";
  static readonly description: string =
    "accept normalized data on a schedule or as it arrives, analyze it, and return new data";

  static settings = {
    ...Washer.settings,

    subscribe: Setting.strings({
      def: [],
      description: "listen for items from this washer id"
    }),

    retain: Setting.number({
      def: 0,
      description: "the number of days to keep items, or 0 to keep forever"
    })
  };

  readonly subscribe = Rinse.settings.subscribe.def as string[];
  readonly retain = Rinse.settings.retain.def as number;

  constructor(settings: Settings) {
    super(settings);

    const subscribe = Rinse.settings.subscribe.parse(settings.subscribe);
    if (!subscribe || !subscribe.length) {
      Log.error(this, `missing subscribe`);
    } else if (subscribe.includes(this.id)) {
      Log.error(this, `can't subscribe to itself`);
    } else {
      this.subscribe = subscribe;
    }

    this.retain = Math.abs(
      Rinse.settings.retain.parse(settings.retain) as number
    );
  }

  async run(items: LoadedItem[]): Promise<Item[]> {
    return [];
  }
}
