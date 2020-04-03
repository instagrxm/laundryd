import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import axios from "axios";
import { DateTime, Duration } from "luxon";
import { Database } from "../database";
import { Downloader } from "../downloader";
import { Files } from "../files";
import { Memory } from "../memory";
import { Settings } from "../settings";
import { Sources } from "./shared";
import { WasherInfo } from "./washerInfo";

export class Washer {
  static readonly info = new WasherInfo({
    title: "washer base class",
    description: "washer base class",
    abstract: true,
  });

  memory!: Memory;
  running = false;

  static settings = {
    id: flags.string({
      required: true,
      parse: (input: string) => {
        // flip slashes
        input = input.replace(/\\/g, "/");
        if (
          // reserved by MongoDB
          input.startsWith("system.") ||
          // don't want to deal with weird characters
          !input.match(/^[\\\/A-Za-z0-9_-]+$/) ||
          // used in S3/directory names
          input.match(/\/(downloads|strings)/)
        ) {
          throw new Error(`invalid washer id "${input}"`);
        }
        return input;
      },
      description: "a unique identifier for this washer",
    }),

    schedule: Settings.schedule(),

    enabled: Settings.boolean({
      default: true,
      description: "whether to run this washer at all",
    }),

    retain: Settings.retain(),
  };

  config!: OutputFlags<typeof Washer.settings>;
  paused = false;
  startTime!: DateTime;

  files!: Files;
  downloader: Downloader = new Downloader(this);

  // The HTTP client that commands should use.
  http = axios.create();
  database: Database;

  constructor(config: OutputFlags<typeof Washer.settings>, database: Database) {
    if (this.constructor === Washer) {
      throw new Error("don't instantiate Washer directly, use Wash/Rinse/Dry");
    }

    this.config = config;
    this.database = database;
  }

  /**
   * Perform internal initialization in washer base classes. Should not be extended
   * by plugins.
   * @param files the fileStore
   * @param sources washers that can be subscribed to
   */
  async preInit(files: Files, sources?: Sources): Promise<void> {
    this.files = files;
    this.memory = await this.database.loadMemory(this);
  }

  /**
   * Perform any initialization needed at washer creation.
   */
  async init(): Promise<void> {
    //
  }

  get info(): WasherInfo {
    return Object.getPrototypeOf(this).constructor.info;
  }

  /**
   * Return a date before which things created by this washer should be deleted.
   * @param washer the washer whose date to return
   */
  retainDate(): DateTime | undefined {
    if (this.config.retain === 0) {
      // Keep forever
      return;
    }

    // Delete immediately
    let retainDate = DateTime.utc().plus(Duration.fromObject({ years: 1000 }));

    if (this.config.retain > 0) {
      // Delete things more than retain days old
      retainDate = DateTime.utc().minus(
        Duration.fromObject({ days: this.config.retain })
      );
    }

    return retainDate;
  }
}
