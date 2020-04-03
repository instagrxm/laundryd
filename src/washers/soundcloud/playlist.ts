import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import { DateTime } from "luxon";
import { Item, ItemSource, Wash, WasherInfo } from "../../core";
import { SoundCloud } from "./soundcloud";

export default class Playlist extends Wash {
  static readonly info = new WasherInfo({
    title: "SoundCloud playlist",
    description: "load tracks from a SoundCloud playlist",
  });

  static settings = {
    ...Wash.settings,
    ...SoundCloud.authSettings,
    ...SoundCloud.querySettings,
    playlist: flags.string({
      description: "the full URL to a playlist",
      required: true,
    }),
  };

  config!: OutputFlags<typeof Playlist.settings>;
  protected playlistId!: number;
  protected itemSource!: ItemSource;

  async init(): Promise<void> {
    // Find the user
    // https://developers.soundcloud.com/docs/api/reference#resolve
    const res = await SoundCloud.callAPI(this, {
      url: `${SoundCloud.api}/resolve`,
      params: { client_id: this.config.clientId, url: this.config.playlist },
    });

    if (res.data.kind !== "playlist") {
      throw new Error("playlist not found");
    }

    this.playlistId = res.data.id;
    this.itemSource = {
      image: res.data.artwork_url.replace("large.jpg", "t500x500.jpg"),
      url: res.data.permalink_url,
      title: res.data.title,
    };
  }

  async run(): Promise<Item[]> {
    // https://developers.soundcloud.com/docs/api/reference#playlists
    const res = await SoundCloud.callAPI(this, {
      url: `${SoundCloud.api}/playlists/${this.playlistId}`,
      params: { client_id: this.config.clientId },
    });

    const data = [];
    for (const show of res.data.tracks) {
      const taken = DateTime.fromJSDate(new Date(show.created_at));
      const old = taken.diff(this.memory.lastRun, "days").days <= 0;
      if (!old) {
        data.push(show);
      }
    }

    return Promise.all(data.map((d) => this.parseData(d)));
  }

  async parseData(data: any): Promise<Item> {
    const item = await SoundCloud.parseData(this, data);
    item.source = this.itemSource;
    return item;
  }
}
