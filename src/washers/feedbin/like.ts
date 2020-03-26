import { OutputFlags } from "@oclif/parser/lib/parse";
import { LoadedItem } from "../../core/item";
import { Settings } from "../../core/settings";
import { Dry } from "../../core/washers/dry";
import { Shared } from "../../core/washers/shared";
import { WasherInfo } from "../../core/washers/washerInfo";
import { Feedbin } from "./feedbin";

export class Like extends Dry {
  static readonly info = new WasherInfo({
    title: "Feedbin like",
    description: "like Feedbin entries"
  });

  static settings = {
    ...Dry.settings,
    ...Feedbin.authSettings,
    state: Settings.boolean({
      default: true,
      description: "false to unlike the entry"
    })
  };

  config!: OutputFlags<typeof Like.settings>;

  async init(): Promise<void> {
    await Feedbin.auth(this, this.config);
  }

  async run(items: LoadedItem[]): Promise<void> {
    // You can only like items that came from feedbin.
    const ids: number[] = items
      .filter(i => i.meta?.entry_id && i.washerName.match(/^feedbin/))
      .map(i => i.meta?.entry_id);

    // https://github.com/feedbin/feedbin-api/blob/master/content/starred-entries.md
    await Shared.queueHttp(this, undefined, {
      url: `${Feedbin.api}/starred_entries.json`,
      method: this.config.state ? "POST" : "DELETE",
      auth: { username: this.config.username, password: this.config.password },
      headers: { "Content-Type": "application/json; charset=utf-8" },
      data: JSON.stringify({ starred_entries: ids })
    });
  }
}
