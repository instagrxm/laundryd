import { DateTime } from "luxon";
import { Download, DownloadResult } from "../../core/download";
import { Item } from "../../core/item";
import { Log } from "../../core/log";
import { Shared } from "../../core/washers/shared";
import { Wash } from "../../core/washers/wash";
import { WasherInfo } from "../../core/washers/washerInfo";

export class TestWash extends Wash {
  static readonly info = new WasherInfo({
    title: "test-wash",
    description: "test-wash",
    abstract: false
  });

  async run(): Promise<Item[]> {
    await Log.debug(this, { msg: this.config.id });
    if (!this.memory.foo) {
      this.memory.foo = 1;
    } else {
      this.memory.foo++;
    }

    const item1 = Shared.createItem(
      `http://endquote.com/1/${this.memory.foo}`,
      DateTime.utc(2020, 1, 14, 0, 0, 0),
      this
    );

    item1.title = "from test-wash";
    item1.text = "foo 1";

    const item2 = Shared.createItem(
      `http://endquote.com/2/${this.memory.foo}`,
      DateTime.utc(2020, 3, 14, 0, 0, 0),
      this
    );
    item2.title = "from test-wash";
    item2.text = "foo 2";

    item1.downloads = [
      Download.audio(
        item1,
        "https://soundcloud.com/complexion/tfbs228",
        (result: DownloadResult) => {
          item1.meta = {
            url: `${result.url}/${result.image}`
          };
        }
      )
    ];

    item2.downloads = [
      Download.audio(
        item2,
        "https://soundcloud.com/complexion/tfbs228",
        (result: DownloadResult) => {
          item2.meta = {
            url: `${result.url}/${result.image}`
          };
        }
      )
    ];

    return [item1, item2];
  }
}
