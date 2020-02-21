import { Item } from "../../core/item";
import { Log } from "../../core/log";
import { Wash } from "../../core/washers/wash";

export class TestWash extends Wash {
  static readonly title: string = "test-wash";

  async run(): Promise<Item[]> {
    Log.info(this, `${this.config.id}`);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!this.memory.foo) {
          this.memory.foo = 1;
        } else {
          this.memory.foo++;
        }
        const items = [
          {
            date: new Date(),
            title: "from test-wash",
            description: "foo 1",
            url: `http://endquote.com/1/${this.memory.foo}`
          },
          {
            date: new Date(),
            title: "from test-wash",
            description: "foo 2",
            url: `http://endquote.com/2/${this.memory.foo}`
          }
        ];

        Log.info(this, `${this.config.id} returning`);
        Log.info(this, items.map(i => i.url).join(","));
        resolve(items);
      }, 3000);
    });
  }
}
