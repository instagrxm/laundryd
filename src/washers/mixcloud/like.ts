import { OutputFlags } from "@oclif/parser/lib/parse";
import { Dry, LoadedItem, Settings, WasherInfo } from "../../core";
import { Mixcloud } from "./mixcloud";

export class Like extends Dry {
  static readonly info = new WasherInfo({
    title: "like Mixcloud shows",
    description: "like Mixcloud shows"
  });

  static settings = {
    ...Dry.settings,
    ...Mixcloud.authSettings,
    filter: Mixcloud.filterSetting,
    state: Settings.boolean({
      default: true,
      description: "false to unlike the show"
    })
  };

  config!: OutputFlags<typeof Like.settings>;

  async run(items: LoadedItem[]): Promise<void> {
    for (const item of items) {
      await Mixcloud.showAction(this, item);
    }
  }
}
