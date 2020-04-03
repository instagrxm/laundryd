import { OutputFlags } from "@oclif/parser/lib/parse";
import { Item, Wash, WasherInfo } from "../../core";
import { Mixcloud } from "./mixcloud";

export default class Timeline extends Wash {
  static readonly info = new WasherInfo({
    title: "Mixcloud uploads",
    description: "load new uploads from everyone you're following on Mixcloud"
  });

  static settings = {
    ...Wash.settings,
    ...Mixcloud.authSettings
  };

  config!: OutputFlags<typeof Timeline.settings>;

  protected me!: any;

  async init(): Promise<void> {
    this.me = await Mixcloud.auth(this, this.config);
  }

  async run(): Promise<Item[]> {
    if (!this.me) {
      return [];
    }

    // Set up the first request
    const req = {
      url: this.me.data.metadata.connections.following,
      params: { access_token: this.config.token, limit: 50 }
    };

    // Get a paged list of people they're following
    let data: any[] = [];
    while (true) {
      const res = await Mixcloud.callAPI(this, req);

      for (const user of res.data.data) {
        const shows = await Mixcloud.getUserShows(this, user.username);
        data = data.concat(shows);
      }

      if (!res.data.data.length || !res.data.paging || !res.data.paging.next) {
        break;
      }

      req.url = res.data.paging.next;
    }

    return data.map(d => this.parseData(d));
  }

  parseData(data: any): Item {
    const item = Mixcloud.parseData(this, data);

    item.source = {
      image: Mixcloud.icon,
      url: this.me.data.url,
      title: this.info.title
    };

    return item;
  }
}
