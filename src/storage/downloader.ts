import axios from "axios";
import process from "child_process";
import filenamifyUrl from "filenamify-url";
import fs from "fs-extra";
import isUrl from "is-url";
import mime from "mime";
import path from "path";
import shortid from "shortid";
import util from "util";
import { Config } from "../core/config";
import { Log } from "../core/log";
import { Washer } from "../core/washers/washer";
import { Download, DownloadResult } from "./download";

// @ts-ignore: no types available for ffbinaries
import ffbinaries = require("ffbinaries");

const ytdlPath = path.join(
  __dirname,
  "../../node_modules/youtube-dl.js/bin/youtube-dl"
);

const ffmpegPath = path.join(__dirname, "../../node_modules/ffbinaries/bin");

const exec = util.promisify(process.execFile);

/**
 * Use an HTTP client, youtube-dl, and ffmpeg to handle requests to download
 * files and media.
 */
export class Downloader {
  private washer: Washer;

  // The path for temp download folders.
  private tempRoot = path.join(Config.config.cacheDir, "downloads");

  // How many times to attempt a download before giving up.
  private downloadRetries = 2;

  constructor(washer: Washer) {
    this.washer = washer;
  }

  /**
   * Perform an async download. The callback must copy the resulting files to
   * persistent storage immediately.
   * @param download describes the URL to download and how to process it
   * @param callback a method to handle the resulting download
   */
  async download(
    download: Download,
    callback: (result: DownloadResult) => Promise<void>
  ): Promise<void> {
    const d = download;

    // Create a temp folder
    const tmp = path.join(this.tempRoot, shortid());

    let result: DownloadResult = { url: d.url, dir: tmp, item: d.item };

    if (!isUrl(d.url)) {
      return callback(result);
    }

    await fs.ensureDir(tmp);

    let tries = 0;
    while (true) {
      try {
        tries++;

        // Do the download
        if (d.isDirect) {
          result = await this.directDownload(d.url, tmp, result);
        } else {
          result = await this.ytdlDownload(d.url, tmp, d, result);
        }

        // Call the consumer, who must do something with the files
        await callback(result);
        await fs.remove(tmp);
        break;
      } catch (error) {
        if (tries >= this.downloadRetries) {
          // Give up
          await fs.remove(tmp);
          throw error;
        }
      }
    }
  }

  /**
   * Perform a download using regular HTTP request.
   * @param url the URL to download
   * @param dir the temp folder to download to
   * @param download the download description
   * @param result the result object to update
   */
  async directDownload(
    url: string,
    dir: string,
    result: DownloadResult
  ): Promise<DownloadResult> {
    result.media = filenamifyUrl(url);
    const file = path.join(dir, result.media);

    return new Promise(async (resolve, reject) => {
      await Log.debug(this.washer, { event: "download-http", url });
      axios(url, { responseType: "stream" })
        .then(response => {
          result.size = response.headers["content-length"];
          result.type = response.headers["content-type"];
          response.data.pipe(fs.createWriteStream(file));
        })
        .catch(async error => {
          await Log.error(this.washer, { event: "download-http", url, error });
        });
    });
  }

  /**
   * Perform a download using youtube-dl.
   * @param url the URL to download
   * @param dir the temp folder to download to
   * @param download the download description
   * @param result the result object to update
   */
  private async ytdlDownload(
    url: string,
    dir: string,
    download: Download,
    result: DownloadResult
  ): Promise<DownloadResult> {
    // https://github.com/ytdl-org/youtube-dl/blob/master/README.md#options

    const args: string[] = [
      `--ffmpeg-location=${ffmpegPath}`,
      "--restrict-filenames",
      "--socket-timeout=10"
    ];

    if (download.json) {
      args.push("--write-info-json");
    }

    if (!download.media) {
      args.push("--skip-download");
    }

    if (download.image) {
      args.push("--write-thumbnail");
    }

    if (download.media) {
      if (download.transcode) {
        args.push("--recode-video=mp4");
      }

      if (download.audio) {
        args.push("--extract-audio");
        if (download.transcode) {
          args.push("--audio-format=aac", "--audio-quality=1");
        }
      }
    }

    const opts: process.ExecFileOptions = { cwd: dir };

    // Do the download

    args.push("--quiet"); // comment for debugging
    args.push(url);

    try {
      await Log.debug(this.washer, { event: "download-ytdl", url });
      await exec(ytdlPath, args, opts);
    } catch (error) {
      throw error;
    }

    // Find the files

    const files = await fs.readdir(dir);
    const json = files.find(f => f.match(/\.json$/));
    const thumbnail = files.find(f => f.match(/\.(jpg|png)$/));
    const media = files.find(f => !f.match(/\.(jpg|png|json)$/));

    // Assemble the result

    if (json) {
      result.json = json;
      result.data = await fs.readJson(path.join(dir, json));
    }

    if (thumbnail) {
      result.image = thumbnail;
    }

    if (media) {
      result.media = media;
      result.size = (await fs.stat(path.join(dir, media))).size;
      result.type = mime.getType(result.media) || undefined;
    }

    return result;
  }

  /**
   * Upgrade the binaries for youtube-dl and ffmpeg.
   */
  async upgrade(): Promise<void> {
    await this.upgradeFfmpeg();
    await this.upgradeYoutubedl();
  }

  /**
   * Upgrade the binaries for ffmpeg.
   */
  private async upgradeFfmpeg(): Promise<void> {
    await fs.ensureDir(ffmpegPath);

    let download = true;

    // ffbinaries doesn't do a version check, so we'll do that.
    try {
      const versionOutput = (
        await exec(path.join(ffmpegPath, "ffmpeg"), ["-version"])
      ).stdout;
      // first line includes: ffmpeg version 4.2.2
      const currentVersion = versionOutput
        .match(/(\d+)/g)
        ?.slice(0, 3)
        .join(".");
      const latestVersion = (
        await util.promisify(ffbinaries.listVersions)()
      ).pop();
      download = currentVersion !== latestVersion;
    } catch {
      // no current version
    }

    if (!download) {
      return;
    }

    const opts = {
      platform: ffbinaries.detectPlatform(),
      destination: ffmpegPath,
      force: true,
      quiet: true
    };

    try {
      const res = await util.promisify(ffbinaries.downloadBinaries)(null, opts);
      await Log.debug(this.washer, { event: "upgrade-ffmpeg", res });
    } catch (error) {
      await Log.error(this.washer, { event: "upgrade-ffmpeg", error });
    }
  }

  /**
   * Upgrade the binaries for youtube-dl.
   */
  private async upgradeYoutubedl(): Promise<void> {
    try {
      const res = await exec(ytdlPath, ["-U"]);
      await Log.debug(this.washer, { event: "upgrade-ytdl", msg: res.stdout });
    } catch (error) {
      await Log.error(this.washer, { event: "upgrade-ytdl", error });
    }
  }

  /**
   * Delete the temp downloads folder.
   */
  async clean(): Promise<void> {
    try {
      await Log.debug(this.washer, {
        event: "cache-clean",
        dir: this.tempRoot
      });
      await fs.remove(this.tempRoot);
    } catch (error) {
      await Log.error(this.washer, {
        event: "cache-clean",
        dir: this.tempRoot,
        error
      });
    }
  }
}
