import { Item } from "../../core/item";
import { Rinse } from "../../core/washers/rinse";

export class TestRinse extends Rinse {
  static readonly source: string = "test-source";
  static readonly title: string = "test-rinse";

  async run(items: Item[]): Promise<Item[]> {
    console.log(`${TestRinse.title} got ${items.length} items`);
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
        console.log(`${TestRinse.title} returning`);
        console.log(items.map(i => i.url));
        resolve(items);
      }, 1000);
    });
  }
}
