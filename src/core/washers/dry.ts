import { LoadedItem } from "../item";
import { Log } from "../log";
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
      def: [],
      description: "listen for items from this washer id"
    })
  };

  readonly subscribe = Dry.settings.subscribe.def as string[];

  constructor(settings: Settings) {
    super(settings);

    const subscribe = Dry.settings.subscribe.parse(settings.subscribe);
    if (!subscribe || !subscribe.length) {
      Log.error(this, `missing subscribe`);
    } else if (subscribe.includes(this.id)) {
      Log.error(this, `can't subscribe to itself`);
    } else {
      this.subscribe = subscribe;
    }
  }

  async run(items: LoadedItem[]): Promise<void> {
    return;
  }
}
