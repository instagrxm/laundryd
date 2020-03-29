import { Dry, Item, Log, WasherInfo } from "../../core";

export class TestDry extends Dry {
  static readonly info = new WasherInfo({
    title: "test-dry",
    description: "test-dry"
  });

  async run(items: Item[]): Promise<void> {
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
  }
}
