import { OutputFlags } from "@oclif/parser/lib/parse";
import { IgApiClient } from "instagram-private-api";
import { Item } from "../../core/item";
import { Wash } from "../../core/washers/wash";
import { WasherInfo } from "../../core/washers/washerInfo";
import { Instagram } from "./instagram";

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
    const timeline = this.client.feed.timeline();
    const posts = [];

    while (true) {
      const response = await timeline.request({ reason: "pagination" });
      let done = false;
      for (const post of response.feed_items) {
        if (post.end_of_feed_demarcator) {
          done = true;
          break;
        }
        posts.push(post);
      }
      if (done) {
        break;
      }
    }

    console.log(posts);

    return [];
  }
}
