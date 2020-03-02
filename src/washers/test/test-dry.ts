import { LoadedItem } from "../../core/item";
import { Log } from "../../core/log";
import { Dry } from "../../core/washers/dry";
import { WasherInfo } from "../../core/washers/washerInfo";

export class TestDry extends Dry {
  static readonly info = new WasherInfo({
    title: "test-dry",
    description: "test-dry"
  });

  async run(items: LoadedItem[]): Promise<void> {
    await Log.debug(this, {
      msg: `${this.config.id} got ${items.length} items from ${items.map(
        i => i.washerId
      )}`
    });
    if (!this.memory.foo) {
      this.memory.foo = 1;
    } else {
      this.memory.foo++;
    }
  }
}
