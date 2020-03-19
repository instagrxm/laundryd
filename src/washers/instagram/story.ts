/* eslint-disable @typescript-eslint/camelcase */
import { OutputFlags } from "@oclif/parser/lib/parse";
import { IgApiClient, PostingStoryPhotoOptions } from "instagram-private-api";
import { LoadedItem } from "../../core/item";
import { Log } from "../../core/log";
import { Settings } from "../../core/settings";
import { Dry } from "../../core/washers/dry";
import { WasherInfo } from "../../core/washers/washerInfo";
import { Instagram } from "./instagram";

export class Like extends Dry {
  static readonly info = new WasherInfo({
    title: "repost Instagram posts to story",
    description: "repost Instagram posts to story"
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

  async init(): Promise<void> {
    this.client = await Instagram.auth(this, this.config);
  }

  async run(items: LoadedItem[]): Promise<void> {
    const screenW = 1080;
    const screenH = 1920;

    for (const item of items) {
      const id = item.meta?.id;

      if (!id) {
        await Log.warn(this, { msg: `couldn't like ${item.url}` });
        continue;
      }

      let mediaW: number = item.meta?.carousel_items[0].width;
      let mediaH: number = item.meta?.carousel_items[0].height;

      const scale = (screenW - 69 * 2) / mediaW; // 69px on either side by default
      mediaW *= scale;
      mediaH *= scale;

      if (this.config.sticker) {
        mediaH += 128 * 2; // title and caption are each 128px
      }

      // https://github.com/dilame/instagram-private-api/blob/master/examples/upload-story.example.ts
      const options: PostingStoryPhotoOptions = {
        file: Buffer.from([]),
        media: {
          media_id: id,
          is_sticker: this.config.sticker,
          x: (screenW - mediaW) / 2,
          y: (screenH - mediaH) / 2,
          width: mediaW,
          height: mediaH,
          rotation: 0
        }
      };

      await this.client.publish.story(options);
    }
  }
}
