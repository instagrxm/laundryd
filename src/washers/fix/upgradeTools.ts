import { Downloader } from "../../core/downloader";
import { Fix } from "../../core/washers/fix";
import { WasherInfo } from "../../core/washers/washerInfo";

export class UpgradeTools extends Fix {
  static readonly info = new WasherInfo({
    title: "upgrade tools",
    description: "update youtube-dl and ffmpeg to their latest versions"
  });

  async run(): Promise<void> {
    await new Downloader(this).upgrade();
  }
}
