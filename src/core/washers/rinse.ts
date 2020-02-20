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
      description: "listen for items from this washer id"
    }),

    retain: Setting.number({
      description:
        "the number of days to keep items, 0 to keep forever or empty to not keep at all"
    })
  };

  readonly subscribe: string[];
  readonly retain?: number;
  readonly retainDate?: Date;

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

    const retain = Rinse.settings.retain.parse(settings.retain);
    if (retain !== undefined) {
      this.retain = Math.abs(retain);
      this.retainDate = this.retain
        ? new Date(Date.now() - this.retain * 24 * 60 * 60 * 1000)
        : new Date(0);
    }
  }

  async run(items: LoadedItem[]): Promise<Item[]> {
    return [];
  }
}
