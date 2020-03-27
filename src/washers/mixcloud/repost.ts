import { OutputFlags } from "@oclif/parser/lib/parse";
import { Dry, LoadedItem, Settings, WasherInfo } from "../../core";
import { Mixcloud } from "./mixcloud";

export class Repost extends Dry {
  static readonly info = new WasherInfo({
    title: "repost Mixcloud shows",
    description: "repost Mixcloud shows"
  });

  static settings = {
    ...Dry.settings,
    ...Mixcloud.authSettings,
    filter: Mixcloud.filterSetting,
    state: Settings.boolean({
      default: true,
      description: "false to un-repost the show"
    })
  };

  config!: OutputFlags<typeof Repost.settings>;

  async run(items: LoadedItem[]): Promise<void> {
    for (const item of items) {
      await Mixcloud.showAction(this, item);
    }
  }
}
