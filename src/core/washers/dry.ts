import { LoadedItem } from "../item";
import { Setting } from "../setting";
import { Settings } from "../settings";
import { Washer } from "./washer";

export class Dry extends Washer {
  static readonly title: string = "dry";
  static readonly description: string =
    "accept normalized data on a schedule or as it arrives, and take actions on it";

  static settings = {
    ...Washer.settings,

    subscribe: Setting.strings({
      description: "listen for items from this washer id"
    })
  };

  readonly subscribe: string[];

  constructor(settings: Settings) {
    super(settings);

    const subscribe = Dry.settings.subscribe.parse(settings.subscribe);
    if (!subscribe || !subscribe.length) {
      throw new Error(`${this.id}: missing subscribe`);
    }
    if (subscribe.includes(this.id)) {
      throw new Error(`${this.id}: can't subscribe to itself`);
    }
    this.subscribe = subscribe;
  }

  async run(items: LoadedItem[]): Promise<void> {
    return;
  }
}
