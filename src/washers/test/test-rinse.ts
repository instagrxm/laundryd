import { Item, LoadedItem } from "../../core/item";
import { Log } from "../../core/log";
import { Rinse } from "../../core/washers/rinse";

export class TestRinse extends Rinse {
  static readonly title: string = "test-rinse";

  async run(items: LoadedItem[]): Promise<Item[]> {
    Log.info(
      this,
      `${this.id} got ${items.length} items from ${items.map(i => i.sourceId)}`
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
        Log.info(this, `${this.id} returning`);
        Log.info(this, items.map(i => i.url).join(","));
        resolve(items);
      }, 1000);
    });
  }
}
