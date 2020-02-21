import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import { CronTime } from "cron";
import { Memory } from "../memory";
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

  memory!: Memory;

  static flags = {
    id: flags.string({
      required: true,
      parse: (input: string) => {
        if (input.startsWith("system.") || input.match(/[\s\r\n\:\$]/g)) {
          throw new Error(`invalid washer id "${input}"`);
        }
        return input;
      },
      description: "a unique identifier for this washer"
    }),

    memory: flags.boolean({
      default: true,
      description: "whether to save memory after each run"
    }),

    schedule: flags.string({
      parse: (input: string) => {
        const time = new CronTime(input);
        return input;
      },
      description: "when to run the washer"
    })
  };

  config!: OutputFlags<typeof Washer.flags>;

  constructor(config: OutputFlags<typeof Washer.flags>) {
    if (this.constructor === Washer) {
      throw new Error("don't instantiate Washer directly, use Wash/Rinse/Dry");
    }

    this.config = config;
  }

  init(): void {
    // do stuff
  }

  /**
   * Return the static side of a washer so its title and description are accessible.
   */
  getType(): WasherType {
    return Object.getPrototypeOf(this).constructor;
  }

  /**
   * A user-defined type guard for washers which accept items
   * @param washer the washer to check
   */
  static isInput(washer: WasherInstance): washer is Rinse | Dry {
    const isRinse =
      Object.getPrototypeOf(washer as Rinse).constructor.flags.subscribe !=
      undefined;
    const isDry =
      Object.getPrototypeOf(washer as Dry).constructor.flags.subscribe !=
      undefined;
    return isRinse || isDry;
  }

  /**
   * A user-defined type guard for washers which create items
   * @param washer the washer to check
   */
  static isOutput(washer: WasherInstance): washer is Rinse | Wash {
    const isRinse =
      Object.getPrototypeOf(washer as Rinse).constructor.flags.retain !=
      undefined;
    const isWash =
      Object.getPrototypeOf(washer as Wash).constructor.flags.retain !=
      undefined;
    return isRinse || isWash;
  }
}
