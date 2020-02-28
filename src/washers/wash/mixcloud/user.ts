import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import { Item } from "../../../core/item";
import { Mixcloud } from "./mixcloud";

export default class User extends Mixcloud {
  static readonly abstract: boolean = false;
  static readonly title: string = "wash/mixcloud/user";
  static readonly description: string = "load mixes from a Mixcloud user";

  static flags = {
    ...Mixcloud.flags,

    user: flags.string({
      description: "the username to load mixes from",
      required: true
    })
  };

  config!: OutputFlags<typeof User.flags>;

  async run(): Promise<Item[]> {
    const items = await this.getUserShows(
      this.config.user,
      this.memory.lastRun
    );
    return items;
  }
}
