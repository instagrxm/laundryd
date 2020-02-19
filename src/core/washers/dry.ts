import { Item } from "../item";
import { Setting } from "../setting";
import { Settings } from "../settings";
import { Washer } from "./washer";

export class Dry extends Washer {
  static readonly title: string = "dry";
  static readonly description: string =
    "accept normalized data on a schedule or as it arrives, and take actions on it";

  static settings = {
    ...Washer.settings,

    schedule: Setting.string({
      description: "when to run the washer"
    }),

    subscribe: Setting.strings({
      description: "listen for items from this washer id"
    })
  };

  readonly schedule?: string;

  readonly subscribe: string[];

  constructor(settings: Settings) {
    super(settings);

    this.schedule = Dry.settings.schedule.parse(settings.schedule);

    const subscribe = Dry.settings.subscribe.parse(settings.subscribe);
    if (!subscribe || !subscribe.length) {
      throw new Error(`${this.id}: missing subscribe`);
    }
    this.subscribe = subscribe;
  }

  async run(items: Item[]): Promise<void> {
    return;
  }
}
