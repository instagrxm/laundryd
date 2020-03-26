import { OutputFlags } from "@oclif/parser/lib/parse";
import { Item } from "../../core/item";
import { Wash } from "../../core/washers/wash";
import { WasherInfo } from "../../core/washers/washerInfo";
import { Feedbin } from "./feedbin";

export default class Liked extends Wash {
  static readonly info = new WasherInfo({
    title: "Feedbin likes",
    description: "load posts you've starred in Feedbin"
  });

  static settings = {
    ...Wash.settings,
    ...Feedbin.authSettings
  };

  config!: OutputFlags<typeof Liked.settings>;

  async init(): Promise<void> {
    await Feedbin.auth(this, this.config);
  }

  async run(): Promise<Item[]> {
    // Request the IDs of the starred entries
    const entryIds = await Feedbin.getPagedList(this, {
      url: `${Feedbin.api}/starred_entries.json`,
      responseType: "json",
      auth: { username: this.config.username, password: this.config.password }
    });

    // Load the entries
    const data = await Feedbin.getEntriesById(this, this.config, entryIds);

    // Convert entries to Items
    return Promise.all(data.map(d => Feedbin.parseData(this, d)));
  }
}
