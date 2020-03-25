import { OutputFlags } from "@oclif/parser/lib/parse";
import clone from "clone";
import { Item } from "../../core/item";
import { Shared } from "../../core/washers/shared";
import { Wash } from "../../core/washers/wash";
import { WasherInfo } from "../../core/washers/washerInfo";
import { Feedbin } from "./feedbin";

export default class Liked extends Wash {
  static readonly info = new WasherInfo({
    title: "Feedbin likes",
    description: "load posts you've starred on Instagram"
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
    let res = await Shared.queueHttp(this, undefined, {
      url: `${Feedbin.api}/starred_entries.json`,
      responseType: "json",
      auth: { username: this.config.username, password: this.config.password }
    });
    const entryIds = res.data as number[];

    // IDs don't come back in a useful order, so save them and check against the list so we don't
    // request the same ones again.
    let getEntries = entryIds;
    if (this.memory.entryIds) {
      getEntries = entryIds.filter(id => !this.memory.entryIds.includes(id));
    }
    this.memory.entryIds = clone(entryIds);

    // Request the contents of the starred entries, 100 at a time
    let data: any[] = [];
    while (getEntries.length) {
      const page = getEntries.splice(0, 100);
      res = await Shared.queueHttp(this, undefined, {
        url: `${Feedbin.api}/entries.json`,
        responseType: "json",
        params: { ids: page.join(",") },
        auth: { username: this.config.username, password: this.config.password }
      });
      data = data.concat(res.data);
    }

    // Convert entries to Items
    return Promise.all(data.map(d => Feedbin.parseData(this, d)));
  }
}
