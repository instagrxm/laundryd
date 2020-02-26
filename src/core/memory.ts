import { DateTime } from "luxon";
import { Item } from "./item";

export interface Memory {
  [key: string]: any;
  lastRun?: DateTime;
  lastItem?: Item;
}
