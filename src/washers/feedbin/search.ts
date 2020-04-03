import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import { Item, ItemSource, Shared, Wash, WasherInfo } from "../../core";
import { Feedbin } from "./feedbin";

export default class Search extends Wash {
  static readonly info = new WasherInfo({
    title: "Feedbin search",
    description: "search for posts on Feedbin",
  });

  static settings = {
    ...Wash.settings,
    ...Feedbin.authSettings,
    search: flags.string({
      required: true,
      description: "the name of the saved search",
    }),
  };

  config!: OutputFlags<typeof Search.settings>;
  protected searchId!: number;
  protected itemSource!: ItemSource;

  async init(): Promise<void> {
    await Feedbin.auth(this, this.config);

    // Get the saved searches to find one that matches the query
    const res = await Shared.queueHttp(this, undefined, {
      url: `${Feedbin.api}/saved_searches.json`,
      responseType: "json",
      auth: {
        username: this.config.username,
        password: this.config.password,
      },
    });

    const search = res.data.find((s: any) => s.name === this.config.search);
    if (!search) {
      throw new Error(`couldn't find saved search for ${this.config.search}`);
    }
    this.searchId = search.id;

    this.itemSource = {
      image: Feedbin.icon,
      url: Feedbin.url,
      title: `Feedbin: ${this.config.search}`,
    };
  }

  async run(): Promise<Item[]> {
    // Get the search results
    const entryIds = await Feedbin.getPagedList(this, {
      url: `${Feedbin.api}/saved_searches/${this.searchId}.json`,
      responseType: "json",
      auth: { username: this.config.username, password: this.config.password },
    });

    // Load the entries
    const data = await Feedbin.getEntriesById(this, this.config, entryIds);

    // Convert entries to Items
    return Promise.all(data.map((d) => this.parseData(d)));
  }

  async parseData(data: any): Promise<Item> {
    const item = await Feedbin.parseData(this, data);
    item.source = this.itemSource;
    return item;
  }
}
