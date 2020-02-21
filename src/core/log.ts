import util from "util";
import BaseCommand from "../baseCommand";
import { Database } from "../storage/database";
import { LoadedItem } from "./item";
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
 * Log messages are saved to the database the same as items, but the desription is the log level.
 */
export interface LogItem extends LoadedItem {
  description: LogLevel;
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
   * @param info any info for the log message
   */
  static async log(
    level: LogLevel,
    source: Washer | BaseCommand,
    info?: object | string
  ): Promise<LogItem> {
    let title = "";
    let sourceType = "";
    let sourceId = "";
    let sourceTitle = "";

    if (source instanceof Washer) {
      sourceType = "washer";
      title = `${source.getType().title}/${source.config.id}`;
      sourceId = source.config.id;
      sourceTitle = source.getType().title;
    } else {
      sourceType = "command";
      title = source.getType().id;
      sourceId = title;
      sourceTitle = title;
    }

    if (typeof info === "string") {
      info = { msg: info };
    }

    const date = new Date();

    const url = `laundry://${sourceType}/${title}/${date.getTime()}`;

    const item: LogItem = {
      date,
      title,
      description: level,
      extended: info,
      url,
      sourceId,
      sourceTitle
    };

    if (process.env.NODE_ENV === "development") {
      throw new Error(util.inspect(item));
    }

    // console.log(item);
    await Database.writeLog(item);
    return item;
  }

  static async debug(source: Washer | BaseCommand, data?: any): Promise<void> {
    await Log.log(LogLevel.debug, source, data);
  }

  static async info(source: Washer | BaseCommand, data?: any): Promise<void> {
    await Log.log(LogLevel.info, source, data);
  }

  static async warn(source: Washer | BaseCommand, data?: any): Promise<void> {
    await Log.log(LogLevel.warn, source, data);
  }

  static async error(source: Washer | BaseCommand, data?: any): Promise<void> {
    await Log.log(LogLevel.error, source, data);
  }
}
