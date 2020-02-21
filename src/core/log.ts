import { Command } from "@oclif/config";
import BaseCommand from "../baseCommand";
import { Database } from "../storage/database";
import { Item } from "./item";
import { Washer } from "./washers/washer";

/**
 * A global logger object.
 */
export class Log {
  private static command: Command.Class;

  static async log(
    level: "debug" | "info" | "warn" | "error",
    source: Washer | BaseCommand,
    data?: any
  ): Promise<void> {
    let title = "";
    let sourceType = "";
    if (source instanceof Washer) {
      sourceType = "washer";
      title = `${source.getInfo().title}/${source.id}`;
    } else {
      sourceType = "command";
      title = source.getInfo().id;
    }

    const date = new Date();
    if (typeof data === "string") {
      data = { msg: data };
    }

    const item: Item = {
      date,
      title,
      description: level,
      extended: data,
      url: `laundry://${sourceType}/${title}/${date.getTime()}`
    };

    console.log(item);
    await Database.writeLog(item);
  }

  static async debug(source: Washer | BaseCommand, data?: any): Promise<void> {
    await Log.log("debug", source, data);
  }

  static async info(source: Washer | BaseCommand, data?: any): Promise<void> {
    await Log.log("info", source, data);
  }

  static async warn(source: Washer | BaseCommand, data?: any): Promise<void> {
    await Log.log("warn", source, data);
  }

  static async error(source: Washer | BaseCommand, data?: any): Promise<void> {
    await Log.log("error", source, data);
  }
}
