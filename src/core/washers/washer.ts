import { Memory } from "../memory";
import { Setting } from "../setting";
import { Settings } from "../settings";
import { Dry } from "./dry";
import { Rinse } from "./rinse";
import { Wash } from "./wash";

export type WasherType = typeof Wash | typeof Rinse | typeof Dry;
export type WasherInstance = Wash | Rinse | Dry;

export class Washer {
  /**
   * The remote API that this washer works with, like "twitter".
   * Washers using the same source will be run in sequence in order to avoid API rate limits.
   */
  static readonly source: string;

  /**
   * A human-readable title for this washer, like "tweets from a user".
   */
  static readonly title: string;

  /**
   * A longer description for the washer.
   */
  static readonly description: string;

  static settings = {
    id: Setting.string({
      description: "a unique identifier for this washer"
    }),

    schedule: Setting.string({
      description: "when to run the washer"
    })
  };

  readonly id: string;
  readonly schedule?: string;

  memory!: Memory;

  constructor(settings: Settings) {
    if (this.constructor === Washer) {
      throw new Error("don't instantiate Washer directly, use Wash/Rinse/Dry");
    }

    const id = Washer.settings.id.parse(settings.id);
    if (!id) {
      throw new Error("missing id");
    }

    if (id.includes("$") || id.startsWith("system.")) {
      throw new Error(
        "invalid id https://docs.mongodb.com/manual/reference/limits/#Restriction-on-Collection-Names"
      );
    }

    this.id = id;

    this.schedule = Washer.settings.schedule.parse(settings.schedule);
  }
}
