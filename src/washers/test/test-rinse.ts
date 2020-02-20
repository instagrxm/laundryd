import { Item, LoadedItem } from "../../core/item";
import { Rinse } from "../../core/washers/rinse";

export class TestRinse extends Rinse {
  static readonly title: string = "test-rinse";

  async run(items: LoadedItem[]): Promise<Item[]> {
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
        items.forEach(i => {
          i.extended = i.extended || {};
          i.extended.rinse = this.memory.foo;
        });
        console.log(`${this.id} returning`);
        console.log(items.map(i => i.url));
        resolve(items);
      }, 1000);
    });
  }
}
