/* eslint-disable @typescript-eslint/camelcase */
import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import { DateTime } from "luxon";
import RSSFactory from "rss";
import urlUtils from "url";
import { Config } from "../../core/config";
import { LoadedItem } from "../../core/item";
import { Dry } from "../../core/washers/dry";
import { WasherInfo } from "../../core/washers/washerInfo";

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
    })
  };

  config!: OutputFlags<typeof RSS.settings>;

  buildChannel(firstItem: LoadedItem): any {
    const siteUrl = urlUtils.parse(firstItem.url);

    return {
      title: this.config.title || firstItem.source?.title,
      generator: Config.config.pjson.name,
      feed_url: `${this.fileStore.url}/${this.config.id}/${this.fileStore.stringsPrefix}/rss.xml`,
      site_url: firstItem.source?.url || `${siteUrl.protocol}//${siteUrl.host}`,
      image_url: firstItem.source?.image || firstItem.image,
      docs: Config.config.pjson.homepage,
      pubDate: firstItem.created.toJSDate(),
      buildDate: new Date()
    };
  }

  buildDescription(item: LoadedItem): string {
    let description = item.html || "";
    if (item.embed) {
      // Add media embed
      description += item.embed;
    } else if (item.media) {
      // Add inline player
      if (item.media.type) {
        if (item.media.type.startsWith("audio")) {
          description += `<audio controls src=${item.media.file}></audio>`;
        } else if (item.media.type.startsWith("video")) {
          description += `<video controls muted playsinline poster=${item.image} src=${item.media.file}></video>`;
        }
      }
    }

    return description;
  }

  buildItem(item: LoadedItem): any {
    return {
      title: item.title,
      description: this.buildDescription(item),
      url: item.url,
      guid: item.url,
      categories: item.tags,
      author: item.author?.name,
      date: item.created.toJSDate(),
      lat: item.location?.coord?.lat,
      long: item.location?.coord?.lng
    };
  }

  buildFeed(items: LoadedItem[]): string {
    // Build the general feed metadata
    const feed = new RSSFactory(this.buildChannel(items[0]));

    // Build new items from this run of the washer
    const newItems = items.map(i => this.buildItem(i));

    // Get items from the last run, filter any with the same URL
    let oldItems = this.memory.lastItems ?? [];
    oldItems = oldItems.filter(
      (o: { url: string }) => !newItems.find(n => n.url === o.url)
    );

    // Remove any old items
    const now = DateTime.utc();
    const allItems = newItems
      .concat(oldItems)
      .filter(
        i =>
          now.diff(DateTime.fromJSDate(i.date), "days").days <= this.config.days
      );

    // Build the feed
    allItems.forEach(i => feed.item(i));
    return feed.xml({ indent: "  " });
  }

  async run(items: LoadedItem[]): Promise<void> {
    const feed = this.buildFeed(items);
    await this.fileStore.saveString("rss.xml", feed);
  }
}
