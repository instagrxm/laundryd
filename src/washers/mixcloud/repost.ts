import { OutputFlags } from "@oclif/parser/lib/parse";
import { Item } from "../../core/item";
import { Settings } from "../../core/settings";
import { Dry } from "../../core/washers/dry";
import { WasherInfo } from "../../core/washers/washerInfo";
import { Mixcloud } from "./mixcloud";

export class Repost extends Dry {
  static readonly info = new WasherInfo({
    title: "repost Mixcloud shows",
    description: "repost Mixcloud shows",
    filter: Mixcloud.filter
  });

  static settings = {
    ...Dry.settings,
    ...Mixcloud.authSettings,
    state: Settings.boolean({
      default: true,
      description: "false to un-repost the show"
    })
  };

  config!: OutputFlags<typeof Repost.settings>;

  async run(items: Item[]): Promise<void> {
    for (const item of items) {
      await Mixcloud.showAction(this, item);
    }
  }
}
