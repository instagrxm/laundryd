/* eslint-disable @typescript-eslint/camelcase */
import { OutputFlags } from "@oclif/parser/lib/parse";
import fs from "fs-extra";
import {
  AccountRepositoryCurrentUserResponseUser,
  IgApiClient,
  PostingStoryPhotoOptions
} from "instagram-private-api";
import { StickerBuilder } from "instagram-private-api/dist/sticker-builder";
import path from "path";
import { LoadedItem } from "../../core/item";
import { Log } from "../../core/log";
import { Settings } from "../../core/settings";
import { Dry } from "../../core/washers/dry";
import { WasherInfo } from "../../core/washers/washerInfo";
import { Instagram } from "./instagram";

export class Like extends Dry {
  static readonly info = new WasherInfo({
    title: "Instagram story",
    description: "repost Instagram posts to your story"
  });

  static settings = {
    ...Dry.settings,
    ...Instagram.authSettings,
    filter: Instagram.filterSetting,
    sticker: Settings.boolean({
      default: true,
      description: "whether the story should appear as a sticker"
    })
  };

  config!: OutputFlags<typeof Like.settings>;

  client!: IgApiClient;
  user!: AccountRepositoryCurrentUserResponseUser;
  file!: Buffer;

  async init(): Promise<void> {
    this.client = await Instagram.auth(this, this.config);
    this.user = await this.client.account.currentUser();

    // Could make a setting to use a different background image
    this.file = await fs.readFile(path.join(__dirname, "black.jpg"));
  }

  async run(items: LoadedItem[]): Promise<void> {
    for (const item of items) {
      const mediaId = Instagram.urlToId(item.url);
      const media = item.meta?.carousel_media
        ? item.meta?.carousel_media[0]
        : item.meta;
      const ownerId = item.meta?.user?.pk;

      if (!mediaId || !media || !ownerId) {
        await Log.warn(this, { msg: `couldn't story ${item.url}` });
        continue;
      }

      const options: PostingStoryPhotoOptions = {
        file: this.file,
        stickerConfig: new StickerBuilder()
          .add(
            StickerBuilder.attachmentFromMedia({
              pk: mediaId,
              user: { pk: ownerId }
            }).center()
          )
          .build()
      };

      await this.client.publish.story(options);
    }
  }
}
