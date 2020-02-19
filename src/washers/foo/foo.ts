import { Item } from "../../core/item";
import { Wash } from "../../core/washers/wash";

export class Foo extends Wash {
  static readonly source: string = "foosource";
  static readonly title: string = "foooo";

  async run(): Promise<Item[]> {
    console.log("foo running " + new Date().getSeconds());
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!this.memory.foo) {
          this.memory.foo = 1;
        } else {
          this.memory.foo++;
        }
        resolve([]);
      }, 10000);
    });
  }
}
