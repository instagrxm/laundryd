import { Command } from "@oclif/config";
import { inspect } from "util";
import { Database } from "../storage/database";

/**
 * A global logger object.
 */
export class Log {
  private static command: Command.Class;

  /**
   * Set up the logger before the requested command is run.
   * @param argv arguments passed to the current command
   * @param command the current command
   */
  static init(command: Command.Class): void {
    Log.command = command;
  }

  private static async log(
    level: string,
    event: string,
    msg: string,
    data?: any,
    callback?: () => void
  ): Promise<void> {
    data = data || {};
    data.level = level;
    data.event = event;
    data.msg = msg;
    data.command = Log.command.id;
    process.stdout.write(inspect(data) + "\n");
    await Database.writeLog(data);
    if (callback) {
      callback();
    }
  }

  /**
   * Log a message at the debug level
   * @param event a keyword to group messages from a similar section of code
   * @param msg a string message to include in the log
   * @param data interesting data to log
   */
  static debug(event: string, msg: string, data?: any): void {
    Log.log("debug", event, msg, data);
  }

  /**
   * Log a message at the info level
   * @param event a keyword to group messages from a similar section of code
   * @param msg a string message to include in the log
   * @param data interesting data to log
   */
  static info(event: string, msg: string, data?: any): void {
    Log.log("info", event, msg, data);
  }

  /**
   * Log a message at the warn level
   * @param event a keyword to group messages from a similar section of code
   * @param msg a string message to include in the log
   * @param data interesting data to log
   */
  static warn(event: string, msg: string, data?: any): void {
    Log.log("warn", event, msg, data);
  }

  /**
   * Log a message at the error level and exit the program
   * @param event a keyword to group messages from a similar section of code
   * @param msg a string message to include in the log
   * @param data interesting data to log
   */
  static error(event: string, msg: string, data?: any): void {
    Log.log("error", event, msg, data);
  }
}
