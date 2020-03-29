import filenameify from "filenamify";
import fs from "fs-extra";
import { DateTime } from "luxon";
import mime from "mime";
import os from "os";
import path from "path";
import { Download, DownloadResult, Files, Log, Shared } from "../core";

/**
 * Save and load files on the local filesystem.
 */
export class LocalFiles extends Files {
  async validate(): Promise<void> {
    let dir = this.connection;
    if (dir.startsWith("~")) {
      dir = dir.replace(/^~/, os.homedir());
    }

    dir = filenameify.path(dir);
    dir = path.join(dir, this.washer.config.id);

    this.rootDir = dir;
    this.downloadsDir = path.join(dir, this.downloadsPrefix);
    this.stringsDir = path.join(dir, this.stringsPrefix);

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

  async existing(download: Download): Promise<DownloadResult | undefined> {
    const dir = path.join(
      this.downloadsDir,
      Math.floor(download.item.created.toSeconds()).toString(),
      Shared.urlToFilename(download.url)
    );

    const result: DownloadResult = {
      url: dir.replace(this.connection, this.url),
      item: download.item,
      dir
    };

    try {
      const exists = await fs.pathExists(dir);
      if (!exists) {
        return;
      }

      const files = await fs.readdir(dir);
      if (!files.length) {
        return;
      }

      if (download.json) {
        result.json = files.find(f => f === "data.json");
        if (!result.json) {
          return;
        }
        result.data = await fs.readJson(path.join(dir, result.json));
      }

      if (download.image) {
        result.image = files.find(f => f.match(/^image/));
        if (!result.image) {
          return;
        }
      }

      if (download.media || download.isDirect) {
        result.media = files[0];
        if (!download.isDirect) {
          result.media = files.find(f => !f.match(/^media/));
        }

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

  async downloaded(download: DownloadResult): Promise<DownloadResult> {
    const dir = Shared.urlToFilename(download.url);

    let local: string;
    const date = download.item.created;
    let remoteDir = "";

    try {
      if (download.json) {
        local = path.join(download.dir, download.json);
        download.json = "data.json";
        remoteDir = await this.saveDownload(date, local, dir, download.json);
      }

      if (download.image) {
        local = path.join(download.dir, download.image);
        download.image = `image${path.parse(download.image).ext}`;
        remoteDir = await this.saveDownload(date, local, dir, download.image);
      }

      if (download.media) {
        local = path.join(download.dir, download.media);
        download.media = `media${path.parse(download.media).ext}`;
        remoteDir = await this.saveDownload(date, local, dir, download.media);
      }
    } catch (error) {
      await Log.error(this.washer, error);
    }

    download.dir = remoteDir;
    download.url = download.dir.replace(this.connection, this.url);
    return download;
  }

  async saveDownload(
    date: DateTime,
    local: string,
    dir: string,
    name: string
  ): Promise<string> {
    dir = path.join(
      this.downloadsDir,
      Math.floor(date.toSeconds()).toString(),
      dir
    );
    const file = path.join(dir, name);

    await fs.copy(local, file, { overwrite: true });

    return dir;
  }

  async clean(): Promise<void> {
    const retainDate = this.washer.retainDate();
    if (!retainDate) {
      return;
    }

    try {
      const cache = await fs.readdir(this.downloadsDir);
      const old = cache.filter(
        c => parseInt(c, 10) < Math.floor(retainDate.toSeconds())
      );
      for (const dir of old) {
        await fs.remove(path.join(this.downloadsDir, dir));
      }
    } catch (error) {
      await Log.error(this.washer, error);
    }
  }

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

  async readString(file: string): Promise<string | undefined> {
    file = path.join(this.stringsDir, file);
    try {
      const f = await fs.readFile(file);
      return f.toString();
    } catch (e) {
      return;
    }
  }

  async deleteString(file: string): Promise<void> {
    file = path.join(this.stringsDir, file);
    try {
      await fs.remove(file);
    } catch (error) {
      await Log.error(this.washer, error);
    }
  }
}
