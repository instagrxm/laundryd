import { Downloader } from "../../core/downloader";
import { Fix } from "../../core/washers/fix";
import { WasherInfo } from "../../core/washers/washerInfo";

export class ClearCache extends Fix {
  static readonly info = new WasherInfo({
    title: "clear cache",
    description: "delete any partial downloads"
  });

  async run(): Promise<void> {
    await new Downloader(this).clean();
  }
}
