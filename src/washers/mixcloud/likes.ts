import { OutputFlags } from "@oclif/parser/lib/parse";
import { Item } from "../../core/item";
import { WasherInfo } from "../../core/washers/washerInfo";
import Timeline from "./timeline";

export default class Likes extends Timeline {
  static readonly info = new WasherInfo({
    title: "Mixcloud likes",
    description: "load shows you've liked on Mixcloud"
  });

  static settings = {
    ...Timeline.settings
  };

  config!: OutputFlags<typeof Likes.settings>;

  protected me!: any;

  async run(): Promise<Item[]> {
    if (!this.me) {
      return [];
    }

    // Set up the first request
    const req = {
      url: this.me.data.metadata.connections.favorites,
      // eslint-disable-next-line @typescript-eslint/camelcase
      params: { access_token: this.config.token, limit: 50 }
    };

    // Get a paged list of favorite shows
    let data: any[] = [];
    while (true) {
      const response = await this.http.request(req);

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
      await this.getShowDescription(d);
    }

    return data.map(d => this.parseShow(d));
  }

  parseShow(data: any): Item {
    const item = super.parseShow(data);

    item.source = {
      image: this.me.data.pictures.extra_large,
      url: `${this.me.data.url}/favorites`,
      title: "Mixcloud - favorites"
    };

    return item;
  }
}
