import { Fix } from "../../core/washers/fix";
import { Downloader } from "../../storage/downloader";

export class UpgradeTools extends Fix {
  static readonly title: string = "fix/upgradeTools";
  static readonly description: string =
    "update youtube-dl and ffmpeg to their latest versions";

  async run(): Promise<void> {
    await new Downloader(this).upgrade();
  }
}
