import { Downloader, Fix, WasherInfo } from "../../core";

export class ClearCache extends Fix {
  static readonly info = new WasherInfo({
    title: "clear cache",
    description: "delete any partial downloads",
  });

  async run(): Promise<void> {
    await new Downloader(this).clean();
  }
}
