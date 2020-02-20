import { Item } from "../../core/item";
import { Wash } from "../../core/washers/wash";

export class TestWash extends Wash {
  static readonly title: string = "test-wash";

  async run(): Promise<Item[]> {
    console.log(`${this.id}`);
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

        console.log(`${this.id} returning`);
        console.log(items.map(i => i.url));
        resolve(items);
      }, 3000);
    });
  }
}
