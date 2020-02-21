import { LoadedItem } from "../../core/item";
import { Log } from "../../core/log";
import { Dry } from "../../core/washers/dry";

export class TestDry extends Dry {
  static readonly title: string = "test-dry";

  async run(items: LoadedItem[]): Promise<void> {
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
        Log.info(this, `${this.id} returning`);
        Log.info(this, items.map(i => i.url).join(","));
        resolve();
      }, 2000);
    });
  }
}
