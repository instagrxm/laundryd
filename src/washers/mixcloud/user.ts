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

  async run(): Promise<Item[]> {
    const items = await Mixcloud.getUserShows(this, this.config.user);
    return items;
  }
}
