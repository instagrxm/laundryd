import { flags } from "@oclif/command";
import { CronJob, CronTime } from "cron";
import { Database } from "../../storage/database";
import { LoadedItem } from "../item";
import { Log, LogItem, LogLevel } from "../log";
import { Dry } from "./dry";
import { Rinse } from "./rinse";
import { Wash } from "./wash";

/**
 * Elements shared among the three washer types.
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
    })()
  };

  /**
   * Ensure that a washer's subscriptions are valid.
   * @param washer the washer to validate
   * @param sources the available output washers
   */
  static validateSubscribe(
    washer: Rinse | Dry,
    sources: Record<string, Wash | Rinse>
  ): void {
    if (!washer.config.subscribe || !washer.config.subscribe.length) {
      throw new Error("missing subscribe");
    }

    if (washer.config.subscribe.includes(washer.config.id)) {
      throw new Error("can't subscribe to yourself");
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
  static startCron(
    washer: Wash | Dry | Rinse,
    callback: () => Promise<void>
  ): void {
    new CronJob({
      cronTime: washer.config.schedule,
      onTick: callback,
      start: true
    });
  }

  /**
   * Load recent items from other washers that a washer is subscribed to.
   * @param washer the washer whose subscriptions should be loaded
   * @param sources the available output washers
   * @param since load items newer than this date
   */
  static async loadSubscribed(
    washer: Rinse | Dry,
    sources: Record<string, Wash | Rinse>,
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
  static subscribe(
    washer: Rinse | Dry,
    sources: Record<string, Wash | Rinse>,
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
}
