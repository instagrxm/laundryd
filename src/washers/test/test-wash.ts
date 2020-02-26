import { Item } from "../../core/item";
import { Log } from "../../core/log";
import { Wash } from "../../core/washers/wash";
import { Download, DownloadResult } from "../../storage/download";

export class TestWash extends Wash {
  static readonly title: string = "test-wash";

  async run(): Promise<Item[]> {
    await Log.info(this, `${this.config.id}`);
    if (!this.memory.foo) {
      this.memory.foo = 1;
    } else {
      this.memory.foo++;
    }

    const item1: Item = {
      date: new Date(2020, 1, 14, 0, 0, 0),
      title: "from test-wash",
      text: "foo 1",
      url: `http://endquote.com/1/${this.memory.foo}`
    };

    const item2: Item = {
      date: new Date(2020, 3, 14, 0, 0, 0),
      title: "from test-wash",
      text: "foo 2",
      url: `http://endquote.com/2/${this.memory.foo}`
    };

    item1.downloads = [
      Download.audio(
        item1,
        "https://soundcloud.com/complexion/tfbs228",
        (result: DownloadResult) => {
          item1.meta = {
            url: `${this.fileStore.url}${result.dir}${result.media}`
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
            url: `${this.fileStore.url}${result.dir}${result.media}`
          };
        }
      )
    ];

    // return new Promise((resolve, reject) => {
    //   setTimeout(async () => {
    //     resolve([item1, item2]);
    //   }, 10000);
    // });

    return [item1, item2];
  }
}
