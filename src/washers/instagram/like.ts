/* eslint-disable @typescript-eslint/camelcase */
import { OutputFlags } from "@oclif/parser/lib/parse";
import {
  AccountRepositoryCurrentUserResponseUser,
  IgApiClient,
  LikeModuleInfoOption
} from "instagram-private-api";
import { LoadedItem } from "../../core/item";
import { Log } from "../../core/log";
import { Settings } from "../../core/settings";
import { Dry } from "../../core/washers/dry";
import { WasherInfo } from "../../core/washers/washerInfo";
import { Instagram } from "./instagram";

export class Like extends Dry {
  static readonly info = new WasherInfo({
    title: "Instagram like",
    description: "like Instagram posts"
  });

  static settings = {
    ...Dry.settings,
    ...Instagram.authSettings,
    filter: Instagram.filterSetting,
    state: Settings.boolean({
      default: true,
      description: "false to unlike the post"
    })
  };

  config!: OutputFlags<typeof Like.settings>;

  client!: IgApiClient;
  user!: AccountRepositoryCurrentUserResponseUser;

  async init(): Promise<void> {
    this.client = await Instagram.auth(this, this.config);
    this.user = await this.client.account.currentUser();
  }

  async run(items: LoadedItem[]): Promise<void> {
    for (const item of items) {
      const mediaId = Instagram.urlToId(item.url);

      if (!mediaId) {
        await Log.warn(this, { msg: `couldn't like ${item.url}` });
        continue;
      }

      const moduleInfo: LikeModuleInfoOption = {
        module_name: "media_view_profile",
        user_id: this.user.pk,
        username: this.user.username
      };

      if (this.config.state) {
        await this.client.media.like({ mediaId, moduleInfo, d: 1 });
      } else {
        await this.client.media.unlike({ mediaId, moduleInfo });
      }
    }
  }
}
