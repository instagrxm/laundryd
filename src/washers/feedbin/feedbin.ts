/* eslint-disable @typescript-eslint/camelcase */
import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import clone from "clone";
import { DateTime } from "luxon";
import { Item } from "../../core/item";
import { Log } from "../../core/log";
import { Shared } from "../../core/washers/shared";
import { Wash } from "../../core/washers/wash";
import { Washer } from "../../core/washers/washer";

export class Feedbin {
  static api = "https://api.feedbin.com/v2";

  // The biggest favicon
  static icon =
    "https://assets.feedbin.com/assets/apple-touch-icon-precomposed-74dca373532cc762b726c2f291755fec4e12e27abdd255d99927730dc4430112.png";

  // The URL to the site
  static url = "https://feedbin.com";

  static authSettings = {
    username: flags.string({
      required: true,
      description: "Feedbin username"
    }),

    password: flags.string({
      required: true,
      description: "Feedbin password"
    })
  };

  /**
   * Check a username/password against the authentication API. This isn't stateful,
   * you still need to include the auth in every request.
   * https://github.com/feedbin/feedbin-api/blob/master/content/authentication.md
   * @param washer the washer making the request
   * @param auth the auth settings
   */
  static async auth(
    washer: Washer,
    auth: OutputFlags<typeof Feedbin.authSettings>
  ): Promise<void> {
    try {
      await Shared.queueHttp(washer, undefined, {
        url: `${Feedbin.api}/authentication.json`,
        auth: { username: auth.username, password: auth.password }
      });
    } catch (error) {
      await Log.error(washer, { msg: "auth failed", error: error.message });
    }
  }

  /**
   * Convert a raw API object into an Item.
   * @param data the show object from the API
   */
  static async parseData(washer: Wash, data: any): Promise<Item> {
    // Create an item from the API response
    const item: Item = {
      url: data.url,
      created: DateTime.fromISO(data.published),
      title: data.title,
      summary: data.summary,
      html: data.content,
      source: {
        image: Feedbin.icon,
        url: Feedbin.url,
        title: washer.info.title
      },
      meta: {
        entry_id: data.id,
        feed_id: data.feed_id,
        created_at: data.created_at
      }
    };

    if (data.author) {
      item.author = { name: data.author };
    }

    // Try to get the extracted content for more info
    if (
      data.extracted_content_url &&
      data.extracted_content_url.match(/extract\.feedbin\.com/)
    ) {
      try {
        const extract = await Shared.queueHttp(washer, undefined, {
          url: data.extracted_content_url
        });
        item.html = extract.data.content;
        item.image = extract.data.lead_image_url;
      } catch (error) {
        await Log.warn(washer, {
          msg: "couldn't get extracted content",
          url: item.url
        });
      }
    }

    item.text = Shared.htmlToText(item.html);

    return item;
  }

  static async getEntries(
    washer: Wash,
    auth: OutputFlags<typeof Feedbin.authSettings>,
    entryIds: number[]
  ): Promise<any[]> {
    // IDs don't come back in a useful order, so save them and check against the list so we don't
    // request the same ones again.
    let getEntries = entryIds;
    if (washer.memory.entryIds) {
      getEntries = entryIds.filter(id => !washer.memory.entryIds.includes(id));
    }
    washer.memory.entryIds = clone(entryIds);

    // Request the contents of the entries, 100 at a time
    let data: any[] = [];
    while (getEntries.length) {
      const page = getEntries.splice(0, 100);
      const res = await Shared.queueHttp(washer, undefined, {
        url: `${Feedbin.api}/entries.json`,
        responseType: "json",
        params: { ids: page.join(",") },
        auth: { username: auth.username, password: auth.password }
      });
      data = data.concat(res.data);
    }

    return data;
  }
}
