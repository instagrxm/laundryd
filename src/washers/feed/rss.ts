import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import ellipsize from "ellipsize";
import { DateTime } from "luxon";
import RSSFactory from "rss";
import urlUtils from "url";
import { Config, Dry, Item, WasherInfo } from "../../core";

export class RSS extends Dry {
  static readonly info = new WasherInfo({
    title: "RSS",
    description: "write items to an RSS feed"
  });

  static settings = {
    ...Dry.settings,

    days: flags.integer({
      default: 7,
      description: "include items from this many days in the past"
    }),

    title: flags.string({
      description: "the title of the feed"
    }),

    siteUrl: flags.string({
      description: "URL to a web page containing the contents of the feed"
    }),

    imageUrl: flags.string({
      description: "URL to an image representing the contents of the feed"
    }),

    titleLength: flags.integer({
      default: 30,
      description: "truncate titles to this many characters"
    })
  };

  config!: OutputFlags<typeof RSS.settings>;

  buildChannel(
    title: string,
    pubDate: Date,
    siteUrl: string,
    imageUrl: string
  ): any {
    return {
      title,
      pubDate,
      site_url: siteUrl,
      image_url: imageUrl,
      buildDate: new Date(),
      docs: Config.config.pjson.homepage,
      generator: Config.config.pjson.name,
      feed_url: `${this.files.url}/${this.config.id}/${this.files.stringsPrefix}/rss.xml`
    };
  }

  buildDescription(item: Item): string | undefined {
    let desc = item.html || item.text || item.summary || item.embed;

    if (!desc && item.media) {
      if (item.media.type) {
        if (item.media.type.startsWith("audio")) {
          desc = `<audio controls src=${item.media.file}></audio>`;
        } else if (item.media.type.startsWith("video")) {
          desc = `<video controls muted playsinline poster=${item.image} src=${item.media.file}></video>`;
        }
      }
    }

    return desc;
  }

  buildItem(item: Item): any {
    return {
      title: ellipsize(item.title, this.config.titleLength),
      description: this.buildDescription(item),
      summary: item.summary,
      url: item.url,
      guid: item.url,
      categories: item.tags,
      author: item.author?.name,
      date: item.created.toJSDate(),
      lat: item.location?.coord?.lat,
      long: item.location?.coord?.lng
    };
  }

  buildFeed(items: Item[]): string {
    // Build new items from this run of the washer
    let feedItems = items.map(i => this.buildItem(i));

    // Add items from last time
    feedItems = feedItems.concat(this.memory.lastItems || []);

    // Remove any old items
    const now = DateTime.utc();
    feedItems = feedItems.filter(
      i =>
        now.diff(DateTime.fromJSDate(i.date), "days").days <= this.config.days
    );

    // Sort so newest is first
    feedItems.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Remove duplicate URLs
    const unique: any[] = [];
    feedItems.forEach(i => {
      if (!unique.find(u => u.url === i.url)) {
        unique.push(i);
      }
    });
    feedItems = unique;

    // Save for next time
    this.memory.lastItems = feedItems;

    // Build the feed
    const title = this.config.title || items[0]?.source?.title || "";
    const pubDate = items[0]?.created.toJSDate() || new Date();
    const imageUrl = this.config.imageUrl || items[0]?.source?.image || "";
    let siteUrl = this.config.siteUrl;
    if (!siteUrl && items[0]) {
      const { protocol, host } = urlUtils.parse(
        items[0].source?.url || items[0].url
      );
      siteUrl = `${protocol}//${host}`;
    }
    const feed = new RSSFactory(
      this.buildChannel(title, pubDate, siteUrl, imageUrl)
    );

    // Build the items
    feedItems.forEach(i => feed.item(i));

    // Return the XML
    return feed.xml({ indent: "  " });
  }

  async run(items: Item[]): Promise<void> {
    const feed = this.buildFeed(items);
    await this.files.saveString("rss.xml", feed);
  }
}
