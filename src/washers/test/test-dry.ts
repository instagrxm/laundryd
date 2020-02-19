import { Item } from "../../core/item";
import { Dry } from "../../core/washers/dry";

export class TestDry extends Dry {
  static readonly source: string = "test-source";
  static readonly title: string = "test-dry";

  async run(items: Item[]): Promise<void> {
    console.log(`${TestDry.title} got ${items.length} items`);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!this.memory.foo) {
          this.memory.foo = 1;
        } else {
          this.memory.foo++;
        }
        console.log(`${TestDry.title} returning`);
        console.log(items.map(i => i.url));
        resolve();
      }, 2000);
    });
  }
}
