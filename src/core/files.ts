import { DateTime } from "luxon";
import { Download, DownloadResult } from "./download";
import { Washer } from "./washers/washer";

/**
 * Save and load files.
 */
export abstract class Files {
  protected washer: Washer;
  protected connection: string;

  url!: string;
  protected rootDir!: string;
  protected downloadsDir!: string;
  protected stringsDir!: string;

  downloadsPrefix = "downloads";
  stringsPrefix = "strings";

  /**
   * Make a new file store.
   * @param washer the washer that's using this filestore
   * @param connection the root path from the configuration
   */
  constructor(washer: Washer, connection: string, url: string) {
    this.washer = washer;
    this.connection = connection;
    this.url = url;
  }

  /**
   * Call before using to make sure the path is good.
   */
  abstract async validate(): Promise<void>;

  /**
   * Given a download, see if it's already been loaded. This only checks for the
   * files on disk, not that they're actually the right size.
   * @param download the download to check for
   */
  abstract async existing(
    download: Download
  ): Promise<DownloadResult | undefined>;

  /**
   * Once a download has completed, move it from the temp folder to the
   * configured path.
   * @param download the completed download
   */
  abstract async downloaded(download: DownloadResult): Promise<DownloadResult>;

  /**
   * Copy a file from a temp folder to the destination.
   * @param local the local path to the temp file
   * @param dir the path to the target location
   * @param name the target filename
   * @param date the date associated with this file for cleaning
   */
  abstract async saveDownload(
    date: DateTime,
    local: string,
    dir: string,
    name: string
  ): Promise<string>;

  /**
   * Remove files older than a given date.
   * @param retain the oldest date to keep
   */
  abstract async clean(): Promise<void>;

  /**
   * Save a string to a file.
   * @param file the path of the file to save
   * @param data the string to save
   */
  abstract async saveString(file: string, data: string | any): Promise<void>;

  /**
   * Read a string from a file.
   * @param file the path of the file to read
   */
  abstract async readString(file: string): Promise<string | undefined>;

  /**
   * Delete a string file.
   * @param file the path of the file to remove
   */
  abstract async deleteString(file: string): Promise<void>;
}
