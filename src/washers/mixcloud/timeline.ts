import { OutputFlags } from "@oclif/parser/lib/parse";
import { Item } from "../../core/item";
import { Wash } from "../../core/washers/wash";
import { WasherInfo } from "../../core/washers/washerInfo";
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
      // eslint-disable-next-line @typescript-eslint/camelcase
      params: { access_token: this.config.token, limit: 50 }
    };

    // Get a paged list of people they're following
    let data: any[] = [];
    while (true) {
      const response = await Mixcloud.callAPI(this, req);

      for (const user of response.data.data) {
        // Pass each user to the user command
        const shows = await Mixcloud.getUserShows(
          this,
          user.username,
          this.memory.lastRun
        );
        data = data.concat(shows);
      }

      if (
        !response.data.data.length ||
        !response.data.paging ||
        !response.data.paging.next
      ) {
        break;
      }

      req.url = response.data.paging.next;
    }

    return data.map(d => this.parseData(d));
  }

  parseData(data: any): Item {
    const item = Mixcloud.parseData(this, data);

    item.source = {
      image: "https://www.mixcloud.com/media/images/www/global/favicon-64.png",
      url: this.me.data.url,
      title: "Mixcloud - New Shows"
    };

    return item;
  }
}
