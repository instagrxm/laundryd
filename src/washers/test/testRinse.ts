import { Item } from "../../core/item";
import { Log } from "../../core/log";
import { Rinse } from "../../core/washers/rinse";
import { WasherInfo } from "../../core/washers/washerInfo";

export class TestRinse extends Rinse {
  static readonly info = new WasherInfo({
    title: "test-rinse",
    description: "test-rinse",
    abstract: false
  });

  async run(items: Item[]): Promise<Item[]> {
    await Log.debug(this, {
      msg: `${this.config.id} got ${items.length} items from ${items.map(
        i => i.washer.id
      )}`
    });
    if (!this.memory.foo) {
      this.memory.foo = 1;
    } else {
      this.memory.foo++;
    }
    items.forEach(i => {
      i.meta = i.meta || {};
      i.meta.rinse = this.memory.foo;
    });

    return items;
  }
}
