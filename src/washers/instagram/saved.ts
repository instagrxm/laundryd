import { OutputFlags } from "@oclif/parser/lib/parse";
import { IgApiClient } from "instagram-private-api";
import { Item, Wash, WasherInfo } from "../../core";
import { Instagram } from "./instagram";

export default class Saved extends Wash {
  static readonly info = new WasherInfo({
    title: "Instagram saved",
    description: "load posts you've saved on Instagram"
  });

  static settings = {
    ...Wash.settings,
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
    return Promise.all(data.map(d => Instagram.parseData(this, d)));
  }
}
