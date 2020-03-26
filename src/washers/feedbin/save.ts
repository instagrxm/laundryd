/* eslint-disable @typescript-eslint/camelcase */
import { OutputFlags } from "@oclif/parser/lib/parse";
import { LoadedItem } from "../../core/item";
import { Dry } from "../../core/washers/dry";
import { Shared } from "../../core/washers/shared";
import { WasherInfo } from "../../core/washers/washerInfo";
import { Feedbin } from "./feedbin";

export class Save extends Dry {
  static readonly info = new WasherInfo({
    title: "Feedbin save",
    description: "save Feedbin entries"
  });

  static settings = {
    ...Dry.settings,
    ...Feedbin.authSettings
  };

  config!: OutputFlags<typeof Save.settings>;

  async init(): Promise<void> {
    await Feedbin.auth(this, this.config);
  }

  async run(items: LoadedItem[]): Promise<void> {
    for (const item of items) {
      // https://github.com/feedbin/feedbin-api/blob/master/content/pages.md
      await Shared.queueHttp(this, undefined, {
        url: `${Feedbin.api}/pages.json`,
        // Can't delete: https://github.com/feedbin/feedbin-api/issues/44
        method: "POST",
        auth: {
          username: this.config.username,
          password: this.config.password
        },
        headers: { "Content-Type": "application/json; charset=utf-8" },
        data: JSON.stringify({ url: item.url })
      });
    }
  }
}
