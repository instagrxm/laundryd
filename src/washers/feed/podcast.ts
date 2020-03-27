import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import { Dry, Item, WasherInfo } from "../../core";
import { RSS } from "./rss";

// https://help.apple.com/itc/podcasts_connect/#/itcb54353390
// https://castfeedvalidator.com
export class Podcast extends RSS {
  static readonly info = new WasherInfo({
    title: "podcast",
    description: "write items to a podcast feed"
  });

  static settings = {
    ...Dry.settings,
    ...RSS.settings,

    language: flags.string({
      description: "the language of the podcast",
      default: "en_us"
    }),

    ownerName: flags.string({
      description: "the owner name"
    }),

    ownerEmail: flags.string({
      description: "the owner email",
      dependsOn: ["ownerEmail"]
    }),

    category: flags.string({
      description: "the podcast category"
    }),

    subcategory: flags.string({
      description: "the podcast subcategory",
      dependsOn: ["category"]
    })
  };

  config!: OutputFlags<typeof Podcast.settings>;

  buildChannel(
    title: string,
    pubDate: Date,
    siteUrl: string,
    imageUrl: string
  ): any {
    const channel = super.buildChannel(title, pubDate, siteUrl, imageUrl);

    channel.feed_url = `${this.files.url}/${this.config.id}/${this.files.stringsPrefix}/podcast.xml`;

    channel.custom_namespaces = {
      itunes: "http://www.itunes.com/dtds/podcast-1.0.dtd"
    };

    channel.custom_elements = [];
    channel.custom_elements.push({
      "itunes:image": {
        _attr: { href: imageUrl }
      }
    });

    channel.custom_elements.push({ language: this.config.language });

    if (this.config.ownerName && this.config.ownerEmail) {
      channel.custom_elements.push({
        "itunes:owner": [
          { "itunes:name": this.config.ownerName },
          { "itunes:email": this.config.ownerEmail }
        ]
      });
    }

    if (this.config.category) {
      let sub;
      if (this.config.subcategory) {
        sub = {
          "itunes:category": { _attr: { text: this.config.subcategory } }
        };
      }
      channel.custom_elements.push({
        "itunes:category": [{ _attr: { text: this.config.category } }, sub]
      });
    }

    return channel;
  }

  buildDescription(item: Item): string {
    return item.html || "";
  }

  buildItem(item: Item): any {
    const i = super.buildItem(item);

    i.custom_elements = [
      { "itunes:subtitle": item.title },
      { "itunes:author": item.author },
      { "itunes:image": [{ _attr: { href: item.image } }] }
    ];

    if (item.media) {
      i.enclosure = {
        url: item.media.file,
        size: item.media.size,
        type: item.media.type
      };
    }

    return i;
  }

  async run(items: Item[]): Promise<void> {
    const feed = this.buildFeed(items);
    await this.files.saveString("podcast.xml", feed);
  }
}
