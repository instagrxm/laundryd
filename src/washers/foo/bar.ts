import { Item } from "../../core/item";
import { Foo } from "./foo";

export class Bar extends Foo {
  static readonly source: string = "foosource";
  static readonly title: string = "baaar";

  async run(): Promise<Item[]> {
    console.log("bar running " + new Date().getSeconds());
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!this.memory.foo) {
          this.memory.foo = 1;
        } else {
          this.memory.foo++;
        }
        resolve([]);
      }, 2000);
    });
  }
}
