import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import {
  IgApiClient,
  UserRepositorySearchResponseUsersItem,
} from "instagram-private-api";
import { Item, Wash, WasherInfo } from "../../core";
import { IgFeedItem, Instagram } from "./instagram";

export default class User extends Wash {
  static readonly info = new WasherInfo({
    title: "Instagram user",
    description: "load new posts from a user on Instagram",
  });

  static settings = {
    ...Wash.settings,
    ...Instagram.authSettings,
    user: flags.string({
      required: true,
      description: "the user to load posts from",
    }),
  };

  config!: OutputFlags<typeof User.settings>;

  client!: IgApiClient;
  user!: UserRepositorySearchResponseUsersItem;

  async init(): Promise<void> {
    this.client = await Instagram.auth(this, this.config);
    this.user = await this.client.user.searchExact(this.config.user);
  }

  async run(): Promise<Item[]> {
    const feed = this.client.feed.user(this.user.pk);
    const data = await Instagram.readFeed(this, feed);
    return Promise.all(data.map((d) => this.parseData(d)));
  }

  async parseData(data: IgFeedItem): Promise<Item> {
    const item = await Instagram.parseData(this, data);

    item.source = {
      image: this.user.profile_pic_url,
      url: `${Instagram.url}/p/${this.user.username}/`,
      title: `Instagram: ${this.user.username}`,
    };

    return item;
  }
}
