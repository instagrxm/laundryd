import { Item } from "./item";

export interface Memory {
  [key: string]: any;
  lastRun?: Date;
  lastItem?: Item;
}
