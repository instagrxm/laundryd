import { OutputFlags } from "@oclif/parser/lib/parse";
import { createCanvas, loadImage, registerFont } from "canvas";
import {
  AccountRepositoryCurrentUserResponseUser,
  IgApiClient,
  PostingStoryPhotoOptions,
  SavedFeedResponseCarouselMediaItem,
  SavedFeedResponseMedia,
} from "instagram-private-api";
import { StickerBuilder } from "instagram-private-api/dist/sticker-builder";
import path from "path";
import { Dry, Item, Log, WasherInfo } from "../../core";
import { Instagram } from "./instagram";

export class Like extends Dry {
  static readonly info = new WasherInfo({
    title: "Instagram story",
    description: "repost Instagram posts to your story",
    filter: Instagram.filter,
  });

  static settings = {
    ...Dry.settings,
    ...Instagram.authSettings,
  };

  config!: OutputFlags<typeof Like.settings>;

  client!: IgApiClient;
  user!: AccountRepositoryCurrentUserResponseUser;

  assetPath = path.join(__dirname, "assets");

  async init(): Promise<void> {
    this.client = await Instagram.auth(this, this.config);
    this.user = await this.client.account.currentUser();

    // https://fonts.google.com/specimen/Inter
    registerFont(`${this.assetPath}/Inter-Regular.ttf`, {
      family: "laundry",
    });

    registerFont(`${this.assetPath}/Inter-Bold.ttf`, {
      family: "laundry-bold",
    });
  }

  async run(items: Item[]): Promise<void> {
    for (const item of items) {
      await this.postStory(item);
    }
  }

  /**
   * Post a laundry item sourced from Instagram as a story
   * @param item the laundry item
   */
  async postStory(item: Item): Promise<void> {
    const mediaId = Instagram.urlToId(item.url);

    // If this is an IG post saved by laundry, use the saved data.
    let post = item.meta as SavedFeedResponseMedia;
    if (mediaId) {
      // Otherwise, look up the post based on its URL.
      const res = await this.client.media.info(mediaId);
      if (res.num_results && res.items && res.items.length) {
        post = (res.items[0] as unknown) as SavedFeedResponseMedia;
      }
    }

    const media = (post.carousel_media
      ? post.carousel_media[0]
      : post) as SavedFeedResponseCarouselMediaItem;
    const ownerId = post.user?.pk;

    if (!mediaId || !post || !media || !ownerId) {
      await Log.warn(this, { msg: `couldn't story ${item.url}` });
      return;
    }

    const { image, width, height } = await this.buildImage(post, media);

    const options: PostingStoryPhotoOptions = {
      file: image,
      stickerConfig: new StickerBuilder()
        .add(
          StickerBuilder.attachmentFromMedia(
            { pk: mediaId, user: { pk: ownerId } },
            { width, height }
          ).center()
        )
        .build(),
    };

    await this.client.publish.story(options);
  }

  /**
   * Create a bitmap image resembling the native sticker created by the IG mobile app.
   */
  private async buildImage(
    post: SavedFeedResponseMedia,
    media: SavedFeedResponseCarouselMediaItem
  ): Promise<{ image: Buffer; width: number; height: number }> {
    // Parse the media object
    const caption = post.caption?.text || "";
    const imageVersion = media.image_versions2.candidates[0];
    const imageW = imageVersion.width;
    const imageH = imageVersion.height;
    const imageUrl = imageVersion.url;
    const avatarUrl = post.user.profile_pic_url;
    const username = post.user.username;

    // General layout
    const screenW = 1080;
    const screenH = 1920;
    const radius = 42;
    const screenMargin = 69;
    const stickerMargin = 24;
    const fontSize = 34;

    // Header layout
    const headerH = 126;
    const avatarSize = 80;
    const usernameX = 128;
    const usernameY = 75;

    // Footer layout
    const footerH = caption ? 126 : 0;
    const captionB = [71, 30];

    const canvas = createCanvas(screenW, screenH);
    const ctx = canvas.getContext("2d");

    // Image background
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, screenW, screenH);

    // Size of the sticker
    const stickerW = screenW - screenMargin * 2;
    const stickerH = imageH * (stickerW / imageW) + headerH + footerH;

    // Set the origin to the top left of the sticker
    ctx.translate(screenMargin, (screenH - stickerH) / 2);

    // Rounded rect background
    ctx.fillStyle = "white";
    this.roundRect(ctx, 0, 0, stickerW, stickerH, radius);

    // Header: avatar
    // Square image clipped to a circle
    const avatar = createCanvas(avatarSize, avatarSize);
    const avatarCtx = avatar.getContext("2d");
    avatarCtx.drawImage(
      await loadImage(avatarUrl),
      0,
      0,
      avatarSize,
      avatarSize
    );
    avatarCtx.globalCompositeOperation = "destination-in";
    const r = avatarSize / 2;
    avatarCtx.arc(r, r, r, 0, 2 * Math.PI, false);
    avatarCtx.fill();
    ctx.drawImage(avatar, stickerMargin, stickerMargin, avatarSize, avatarSize);

    // Header: username
    ctx.fillStyle = "black";
    ctx.font = `${fontSize}px laundry-bold`;
    ctx.fillText(username, usernameX, usernameY);

    // Post image
    const image = await loadImage(imageUrl);
    ctx.drawImage(image, 0, headerH, stickerW, stickerH - headerH - footerH);

    // Caption: username
    ctx.fillText(
      caption ? username : "",
      stickerMargin,
      stickerH - captionB[0]
    );
    const usernameW = ctx.measureText(`${username} `).width;
    ctx.font = `${fontSize}px laundry`;

    // Caption: line 1
    // Draw as many whole words as can fit between the username and the end
    const words = caption.replace(/[\r\n]+/gm, " ").split(/\s+/g);
    let count = 0;
    let max = stickerW - usernameW - stickerMargin * 2;
    while (
      count < words.length &&
      ctx.measureText(words.slice(0, count).join(" ")).width < max
    ) {
      count++;
    }

    if (count !== words.length) {
      count--;
    }

    ctx.fillText(
      words.slice(0, count).join(" "),
      stickerMargin + usernameW,
      stickerH - captionB[0]
    );

    // Caption: line 2
    // Draw as many characters as can fit on the second line
    const line = words.slice(count, words.length).join(" ");
    count = 0;
    max = stickerW - stickerMargin * 2;
    while (
      count < line.length &&
      ctx.measureText(line.substring(0, count)).width < max
    ) {
      count++;
    }

    if (count === line.length) {
      ctx.fillText(line, stickerMargin, stickerH - captionB[1]);
    } else {
      ctx.fillText(
        `${line.substring(0, count - 3)}…`,
        stickerMargin,
        stickerH - captionB[1]
      );
    }

    if (media.video_versions) {
      // Video icon
      const play = await loadImage(`${this.assetPath}/play.png`);
      ctx.drawImage(
        play,
        stickerW - stickerMargin - play.width,
        headerH + stickerMargin,
        play.width,
        play.height
      );
    } else if (post.carousel_media_count && post.carousel_media_count > 1) {
      // Carousel icon
      const slides = await loadImage(`${this.assetPath}/slides.png`);
      ctx.drawImage(
        slides,
        stickerW - stickerMargin - slides.width,
        headerH + stickerMargin,
        slides.width,
        slides.height
      );
    }

    return {
      image: canvas.toBuffer("image/jpeg"),
      width: stickerW / screenW,
      height: stickerH / screenH,
    };
  }

  /**
   * Draw a rounded rectangle with the current fill/stroke style.
   */
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius = 5
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}
