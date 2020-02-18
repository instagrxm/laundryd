/**
 * An object created by wash commands and consumed by dry commands.
 * Based on @types/rss.
 */
export interface Item {
  /**
   * Title of this particular item.
   */
  title: string;

  /**
   * Content for the item.
   */
  description: string;

  /**
   * URL to the item.
   */
  url: string;

  /**
   * If provided, each array item will be added as a category
   * element.
   */
  categories?: string[];

  /**
   * If included it is the name of the item's creator. If not
   * provided the item author will be the same as the feed author.
   * This is typical except on multi-author blogs.
   */
  author?: string;

  /**
   * The date and time of when the item was created.
   */
  date: Date;

  /**
   * The latitude coordinate of the item for GeoRSS.
   */
  lat?: number;

  /**
   * The longitude coordinate of the item for GeoRSS.
   */
  long?: number;

  /**
   * Put additional elements in the item.
   */
  extended?: any;

  /**
   * An enclosure object.
   */
  enclosure?: Enclosure;

  /**
   * A path to an image associated with the item.
   */
  image?: string;

  /**
   * HTML to embed this item into a page.
   */
  embed?: string;

  /**
   * A description ofwhere this item came from.
   */
  source?: ItemSource;
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
   * URL to file object (or file).
   */
  url: string;

  /**
   * Path to binary file (or URL).
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
}
