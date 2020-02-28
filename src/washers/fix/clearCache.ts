import { Fix } from "../../core/washers/fix";
import { WasherInfo } from "../../core/washers/washerInfo";
import { Downloader } from "../../storage/downloader";

export class ClearCache extends Fix {
  static readonly info = new WasherInfo({
    title: "clear cache",
    description: "delete any partial downloads"
  });

  async run(): Promise<void> {
    await new Downloader(this).clean();
  }
}
