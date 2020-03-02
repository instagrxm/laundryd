import { DateTime } from "luxon";
import util from "util";
import { Database } from "../storage/database";
import BaseCommand from "./baseCommand";
import { LogItem } from "./item";
import { Dry } from "./washers/dry";
import { Rinse } from "./washers/rinse";
import { Washer } from "./washers/washer";

/**
 * The different levels of logging.
 */
export enum LogLevel {
  debug = "debug",
  info = "info",
  warn = "warn",
  error = "error"
}

/**
 * A global logger object.
 */
export class Log {
  /**
   * The name of the database collection to save logs into.
   */
  static readonly collection = "log";

  /**
   * Save a log message to the database.
   * @param level the level of this log message
   * @param source the command or washer generating the log
   * @param msg any info for the log message
   */
  static async log(
    level: LogLevel,
    source: Washer | BaseCommand,
    msg: LogMessage
  ): Promise<void> {
    let sourceId = "";
    let sourceName = "";
    let path = "";

    if (source instanceof Washer) {
      // Loggers can't log
      if (source instanceof Rinse || source instanceof Dry) {
        if (source.config.subscribe.includes(Log.collection)) {
          return;
        }
      }

      sourceName = source.info.name;
      sourceId = source.config.id;
      path = `washer/${sourceName}/${sourceId}`;
    } else {
      sourceName = source.static.id;
      sourceId = source.static.id;
      path = `command/${source.static.id}`;
    }

    const date = DateTime.utc();

    const url = `laundry://${path}/${date.toMillis()}`;

    const item: LogItem = {
      level: level,
      saved: date,
      created: date,
      text: msg.msg,
      meta: msg,
      url,
      washerId: sourceId,
      washerName: sourceName
    };

    if (level === LogLevel.error && process.env.NODE_ENV === "development") {
      const err: any = item;
      err.saved = item.saved.toJSDate();
      err.created = item.created.toJSDate();
      // eslint-disable-next-line no-console
      console.error(util.inspect(err));
      process.exit(1);
    }

    // console.log(item);
    await Database.writeLog(item);
  }

  static async debug(
    source: Washer | BaseCommand,
    msg: LogMessage
  ): Promise<void> {
    await Log.log(LogLevel.debug, source, msg);
  }

  static async info(
    source: Washer | BaseCommand,
    msg: LogMessage
  ): Promise<void> {
    await Log.log(LogLevel.info, source, msg);
  }

  static async warn(
    source: Washer | BaseCommand,
    msg: LogMessage
  ): Promise<void> {
    await Log.log(LogLevel.warn, source, msg);
  }

  static async error(
    source: Washer | BaseCommand,
    msg: LogMessage
  ): Promise<void> {
    await Log.log(LogLevel.error, source, msg);
  }
}

export interface LogMessage {
  msg?: string;
  [key: string]: any;
}
