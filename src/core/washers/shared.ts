import { flags } from "@oclif/command";
import { CronJob, CronTime } from "cron";
import asyncPool from "tiny-async-pool";
import { Database } from "../../storage/database";
import { Download, DownloadResult } from "../../storage/download";
import { FileStore } from "../../storage/fileStore";
import { S3 } from "../../storage/s3";
import { Item, LoadedItem, LogItem } from "../item";
import { Log, LogLevel } from "../log";
import { Dry } from "./dry";
import { Rinse } from "./rinse";
import { Wash } from "./wash";
import { Washer } from "./washer";

export type WasherType = typeof Washer;
export type Sources = Record<string, Wash | Rinse>;

/**
 * Elements shared among the washer types.
 */
export class Shared {
  static flags = {
    retain: flags.integer({
      default: 0,
      parse: (input: string) => Math.abs(Math.round(parseFloat(input))),
      description: "the number of days to keep items, or 0 to keep forever"
    }),

    schedule: (required = false): flags.IOptionFlag<string | undefined> => {
      return flags.string({
        required,
        parse: (input: string) => {
          const time = new CronTime(input);
          return input;
        },
        description: "when to run the washer"
      });
    },

    subscribe: flags.build<string[]>({
      default: [],
      parse: (input: string) => {
        if (!input || !(typeof input === "string")) {
          throw new Error("missing subscribe");
        }
        return input.split(",");
      },
      description: "listen for items from this washer id"
    })(),

    files: flags.string({
      required: true,
      default: "(OS cache dir)",
      env: "LAUNDRY_FILES",
      description:
        "where to store downloaded files, either a local path or an s3:// location"
    }),

    fileUrl: flags.string({
      required: true,
      default: "http://localhost:3000/files",
      env: "LAUNDRY_URL",
      description: "a URL which maps to the file location"
    }),

    downloadPool: flags.integer({
      required: true,
      default: 5,
      env: "LAUNDRY_DOWNLOAD_POOL",
      hidden: true,
      description: "how many downloads to perform simultaneously"
    })
  };

  /**
   * Ensure that a washer's subscriptions are valid.
   * @param washer the washer to validate
   * @param sources the available output washers
   */
  static validateSubscriptions(washer: Rinse | Dry, sources: Sources): void {
    if (!washer.config.subscribe || !washer.config.subscribe.length) {
      throw new Error("missing subscribe");
    }

    if (washer.config.subscribe.includes(washer.config.id)) {
      throw new Error("a washer can't subscribe to itself");
    }

    for (const id of washer.config.subscribe) {
      if (id !== Log.collection && !Object.keys(sources).includes(id)) {
        throw new Error(`can't subscribe to ${id}, does not exist`);
      }
    }
  }

  /**
   * Kick off a washer's schedule.
   * @param washer the washer with the schedule
   * @param callback the method to call when the cron ticks
   */
  static startSchedule(
    washer: Wash | Dry | Rinse,
    callback: () => Promise<void>
  ): void {
    new CronJob({
      cronTime: washer.config.schedule,
      onTick: async (): Promise<void> => {
        if (washer.running) {
          return;
        }
        washer.running = true;
        await callback();
        washer.running = false;
      },
      start: true
    });
  }

  /**
   * Load recent items from other washers that a washer is subscribed to.
   * @param washer the washer whose subscriptions should be loaded
   * @param sources the available output washers
   * @param since load items newer than this date
   */
  static async loadSubscriptions(
    washer: Rinse | Dry,
    sources: Sources,
    since = new Date(0)
  ): Promise<LoadedItem[]> {
    let input: LoadedItem[] = [];
    for (const id of washer.config.subscribe) {
      const items = await Database.loadItems(sources[id], since);
      input = input.concat(items);
    }
    return input;
  }

  /**
   * Set up a real-time subscription from one washer to another.
   * @param washer the washer that is subscribing
   * @param sources the available output washers
   * @param callback the method to call with the new items
   */
  static initRealtimeSubscriptions(
    washer: Rinse | Dry,
    sources: Sources,
    callback: (input: LoadedItem) => Promise<void>
  ): void {
    for (const id of washer.config.subscribe) {
      if (id === Log.collection) {
        // Subscribe to logs
        Database.subscribeLog(LogLevel.debug, (item: LogItem) => {
          callback(item);
        });
      } else {
        // Subscribe to other washers
        Database.subscribe(sources[id], (item: LoadedItem) => {
          callback(item);
        });
      }
    }
  }

  /**
   * Initialize a FileStore for a washer.
   * @param washer the washer that will own the FileStore
   */
  static async initFileStore(washer: Wash | Rinse): Promise<void> {
    let fileStore: FileStore;
    if (washer.config.files.startsWith("s3://")) {
      fileStore = new S3(washer, washer.config.files);
    } else {
      fileStore = new FileStore(
        washer,
        washer.config.files,
        washer.config.fileUrl
      );
    }
    await fileStore.validate();
    washer.fileStore = fileStore;
  }

  /**
   * Encapsulate the logic of performing file downloads.
   * @param washer the washer that owns the items with the downloads
   * @param items the items with downloads to be processed
   */
  static async downloadItems(
    washer: Wash | Rinse,
    items: Item[]
  ): Promise<Item[]> {
    let downloads: Download[] = [];
    for (const i of items) {
      if (i.downloads) {
        downloads = downloads.concat(i.downloads);
      }
    }

    if (!downloads.length) {
      return items;
    }

    await asyncPool(
      washer.config.downloadPool,
      downloads,
      async (download: Download) => {
        // Check for an existing download.
        const existing = await washer.fileStore.existing(download);
        if (existing) {
          // Call the complete handler with the existing data.
          download.complete(existing);
          return;
        }

        // Perform the download.
        try {
          await washer.downloader.download(
            download,
            async (result: DownloadResult) => {
              // Process the download, modifying the result.
              result = await washer.fileStore.downloaded(result);
              // Pass the result to the complete handler.
              download.complete(result);
            }
          );
        } catch (error) {
          // Remove items if the downloads fail.
          await Log.error(washer, { event: "download-fail", error });
          items = items.filter(i => i !== download.item);
        }
      }
    );

    return items;
  }
}
