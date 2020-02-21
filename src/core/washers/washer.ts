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

    if (id.startsWith("system.") || id.match(/[\s\r\n\:\$]/g)) {
      throw new Error(`${id}: invalid id`);
    }

    this.id = id;

    this.schedule = Washer.settings.schedule.parse(settings.schedule);
  }

  /**
   * Return the static side of a washer so its title and description are accessible.
   */
  getInfo(): WasherType {
    return Object.getPrototypeOf(this).constructor;
  }

  /**
   * A user-defined type guard for washers which accept items
   * @param washer the washer to check
   */
  static isInput(washer: WasherInstance): washer is Rinse | Dry {
    return (
      (washer as Rinse).subscribe !== undefined ||
      (washer as Dry).subscribe !== undefined
    );
  }

  /**
   * A user-defined type guard for washers which create items
   * @param washer the washer to check
   */
  static isOutput(washer: WasherInstance): washer is Rinse | Wash {
    return (
      (washer as Rinse).retain !== undefined ||
      (washer as Wash).retain !== undefined
    );
  }
}
