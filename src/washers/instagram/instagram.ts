/* eslint-disable @typescript-eslint/camelcase */
import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import { HashtagMatch } from "autolinker";
import IgIds from "instagram-id-to-url-segment";
import {
  IgApiClient,
  LikedFeed,
  LikedFeedResponseItemsItem,
  LocationFeed,
  LocationFeedResponseMedia,
  SavedFeed,
  SavedFeedResponseMedia,
  TagsFeed,
  TagsFeedResponseMedia,
  TimelineFeed,
  TimelineFeedResponseMedia_or_ad,
  UserFeed,
  UserFeedResponseItemsItem
} from "instagram-private-api";
import { DateTime } from "luxon";
import { Download, DownloadResult } from "../../core/download";
import { Handlebars, InstagramLinker } from "../../core/formatting";
import { Item } from "../../core/item";
import { Log } from "../../core/log";
import { Settings } from "../../core/settings";
import { Shared } from "../../core/washers/shared";
import { Wash } from "../../core/washers/wash";
import { Washer } from "../../core/washers/washer";

// An alias for the many feed types
export type IgFeed =
  | LikedFeed
  | LocationFeed
  | SavedFeed
  | TagsFeed
  | TimelineFeed
  | UserFeed;

// An alias for the responses from all the feeds
export type IgFeedItem =
  | LikedFeedResponseItemsItem
  | LocationFeedResponseMedia
  | SavedFeedResponseMedia
  | TagsFeedResponseMedia
  | TimelineFeedResponseMedia_or_ad
  | UserFeedResponseItemsItem;

export class Instagram {
  // The biggest favicon
  static icon =
    "https://www.instagram.com/static/images/ico/apple-touch-icon-180x180-precomposed.png/c06fdb2357bd.png";

  // The URL to the site
  static url = "https://instagram.com";

  static urlPattern = /^http(s)?:\/\/(www.)?instagram.com/i;

  // Settings used by all washers to auth
  static authSettings = {
    username: flags.string({
      required: true,
      description: "Instagram username"
    }),

    password: flags.string({
      required: true,
      description: "Instagram password"
    }),

    code: flags.string({
      description: "the challenge code sent for login"
    })
  };

  // Because feeds aren't chronological, you can't specify how many days back to load.
  static beginSetting = flags.integer({
    default: 0,
    description:
      "the number of past items to load in the first run, 0 to load all"
  });

  static filterSetting = Settings.filter({
    url: {
      $regex: Instagram.urlPattern
    }
  });

  private static clients: Record<string, IgApiClient> = {};

  /**
   * Return an authorized Instagram client.
   * @param washer the washer making the request
   * @param auth the authorization settings
   */
  static async auth(
    washer: Washer,
    auth: OutputFlags<typeof Instagram.authSettings>
  ): Promise<IgApiClient> {
    if (Instagram.clients[auth.username]) {
      return Instagram.clients[auth.username];
    }

    const client = new IgApiClient();
    client.state.generateDevice(auth.username);

    try {
      await client.account.login(auth.username, auth.password);
      process.nextTick(async () => await client.simulate.postLoginFlow());
    } catch (IgCheckpointError) {
      await client.challenge.auto(true);
      if (!auth.code) {
        await Log.error(washer, {
          msg:
            "an auth code should have been emailed to you, add that to the washer config"
        });
      } else {
        await client.challenge.sendSecurityCode(auth.code);
      }
    }

    await client.simulate.postLoginFlow();

    Instagram.clients[auth.username] = client;
    return client;
  }

  /**
   * Query an Instagram feed, returning post objects up until previously seen posts.
   * @param washer the washer making the request
   * @param feed the feed containing the posts
   */
  static async readFeed(washer: Wash, feed: IgFeed): Promise<IgFeedItem[]> {
    const data: IgFeedItem[] = [];

    while (true) {
      const posts = await feed.items();
      let done = !feed.isMoreAvailable();

      for (const post of posts) {
        // Skip ads
        const timelinePost = post as TimelineFeedResponseMedia_or_ad;
        if (timelinePost.ad_id) {
          continue;
        }

        // Limit the number of items loaded on the first run
        if (
          washer.config.begin &&
          !washer.memory.lastId &&
          data.length >= washer.config.begin
        ) {
          done = true;
          break;
        }

        // Skip if we've seen this post before
        if (post.id === washer.memory.lastId) {
          done = true;
          break;
        }

        data.push(post);
      }

      if (done) {
        break;
      }
    }

    if (data.length) {
      washer.memory.lastId = data[0].id;
    }

    return data;
  }

  /**
   * Convert an Instagram post object into an Item.
   * @param washer the washer making the request
   * @param data the post to parse
   */
  static async parseData(washer: Washer, data: IgFeedItem): Promise<Item> {
    const item: Item = {
      url: `https://www.instagram.com/p/${data.code}/`,
      created: DateTime.fromSeconds(data.taken_at),
      meta: data,
      title: data.user.username,
      author: { name: data.user.username },

      // Washers should set source to something that makes sense for them
      source: {
        image: Instagram.icon,
        url: Instagram.url,
        title: "Instagram"
      }
    };

    if (data.caption) {
      // Add caption to title, dryers should truncate this
      item.title += `: ${data.caption.text.replace(/[\r\n]/g, " ")}`;

      item.text = data.caption.text;

      // @ts-ignore: a convenient place to store the html caption
      data.caption.html = InstagramLinker.link(data.caption.text);

      // Parse tags
      item.tags = [];
      const matches = InstagramLinker.parse(data.caption.text);
      for (const match of matches) {
        if (match instanceof HashtagMatch) {
          item.tags.push(match.getHashtag());
        }
      }
    }

    // @ts-ignore: not all posts have locations
    const location = data.location;
    if (location) {
      // Parse location
      item.location = {
        coord: { lat: location.lat, lng: location.lng },
        name: location.name
      };
    }

    // @ts-ignore: not all posts have carousels
    let carousel = data.carousel_media;
    if (!carousel) {
      carousel = [data];
    }

    // Parse media
    item.downloads = [];
    for (const m of carousel) {
      const media: TimelineFeedResponseMedia_or_ad = m;

      if (media.image_versions2) {
        const images = media.image_versions2.candidates;
        images.sort((a, b) => b.width - a.width);
        const image = images[0];
        if (carousel[0] === m) {
          item.image = image.url;
        }
        item.downloads.push(
          Download.direct(item, image.url, (result: DownloadResult) => {
            image.url = `${result.url}/${result.media}`;
            if (carousel[0] === m) {
              item.image = image.url;
            }
            Instagram.buildHtml(item);
          })
        );
      }

      if (media.video_versions) {
        const videos = media.video_versions;
        videos.sort((a, b) => b.width - a.width);
        const video = videos[0];
        item.downloads.push(
          Download.direct(item, video.url, (result: DownloadResult) => {
            video.url = `${result.url}/${result.media}`;
            Instagram.buildHtml(item);
          })
        );
      }
    }

    // Get the embed code
    const embed = await Shared.queueHttp(washer, {
      url: "https://api.instagram.com/oembed/",
      params: { url: item.url, omitscript: true }
    });
    item.embed = embed.data.html;

    Instagram.buildHtml(item);

    return item;
  }

  static htmlTemplate = Handlebars.compile(`
    <div class="laundry-instagram">
    {{#each carousel}}
    <p>
      {{#if this.video_versions}}
      <video controls loop playsinline muted
        src="{{this.video_versions.0.url}}"
        poster="{{this.image_versions2.candidates.0.url}}"
        width="{{this.video_versions.0.width}}"
        height="{{this.video_versions.0.height}}" />
      {{else}}
      <img
        src="{{this.image_versions2.candidates.0.url}}"
        width="{{this.image_versions2.candidates.0.width}}"
        height="{{this.image_versions2.candidates.0.height}}" />
      {{/if}}
    </p>
    {{/each}}
    {{{instagramLinker (breaksToHtml post.caption.text)}}}
    {{~#if post.like_count~}}
    <p>{{toLocaleString post.like_count}} likes
      {{~#each post.top_likers~}}
      {{~#if @first}}: {{/if~}}
      <a href="https://instagram.com/{{this}}">{{this}}</a>
      {{~#unless @last}}, {{/unless~}}
      {{~/each~}}
    </p>
    {{~/if~}}
    {{~#if post.comment_count}}<p>{{toLocaleString post.comment_count}} comments{{#if post.preview_comments}}: {{/if}}</p>{{/if~}}
    {{~#each post.preview_comments}}<p><strong><a href="https://instagram.com/{{this.user.username}}">{{this.user.username}}</a></strong>: {{{instagramLinker this.text}}}</p>{{/each~}}
    </div>
  `);

  static buildHtml(item: Item): string {
    let carousel = {};
    if (item.meta) {
      carousel = item.meta.carousel_media;
      if (!carousel) {
        carousel = [item.meta];
      }
    }

    item.html = Instagram.htmlTemplate({ carousel, post: item.meta });
    return item.html;
  }

  /**
   * Convert an Instagram URL to an internal post id.
   * @param url an instagram URL like https://www.instagram.com/p/B9y8sJkjpD2/
   */
  static urlToId(url: string): string | undefined {
    if (!url.match(Instagram.urlPattern)) {
      return;
    }

    let segment;
    const matches = url.match(/\/p\/(.*)[\/$]/);
    if (matches && matches.length > 1) {
      segment = matches[1];
    }

    if (!segment) {
      return;
    }

    return IgIds.urlSegmentToInstagramId(segment);
  }

  /**
   * Convert an Instagram post ID to a URL
   * @param id the post id, like 1038059720608660215
   */
  static idToUrl(id: string): string {
    const segment = IgIds.instagramIdToUrlSegment(id);
    return `${Instagram.url}/p/${segment}`;
  }
}
