import { OutputFlags } from "@oclif/parser/lib/parse";
import { Item } from "../../core/item";
import { Wash } from "../../core/washers/wash";
import { WasherInfo } from "../../core/washers/washerInfo";
import { Mixcloud } from "./mixcloud";

export default class Likes extends Wash {
  static readonly info = new WasherInfo({
    title: "Mixcloud likes",
    description: "load shows you've liked on Mixcloud"
  });

  static settings = {
    ...Wash.settings,
    ...Mixcloud.authSettings
  };

  config!: OutputFlags<typeof Likes.settings>;

  me!: any;

  async init(): Promise<void> {
    this.me = await Mixcloud.auth(this, this.config);
  }

  async run(): Promise<Item[]> {
    if (!this.me) {
      return [];
    }

    // Set up the first request
    const req = {
      url: this.me.data.metadata.connections.favorites,
      params: {
        // eslint-disable-next-line @typescript-eslint/camelcase
        access_token: this.config.token,
        limit: 50,
        since: Math.floor(this.memory.lastRun.toSeconds())
      }
    };

    // Get a paged list of favorite shows
    let data: any[] = [];
    while (true) {
      const response = await Mixcloud.callAPI(this, req);
      data = data.concat(response.data.data);

      if (
        !response.data.data.length ||
        !response.data.paging ||
        !response.data.paging.next
      ) {
        break;
      }

      req.url = response.data.paging.next;
    }

    // Shows don't include descriptions until you request them separately.
    for (const d of data) {
      await Mixcloud.getShowDescription(this, d);
    }

    return data.map(d => this.parseData(d));
  }

  parseData(data: any): Item {
    const item = Mixcloud.parseData(data);

    item.source = {
      image: this.me.data.pictures.extra_large,
      url: `${this.me.data.url}/favorites`,
      title: "Mixcloud - favorites"
    };

    return item;
  }
}
