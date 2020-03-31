import { OutputFlags } from "@oclif/parser/lib/parse";
import { IgApiClient } from "instagram-private-api";
import { Item, Wash, WasherInfo } from "../../core";
import { Instagram } from "./instagram";

export default class Liked extends Wash {
  static readonly info = new WasherInfo({
    title: "Instagram liked",
    description: "load posts you've liked on Instagram"
  });

  static settings = {
    ...Wash.settings,
    ...Instagram.authSettings
  };

  config!: OutputFlags<typeof Liked.settings>;

  client!: IgApiClient;

  async init(): Promise<void> {
    this.client = await Instagram.auth(this, this.config);
  }

  async run(): Promise<Item[]> {
    const feed = this.client.feed.liked();
    const data = await Instagram.readFeed(this, feed);
    return Promise.all(data.map(d => Instagram.parseData(this, d)));
  }
}
