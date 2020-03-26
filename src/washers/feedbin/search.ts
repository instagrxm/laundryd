import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import { AxiosResponse } from "axios";
import { Item } from "../../core/item";
import { Log } from "../../core/log";
import { Shared } from "../../core/washers/shared";
import { Wash } from "../../core/washers/wash";
import { WasherInfo } from "../../core/washers/washerInfo";
import { Feedbin } from "./feedbin";

export default class Search extends Wash {
  static readonly info = new WasherInfo({
    title: "Feedbin search",
    description: "search for posts on Feedbin"
  });

  static settings = {
    ...Wash.settings,
    ...Feedbin.authSettings,
    query: flags.string({
      required: true,
      description: "the search query"
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
      const search = searches.find(s => s.query === this.config.query);
      if (search) {
        this.searchId = search.id;
      }
    }

    if (!this.searchId) {
      // We didn't find a saved search, so make one
      res = await Shared.queueHttp(this, undefined, {
        url: `${Feedbin.api}/saved_searches.json`,
        responseType: "json",
        method: "POST",
        auth: {
          username: this.config.username,
          password: this.config.password
        },
        headers: { "Content-Type": "application/json; charset=utf-8" },
        data: JSON.stringify({
          name: this.config.query,
          query: this.config.query
        })
      });
      this.searchId = parseInt(res.headers.location.match(/(\d+)\.json/)[1]);
    }

    if (!this.searchId) {
      await Log.error(this, {
        msg: `couldn't create search`,
        query: this.config.query
      });
      return [];
    }

    // Get the search results
    res = await Shared.queueHttp(this, undefined, {
      url: `${Feedbin.api}/saved_searches/${this.searchId}.json`,
      responseType: "json",
      auth: { username: this.config.username, password: this.config.password }
    });
    const entryIds = res.data as number[];

    // Load the entries
    const data = await Feedbin.getEntries(this, this.config, entryIds);

    // Convert entries to Items
    return Promise.all(data.map(d => this.parseData(d)));
  }

  async parseData(data: any): Promise<Item> {
    const item = await Feedbin.parseData(this, data);

    item.source = {
      image: Feedbin.icon,
      url: Feedbin.url,
      title: `Feedbin: ${this.config.query}`
    };

    return item;
  }
}
