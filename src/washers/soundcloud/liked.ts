import { OutputFlags } from "@oclif/parser/lib/parse";
import { Item, Wash, WasherInfo } from "../../core";
import { SoundCloud } from "./soundcloud";

export default class Liked extends Wash {
  static readonly info = new WasherInfo({
    title: "SoundCloud likes",
    description: "load tracks you've liked on SoundCloud",
  });

  static settings = {
    ...Wash.settings,
    ...SoundCloud.authSettings,
    ...SoundCloud.querySettings,
  };

  config!: OutputFlags<typeof Liked.settings>;

  me!: any;

  async init(): Promise<void> {
    this.me = await SoundCloud.auth(this, this.config);
  }

  async run(): Promise<Item[]> {
    if (!this.me) {
      return [];
    }

    // Set up the first request
    const req = {
      url: `${SoundCloud.api}/users/${this.me.id}/favorites`,
      params: {
        client_id: this.config.clientId,
        limit: 50,
        linked_partitioning: 1,
      },
    };

    const data = await SoundCloud.getTrackList(this, req);

    return Promise.all(data.map((d) => this.parseData(d)));
  }

  async parseData(data: any): Promise<Item> {
    const item = await SoundCloud.parseData(this, data);

    item.source = {
      image: this.me.avatar_url.replace("large.jpg", "t500x500.jpg"),
      url: `${SoundCloud.url}/${this.me.username}/likes`,
      title: this.info.title,
    };

    return item;
  }
}
