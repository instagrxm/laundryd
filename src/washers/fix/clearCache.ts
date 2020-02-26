import { Fix } from "../../core/washers/fix";
import { Downloader } from "../../storage/downloader";

export class ClearCache extends Fix {
  static readonly title: string = "fix/clearCache";
  static readonly description: string = "delete any partial downloads";

  async run(): Promise<void> {
    await new Downloader(this).clean();
  }
}
