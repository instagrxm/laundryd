import { OutputFlags } from "@oclif/parser/lib/parse";
import { Item, ItemSource, Wash, WasherInfo } from "../../core";
import { SoundCloud } from "./soundcloud";

export default class Timeline extends Wash {
  static readonly info = new WasherInfo({
    title: "SoundCloud uploads",
    description:
      "load new uploads from everyone you're following on SoundCloud",
  });

  static settings = {
    ...Wash.settings,
    ...SoundCloud.authSettings,
    ...SoundCloud.querySettings,
  };

  config!: OutputFlags<typeof Timeline.settings>;

  protected me!: any;
  protected itemSource!: ItemSource;

  async init(): Promise<void> {
    this.me = await SoundCloud.auth(this, this.config);
    this.itemSource = {
      image: SoundCloud.icon,
      url: this.me.permalink_url,
      title: this.info.title,
    };
  }

  async run(): Promise<Item[]> {
    if (!this.me) {
      return [];
    }

    // Set up the first request
    const req = {
      url: `${SoundCloud.api}/users/${this.me.id}/followings`,
      params: { client_id: this.config.clientId, limit: 50 },
    };

    // Get a paged list of people they're following
    let userIds: number[] = [];
    while (true) {
      const res = await SoundCloud.callAPI(this, req);
      userIds = userIds.concat(res.data.collection.map((u: any) => u.id));
      if (!res.data.collection.length || !res.data.next_href) {
        break;
      }

      req.url = res.data.next_href;
    }

    // Load tracks for each user
    let data: Item[] = [];
    for (const userId of userIds) {
      const tracks = await SoundCloud.getUserTracks(
        this,
        this.config,
        this.config,
        userId
      );
      data = data.concat(tracks);
    }

    return Promise.all(data.map((d) => this.parseData(d)));
  }

  async parseData(data: any): Promise<Item> {
    const item = await SoundCloud.parseData(this, data);
    item.source = this.itemSource;
    return item;
  }
}
