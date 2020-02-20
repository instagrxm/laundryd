import { Item, LoadedItem } from "../item";
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

  readonly subscribe: string[] = [];
  readonly retain: number = 0;

  constructor(settings: Settings) {
    super(settings);

    const subscribe = Rinse.settings.subscribe.parse(settings.subscribe);
    if (!subscribe || !subscribe.length) {
      throw new Error(`${this.id}: missing subscribe`);
    }
    if (subscribe.includes(this.id)) {
      throw new Error(`${this.id}: can't subscribe to itself`);
    }
    this.subscribe = subscribe;

    this.retain = Math.abs(
      Rinse.settings.retain.parse(settings.retain) as number
    );
  }

  async run(items: LoadedItem[]): Promise<Item[]> {
    return [];
  }
}
