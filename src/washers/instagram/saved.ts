/* eslint-disable @typescript-eslint/camelcase */
import { OutputFlags } from "@oclif/parser/lib/parse";
import { IgApiClient } from "instagram-private-api";
import { Item } from "../../core/item";
import { Wash } from "../../core/washers/wash";
import { WasherInfo } from "../../core/washers/washerInfo";
import { IgFeedItem, Instagram } from "./instagram";

export default class Saved extends Wash {
  static readonly info = new WasherInfo({
    title: "Instagram saves",
    description: "load posts you've saved on Instagram"
  });

  static settings = {
    ...Wash.settings,
    begin: Instagram.beginSetting,
    ...Instagram.authSettings
  };

  config!: OutputFlags<typeof Saved.settings>;

  client!: IgApiClient;

  async init(): Promise<void> {
    this.client = await Instagram.auth(this, this.config);
  }

  async run(): Promise<Item[]> {
    const feed = this.client.feed.saved();
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
