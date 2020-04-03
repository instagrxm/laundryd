import { OutputFlags } from "@oclif/parser/lib/parse";
import { Item, Shared, Wash, WasherInfo } from "../../core";
import { Feedbin } from "./feedbin";

export default class Saved extends Wash {
  static readonly info = new WasherInfo({
    title: "Feedbin likes",
    description: "load posts you've saved in Feedbin",
  });

  static settings = {
    ...Wash.settings,
    ...Feedbin.authSettings,
  };

  config!: OutputFlags<typeof Saved.settings>;

  async init(): Promise<void> {
    await Feedbin.auth(this, this.config);
  }

  async run(): Promise<Item[]> {
    const res = await Shared.queueHttp(this, undefined, {
      url: `${Feedbin.api}/subscriptions.json`,
      responseType: "json",
      auth: { username: this.config.username, password: this.config.password },
    });

    const subscription = res.data.find(
      (s: any) => s.site_url === "http://pages.feedbinusercontent.com"
    );

    if (!subscription) {
      return [];
    }

    // Request the saved entries
    let data: any[] = await Feedbin.getPagedList(this, {
      url: `${Feedbin.api}/feeds/${subscription.feed_id}/entries.json`,
      responseType: "json",
      params: {
        since: this.memory.lastRun.toISO(),
        include_enclosure: true,
        mode: "extended",
      },
      auth: { username: this.config.username, password: this.config.password },
    });

    data = Feedbin.filterOldEntries(this, data);

    // Convert entries to Items
    return Promise.all(data.map((d) => Feedbin.parseData(this, d)));
  }
}
