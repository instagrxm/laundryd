import { Item } from "../item";
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
    })
  };

  readonly subscribe: string[];

  constructor(settings: Settings) {
    super(settings);

    const subscribe = Rinse.settings.subscribe.parse(settings.subscribe);
    if (!subscribe || !subscribe.length) {
      throw new Error(`${this.id}: missing subscribe`);
    }
    this.subscribe = subscribe;
  }

  async run(items: Item[]): Promise<Item[]> {
    return [];
  }
}
