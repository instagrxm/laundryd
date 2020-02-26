import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import { Database } from "../../storage/database";
import { Downloader } from "../../storage/downloader";
import { FileStore } from "../../storage/fileStore";
import { Memory } from "../memory";
import { SharedFlags } from "../sharedFlags";
import { Shared, Sources, WasherType } from "./shared";

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
  running = false;

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
    }),

    files: SharedFlags.files(),
    fileUrl: SharedFlags.fileUrl(),
    retain: SharedFlags.retain(),
    downloadPool: SharedFlags.downloadPool()
  };

  config!: OutputFlags<typeof Washer.flags>;

  fileStore!: FileStore;
  downloader: Downloader = new Downloader(this);

  paused = false;

  constructor(config: OutputFlags<typeof Washer.flags>) {
    if (this.constructor === Washer) {
      throw new Error("don't instantiate Washer directly, use Wash/Rinse/Dry");
    }

    this.config = config;
  }

  async init(sources?: Sources): Promise<void> {
    this.memory = await Database.loadMemory(this);
    await Shared.initFileStore(this);
  }

  /**
   * Return the static side of a washer so its title and description are accessible.
   */
  getType(): WasherType {
    return Object.getPrototypeOf(this).constructor;
  }

  /**
   * Return a date before which things created by this washer should be deleted.
   * @param washer the washer whose date to return
   */
  retainDate(): Date | undefined {
    if (this.config.retain === 0) {
      // Keep forever
      return;
    }

    // Delete immediately
    let retainDate = new Date();
    retainDate.setFullYear(retainDate.getFullYear() + 1000);

    if (this.config.retain > 0) {
      // Delete things more than retain days old
      retainDate = new Date(
        Date.now() - this.config.retain * 24 * 60 * 60 * 1000
      );
    }

    return retainDate;
  }
}
