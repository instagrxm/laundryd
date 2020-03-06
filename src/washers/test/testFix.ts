import { Log } from "../../core/log";
import { Fix } from "../../core/washers/fix";
import { WasherInfo } from "../../core/washers/washerInfo";

export class TestFix extends Fix {
  static readonly info = new WasherInfo({
    title: "test-fix",
    description: "test-fix"
  });

  async run(): Promise<void> {
    await Log.debug(this, { msg: this.config.id });
    if (!this.memory.foo) {
      this.memory.foo = 1;
    } else {
      this.memory.foo++;
    }
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        resolve();
      }, 10000);
    });
  }
}
