import { OutputFlags } from "@oclif/parser/lib/parse";
import { DateTime } from "luxon";
import { Item } from "./item";
import { Washer } from "./washers/washer";

export interface Memory {
  [key: string]: any;
  lastRun: DateTime;
  config: OutputFlags<typeof Washer.flags>;
  lastItem?: Item;
}
