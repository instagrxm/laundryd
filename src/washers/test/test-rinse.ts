import { Item, LoadedItem } from "../../core/item";
import { Log } from "../../core/log";
import { Rinse } from "../../core/washers/rinse";

export class TestRinse extends Rinse {
  static readonly title: string = "test-rinse";

  async run(items: LoadedItem[]): Promise<Item[]> {
    await Log.info(
      this,
      `${this.config.id} got ${items.length} items from ${items.map(
        i => i.sourceId
      )}`
    );
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        if (!this.memory.foo) {
          this.memory.foo = 1;
        } else {
          this.memory.foo++;
        }
        items.forEach(i => {
          i.extended = i.extended || {};
          i.extended.rinse = this.memory.foo;
        });
        await Log.info(this, `${this.config.id} returning`);
        await Log.info(this, items.map(i => i.url).join(","));
        resolve(items);
      }, 1000);
    });
  }
}
