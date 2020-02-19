import { Item } from "../../core/Item";
import { Foo } from "./foo";

export class Bar extends Foo {
  static readonly source: string = "foosource";
  static readonly title: string = "baaar";

  async run(): Promise<Item[]> {
    console.log("bar running " + new Date().getSeconds());
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve([]);
      }, 2000);
    });
  }
}
