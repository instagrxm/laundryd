import { LogLevel } from "aws-sdk/clients/iot";
import { DateTime } from "luxon";
import { Download } from "./download";

/**
 * An object created by washers.
 */
export interface Item {
  /**
   * URL to the item. URLs from a particular washer must be unique.
   */
  url: string;

  washer: WasherId;

  /**
   * This item's creation date.
   */
  created: DateTime;

  /**
   * When the item was saved.
   */
  saved?: DateTime;

  /**
   * The language to use for full-text searches.
   */
  language?: MongoLanguage;

  /**
   * The title of this item.
   */
  title?: string;

  /**
   * Tags, hashtags, or categories in which this item would appear.
   */
  tags?: string[];

  /**
   * An image path associated with this item, either a relative path within a FileStore or a full URL.
   */
  image?: string;

  /**
   * Plain text content describing the item.
   */
  text?: string;

  /**
   * Shorter plain text content describing the item.
   */
  summary?: string;

  /**
   * HTML-formatted content describing the item.
   */
  html?: string;

  /**
   * HTML to embed this item into a page.
   */
  embed?: string;

  /**
   * A description of the author of this item.
   */
  author?: Author;

  /**
   * A physical location associated with the item.
   */
  location?: Location;

  /**
   * A media item for this item that would be presented in a podcast format.
   */
  media?: Enclosure;

  /**
   * A description of where this item came from.
   */
  source?: ItemSource;

  /**
   * Any arbitrary data to add.
   */
  meta?: Record<string, any>;

  /**
   * Downloads to process. This field is not saved to the database.
   */
  downloads?: Download[];
}

/**
 * Uniquely identify a washer.
 */
export interface WasherId {
  /**
   * The user-defined unique ID for the washer instance.
   */
  id: string;

  /**
   * The name of the washer, which is the same for all instances.
   */
  name: string;
}

/**
 * Describe the author of an item.
 */
export interface Author {
  name: string;
  url?: string;
  avatar?: string;
}

/**
 * Describe the location of an item.
 */
export interface Location {
  name?: string;
  coord?: { lat: number; lng: number };
}

/**
 * Information about the source of an item.
 */
export interface ItemSource {
  /**
   * URL to a web page that shows where this item came from, like a user profile.
   */
  url?: string;

  /**
   * A string describing the source of the item, like a user name.
   */
  title?: string;

  /**
   * A path to an image associated with the source of the item, like a user icon or favicon.
   */
  image?: string;
}

/**
 * A media file attached to the Item which can be presented in a
 * podcast format or in an inline media player.
 */
export interface Enclosure {
  /**
   * Path to file.
   */
  file: string;

  /**
   * Size of the file.
   */
  size: number;

  /**
   * The MIME type of the file.
   */
  type: string;

  /**
   * The duration of the media in seconds.
   */
  duration?: number;
}

/**
 * Log messages are saved to the database the same as items, but the desription is the log level.
 */
export interface LogItem extends Item {
  level: LogLevel;
}

/**
 * Languages supported by MongoDB full-text search.
 * https://docs.mongodb.com/manual/reference/text-search-languages/
 */
export enum MongoLanguage {
  danish = "danish",
  dutch = "dutch",
  english = "english",
  finnish = "finnish",
  french = "french",
  german = "german",
  hungarian = "hungarian",
  italian = "italian",
  norwegian = "norwegian",
  portuguese = "portuguese",
  romanian = "romanian",
  russian = "russian",
  spanish = "spanish",
  swedish = "swedish",
  turkish = "turkish"
}
