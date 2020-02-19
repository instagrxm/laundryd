import { LoadedItem } from "../../core/item";
import { Dry } from "../../core/washers/dry";

export class TestDry extends Dry {
  static readonly source: string = "test-source";
  static readonly title: string = "test-dry";

  async run(items: LoadedItem[]): Promise<void> {
    console.log(
      `${this.id} got ${items.length} items from ${items.map(i => i.washerId)}`
    );
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!this.memory.foo) {
          this.memory.foo = 1;
        } else {
          this.memory.foo++;
        }
        console.log(`${this.id} returning`);
        console.log(items.map(i => i.url));
        resolve();
      }, 2000);
    });
  }
}
