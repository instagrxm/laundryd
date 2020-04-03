import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import { Item, Wash, WasherInfo } from "../../core";
import { Mixcloud } from "./mixcloud";

export default class User extends Wash {
  static readonly info = new WasherInfo({
    title: "Mixcloud user",
    description: "load mixes from a Mixcloud user",
  });

  static settings = {
    ...Wash.settings,

    user: flags.string({
      description: "the username to load mixes from",
      required: true,
    }),
  };

  config!: OutputFlags<typeof User.settings>;

  async init(): Promise<void> {
    const res = await Mixcloud.callAPI(this, {
      url: `${Mixcloud.api}/search/`,
      params: { type: "user", q: this.config.user },
    });

    const user = res.data.data.find(
      (d: any) => d.username.toLowerCase() === this.config.user.toLowerCase()
    );

    if (!user) {
      throw new Error(`username ${this.config.user} not found`);
    }
  }

  async run(): Promise<Item[]> {
    const items = await Mixcloud.getUserShows(this, this.config.user);
    return items;
  }
}
