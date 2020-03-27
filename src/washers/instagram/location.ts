import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import { IgApiClient, LocationFeedResponseMedia } from "instagram-private-api";
import { Item, Wash, WasherInfo } from "../../core";
import { IgFeedItem, Instagram } from "./instagram";

export default class Location extends Wash {
  static readonly info = new WasherInfo({
    title: "Instagram location",
    description: "load new posts from a location on Instagram"
  });

  static settings = {
    ...Wash.settings,
    begin: Instagram.beginSetting,
    ...Instagram.authSettings,
    locationId: flags.integer({
      required: true,
      description: "the location to load posts from",
      helpLabel:
        "search for a location on instagram.com and return the numeric portion of the resulting URL"
    })
  };

  config!: OutputFlags<typeof Location.settings>;

  client!: IgApiClient;

  async init(): Promise<void> {
    this.client = await Instagram.auth(this, this.config);
  }

  async run(): Promise<Item[]> {
    const feed = this.client.feed.location(this.config.locationId, "recent");
    const data = await Instagram.readFeed(this, feed);
    return Promise.all(data.map(d => this.parseData(d)));
  }

  async parseData(data: IgFeedItem): Promise<Item> {
    const item = await Instagram.parseData(this, data);

    const location = (data as LocationFeedResponseMedia).location;

    item.source = {
      image: Instagram.icon,
      url: `${Instagram.url}/explore/locations/${this.config.locationId}/`,
      title: `Instagram: ${location?.name || this.config.locationId}`
    };

    return item;
  }
}
