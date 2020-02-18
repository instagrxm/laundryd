import { Item } from "./Item";

export interface Memory {
  [key: string]: any;
  lastRun: Date;
  lastItem: Item;
}
