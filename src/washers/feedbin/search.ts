import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import { AxiosResponse } from "axios";
import { Item, Shared, Wash, WasherInfo } from "../../core";
import { Feedbin } from "./feedbin";

export default class Search extends Wash {
  static readonly info = new WasherInfo({
    title: "Feedbin search",
    description: "search for posts on Feedbin"
  });

  static settings = {
    ...Wash.settings,
    ...Feedbin.authSettings,
    search: flags.string({
      required: true,
      description: "the name of the saved search"
    })
  };

  config!: OutputFlags<typeof Search.settings>;
  searchId!: number;

  async init(): Promise<void> {
    await Feedbin.auth(this, this.config);
  }

  async run(): Promise<Item[]> {
    // https://github.com/feedbin/feedbin-api/blob/master/content/saved-searches.md
    // You can't just search, you have to create a saved search and run it
    let res: AxiosResponse<any>;

    if (!this.searchId) {
      // Get the saved searches to find one that matches the query
      res = await Shared.queueHttp(this, undefined, {
        url: `${Feedbin.api}/saved_searches.json`,
        responseType: "json",
        auth: { username: this.config.username, password: this.config.password }
      });
      const searches = res.data as any[];
      const search = searches.find(s => s.name === this.config.search);
      if (search) {
        this.searchId = search.id;
      }
    }

    if (!this.searchId) {
      return [];
    }

    // Get the search results
    const entryIds = await Feedbin.getPagedList(this, {
      url: `${Feedbin.api}/saved_searches/${this.searchId}.json`,
      responseType: "json",
      auth: { username: this.config.username, password: this.config.password }
    });

    // Load the entries
    const data = await Feedbin.getEntriesById(this, this.config, entryIds);

    // Convert entries to Items
    return Promise.all(data.map(d => this.parseData(d)));
  }

  async parseData(data: any): Promise<Item> {
    const item = await Feedbin.parseData(this, data);

    item.source = {
      image: Feedbin.icon,
      url: Feedbin.url,
      title: `Feedbin: ${this.config.search}`
    };

    return item;
  }
}
