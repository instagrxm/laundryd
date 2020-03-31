import { OutputFlags } from "@oclif/parser/lib/parse";
import { IgApiClient } from "instagram-private-api";
import { Item, Wash, WasherInfo } from "../../core";
import { IgFeedItem, Instagram } from "./instagram";

export default class Timeline extends Wash {
  static readonly info = new WasherInfo({
    title: "Instagram timeline",
    description: "load new posts from everyone you're following on Instagram"
  });

  static settings = {
    ...Wash.settings,
    ...Instagram.authSettings
  };

  config!: OutputFlags<typeof Timeline.settings>;

  client!: IgApiClient;

  async init(): Promise<void> {
    this.client = await Instagram.auth(this, this.config);
  }

  async run(): Promise<Item[]> {
    const feed = this.client.feed.timeline();
    const data = await Instagram.readFeed(this, feed);
    return Promise.all(data.map(d => this.parseData(d)));
  }

  async parseData(data: IgFeedItem): Promise<Item> {
    const item = await Instagram.parseData(this, data);

    item.source = {
      image: Instagram.icon,
      url: Instagram.url,
      title: this.info.title
    };

    return item;
  }
}
