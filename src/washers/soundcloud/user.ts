import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import { Item, Wash, WasherInfo } from "../../core";
import { SoundCloud } from "./soundcloud";

export default class User extends Wash {
  static readonly info = new WasherInfo({
    title: "SoundCloud user",
    description: "load tracks from a SoundCloud user",
  });

  static settings = {
    ...Wash.settings,
    ...SoundCloud.authSettings,
    ...SoundCloud.querySettings,
    user: flags.string({
      description: "the username to load sounds from",
      required: true,
    }),
  };

  config!: OutputFlags<typeof User.settings>;
  userId!: number;

  async init(): Promise<void> {
    // Find the user
    // https://developers.soundcloud.com/docs/api/reference#users
    const res = await SoundCloud.callAPI(this, {
      url: `${SoundCloud.api}/users`,
      params: { client_id: this.config.clientId, q: this.config.user },
    });

    const user = res.data.find(
      (u: any) => u.permalink.toLowerCase() === this.config.user.toLowerCase()
    );

    if (!user) {
      throw new Error(`username ${this.config.user} not found`);
    }

    this.userId = user.id;
  }

  async run(): Promise<Item[]> {
    const items = await SoundCloud.getUserTracks(
      this,
      this.config,
      this.config,
      this.userId
    );
    return items;
  }
}
