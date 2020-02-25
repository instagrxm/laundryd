import { LoadedItem } from "../../core/item";
import { Log } from "../../core/log";
import { Dry } from "../../core/washers/dry";

export class TestDry extends Dry {
  static readonly title: string = "test-dry";

  async run(items: LoadedItem[]): Promise<void> {
    await Log.info(
      this,
      `${this.config.id} got ${items.length} items from ${items.map(
        i => i.washerId
      )}`
    );
    if (!this.memory.foo) {
      this.memory.foo = 1;
    } else {
      this.memory.foo++;
    }
  }
}
