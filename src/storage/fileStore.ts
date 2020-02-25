import filenameify from "filenamify";
import filenamifyUrl from "filenamify-url";
import fs from "fs-extra";
import mime from "mime";
import os from "os";
import path from "path";
import { Log } from "../core/log";
import { Rinse } from "../core/washers/rinse";
import { Wash } from "../core/washers/wash";
import { Download, DownloadResult } from "./download";

/**
 * Save and load files on the local filesystem.
 */
export class FileStore {
  protected washer: Wash | Rinse;
  protected connection: string;

  url!: string;
  protected rootDir!: string;
  protected downloadsDir!: string;
  protected stringsDir!: string;

  /**
   * Make a new file store.
   * @param washer the washer that's using this filestore
   * @param connection the root path from the configuration
   */
  constructor(washer: Wash | Rinse, connection: string, url: string) {
    this.washer = washer;
    this.connection = connection;
    this.url = url;
  }

  /**
   * Call before using to make sure the path is good.
   */
  async validate(): Promise<void> {
    let dir = this.connection;
    if (dir.startsWith("~")) {
      dir = dir.replace(/^~/, os.homedir());
    }

    dir = filenameify.path(dir);
    dir = path.join(dir, this.washer.config.id);

    this.rootDir = dir;
    this.downloadsDir = path.join(dir, "downloads");
    this.stringsDir = path.join(dir, "strings");

    const connMap = `${this.connection}: ${this.rootDir}`;

    try {
      await fs.ensureDir(this.rootDir);
      await fs.ensureDir(this.downloadsDir);
      await fs.ensureDir(this.stringsDir);
    } catch (error) {
      throw new Error(`couldn't create path for ${connMap}`);
    }

    try {
      if (!(await fs.promises.stat(dir)).isDirectory()) {
        throw new Error();
      }
    } catch (error) {
      throw new Error(`path is not a directory ${connMap}`);
    }

    try {
      await fs.promises.access(dir, fs.constants.W_OK | fs.constants.R_OK);
    } catch (error) {
      throw new Error(`can't write or can't read from path ${connMap}`);
    }
  }

  /**
   * Given a download, see if it's already been loaded. This only checks for the
   * files on disk, not that they're actually the right size.
   * @param download the download to check for
   */
  async existing(download: Download): Promise<DownloadResult | undefined> {
    const dir = path.join(
      this.downloadsDir,
      Math.floor(download.item.date.getTime() / 1000).toString(),
      filenamifyUrl(download.url)
    );

    const result: DownloadResult = {
      url: download.url,
      item: download.item,
      dir: `${dir}/`
    };

    try {
      const exists = await fs.pathExists(dir);
      if (!exists) {
        return;
      }

      const files = await fs.readdir(dir);

      if (download.json) {
        result.json = files.find(f => f.match(/\.json$/));
        if (!result.json) {
          return;
        }
        result.data = await fs.readJson(path.join(dir, result.json));
      }

      if (download.image) {
        result.image = files.find(f => f.match(/\.(jpg|jpeg|png|gif)$/));
        if (!result.image) {
          return;
        }
      }

      if (download.media) {
        result.media = files.find(f => !f.match(/\.(jpg|jpeg|png|gif|json)$/));
        if (!result.media) {
          return;
        }
        const stats = await fs.stat(path.join(dir, result.media));
        result.size = stats.size;
        result.type = mime.getType(result.media) || "";
      }

      return result;
    } catch (error) {
      await Log.error(this.washer, error);
    }
  }

  /**
   * Once a download has completed, move it from the temp folder to the
   * configured path.
   * @param download the completed download
   */
  async downloaded(download: DownloadResult): Promise<DownloadResult> {
    const dir = path.join(
      this.downloadsDir,
      Math.floor(download.item.date.getTime() / 1000).toString(),
      filenamifyUrl(download.url)
    );

    const opts = { overwrite: true };

    try {
      await fs.ensureDir(dir);

      let source: string;
      let target: string;

      if (download.json) {
        source = path.join(download.dir, download.json);
        target = path.join(dir, download.json);
        await fs.copy(source, target, opts);
      }

      if (download.image) {
        source = path.join(download.dir, download.image);
        target = path.join(dir, download.image);
        await fs.copy(source, target, opts);
      }

      if (download.media) {
        source = path.join(download.dir, download.media);
        target = path.join(dir, download.media);
        await fs.copy(source, target, opts);
      }
    } catch (error) {
      await Log.error(this.washer, error);
    }

    download.dir = `${dir}/`;
    return download;
  }

  /**
   * Remove files older than a given date.
   * @param retain the oldest date to keep
   */
  async clean(): Promise<void> {
    if (!this.washer.config.retain) {
      return;
    }

    const retainDate = new Date(
      Date.now() - this.washer.config.retain * 24 * 60 * 60 * 1000
    );

    try {
      const cache = await fs.readdir(this.downloadsDir);
      const old = cache.filter(
        c => parseInt(c, 10) < Math.floor(retainDate.getTime() / 1000)
      );
      for (const dir of old) {
        await fs.remove(path.join(this.downloadsDir, dir));
      }
    } catch (error) {
      await Log.error(this.washer, error);
    }
  }

  /**
   * Save a string to a file.
   * @param file the path of the file to save
   * @param data the string to save
   */
  async saveString(file: string, data: string | any): Promise<void> {
    if (!data) {
      return this.deleteString(file);
    }

    try {
      file = path.join(this.stringsDir, file);
      if (typeof data === "string") {
        await fs.outputFile(file, data);
      } else {
        await fs.outputJSON(file, data);
      }
    } catch (error) {
      await Log.error(this.washer, error);
    }
  }

  /**
   * Read a string from a file.
   * @param file the path of the file to read
   */
  async readString(file: string): Promise<string | undefined> {
    file = path.join(this.stringsDir, file);
    try {
      const f = await fs.readFile(file);
      return f.toString();
    } catch (e) {
      return;
    }
  }

  /**
   * Delete a string file.
   * @param file the path of the file to remove
   */
  async deleteString(file: string): Promise<void> {
    file = path.join(this.stringsDir, file);
    try {
      await fs.remove(file);
    } catch (error) {
      await Log.error(this.washer, error);
    }
  }
}
