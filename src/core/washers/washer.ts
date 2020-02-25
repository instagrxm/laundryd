import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import { Database } from "../../storage/database";
import { Memory } from "../memory";
import { Rinse } from "./rinse";
import { Wash } from "./wash";

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
        if (
          input.startsWith("system.") ||
          !input.match(/^[\\\/A-Za-z0-9_-]+$/)
        ) {
          throw new Error(`invalid washer id "${input}"`);
        }
        return input;
      },
      description: "a unique identifier for this washer"
    }),

    memory: flags.boolean({
      default: true,
      description: "whether to save memory after each run"
    })
  };

  config!: OutputFlags<typeof Washer.flags>;

  constructor(config: OutputFlags<typeof Washer.flags>) {
    if (this.constructor === Washer) {
      throw new Error("don't instantiate Washer directly, use Wash/Rinse/Dry");
    }

    this.config = config;
  }

  async init(sources: Record<string, Wash | Rinse>): Promise<void> {
    this.memory = await Database.loadMemory(this);
  }

  /**
   * Return the static side of a washer so its title and description are accessible.
   */
  getType(): WasherType {
    return Object.getPrototypeOf(this).constructor;
  }
}

export type WasherType = typeof Washer;
