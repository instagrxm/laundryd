import { OutputFlags } from "@oclif/parser/lib/parse";
import {
  AccountRepositoryCurrentUserResponseUser,
  IgApiClient,
  LikeModuleInfoOption
} from "instagram-private-api";
import { Dry, Item, Log, Settings, WasherInfo } from "../../core";
import { Instagram } from "./instagram";

export class Like extends Dry {
  static readonly info = new WasherInfo({
    title: "Instagram like",
    description: "like Instagram posts",
    filter: Instagram.filter
  });

  static settings = {
    ...Dry.settings,
    ...Instagram.authSettings,
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

  async run(items: Item[]): Promise<void> {
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

      await Log.debug(this, {
        msg: this.config.state ? "like" : "unlike",
        url: item.url
      });
      if (this.config.state) {
        await this.client.media.like({ mediaId, moduleInfo, d: 1 });
      } else {
        await this.client.media.unlike({ mediaId, moduleInfo });
      }
    }
  }
}
