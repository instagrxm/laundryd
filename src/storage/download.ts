import { Item } from "../core/item";

/**
 * Describes a download request to be passed to {@link Downloader}, which can download
 * a URL directly or use youtube-dl to extract media from a URL.
 */
export class Download {
  /**
   * The item that spawned this download.
   */
  item: Item;

  /**
   * The URL to download. If all other properties are false, the URL will be downloaded
   * directly.
   */
  url: string;

  /**
   * Whether to load and parse JSON data provided by youtube-dl.
   */
  json = false;

  /**
   * Whether to download the media file discovered at the URL.
   */
  media = false;

  /**
   * Whether to download an image associated with the media discovered at the URL,
   * such as a video thumbnail.
   */
  image = false;

  /**
   * When downloading video, setting this flag will return only the audio track.
   */
  audio = false;

  /**
   * Transcode media to web-friendly formats like MP4 video and AAC audio. This
   * can take time and is CPU-intensive.
   */
  transcode = false;

  /**
   * A callback which receives information about the resulting download.
   */
  complete: (result: DownloadResult) => void;

  /**
   * Create a download and set its basic properties.
   * @param url the URL to download
   * @param date the date associated with the download, likely the same as the associated Item
   * @param complete a completion handler
   */
  constructor(
    item: Item,
    url: string,
    complete: (result: DownloadResult) => void
  ) {
    this.item = item;
    this.url = url;
    this.complete = complete;
  }

  /**
   * If true, the URL will be downloaded directly. Otherwise youtube-dl will be used.
   */
  get isDirect(): boolean {
    return (
      !this.json && !this.media && !this.image && !this.audio && !this.transcode
    );
  }

  /**
   * Factory method which returns a download to a direct URL.
   * @param item the Item that spawned this download
   * @param url the URL to download
   * @param complete a completion handler
   */
  static direct(
    item: Item,
    url: string,
    complete: (result: DownloadResult) => void
  ): Download {
    const d = new Download(item, url, complete);
    d.json = false;
    d.image = false;
    d.media = false;
    d.audio = false;
    d.transcode = false;
    return d;
  }

  /**
   * Factory method which returns a download for an audio file.
   * @param item the Item that spawned this download
   * @param url the URL to download
   * @param complete a completion handler
   */
  static audio(
    item: Item,
    url: string,
    complete: (result: DownloadResult) => void
  ): Download {
    const d = new Download(item, url, complete);
    d.json = false;
    d.image = true;
    d.media = true;
    d.audio = true;
    d.transcode = false;
    return d;
  }
}

/**
 * The results of a download.
 */
export interface DownloadResult {
  item: Item;

  /**
   * The URL base URL for files in this download. This is initially the URL of the
   * download, and gets changed to the permanent URL by the {@link FileStore}.
   */
  url: string;

  /**
   * The directory where the files are saved. This is initially a temp folder, and
   * gets changed to a permanent location by the {@link FileStore}.
   */
  dir: string;

  /**
   * The path to the JSON file, if one was requested.
   */
  json?: string;

  /**
   * The parsed JSON data, if a JSON file was requested.
   */
  data?: any;

  /**
   * The path to the downloaded image or thumbnail, if one was requested.
   */
  image?: string;

  /**
   * The path to the downloaded video or audio file, if one was requested.
   */
  media?: string;

  /**
   * The size of the media file in bytes.
   */
  size?: number;

  /**
   * The MIME type of the media file.
   */
  type?: string;
}
