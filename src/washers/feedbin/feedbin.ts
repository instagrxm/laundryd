import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import { AxiosRequestConfig } from "axios";
import clone from "clone";
import { DateTime } from "luxon";
import { Item, Log, Shared, Wash, Washer } from "../../core";

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

  static filter = { "washer.name": { $regex: /^feedbin/ } };

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
    data = clone(data);

    const item = Shared.createItem(
      data.url,
      DateTime.fromISO(data.published),
      washer
    );

    item.title = data.title;
    item.summary = data.summary;
    item.html = data.content;
    item.source = {
      image: Feedbin.icon,
      url: Feedbin.url,
      title: washer.info.title
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

    delete data.summary;
    delete data.content;
    item.meta = data;

    return item;
  }

  /**
   * Encapsulates the logic behind hitting a Feedbin API that uses pagination.
   * @param washer the washer making the request
   * @param config the HTTP options
   */
  static async getPagedList(
    washer: Wash,
    config: AxiosRequestConfig
  ): Promise<any[]> {
    let data: any[] = [];
    let page = 1;
    let pages = 1;

    while (page <= pages) {
      const res = await Shared.queueHttp(washer, undefined, config);
      data = data.concat(res.data);

      if (res.headers.links && pages === 1) {
        // Links looks like:
        // <https://api.feedbin.com/v2/saved_searches/8258.json?page=2>; rel="next", <https://api.feedbin.com/v2/saved_searches/8258.json?page=23>; rel="last"
        // It should appear in every page request, but I found that it would disappear after
        // 6 pages in one test. So instead I parse the "last" link and count up to that, without
        // looking at the header in between.
        // https://github.com/feedbin/feedbin-api/issues/45
        const links: string[] = res.headers.links.split(",");
        const next = links.find(l => l.includes("next"));
        if (next) {
          const match = next.match(/<(.+)>/);
          if (match && match.length) {
            config.url = match[1];
          }
        }

        const last = links.find(l => l.includes("last"));
        if (last) {
          const match = last.match(/page=(\d+)/);
          if (match && match.length) {
            pages = parseInt(match[1]);
          }
        }
      }

      page++;
      if (page > 2) {
        config.url = config.url?.replace(/page=\d+/, `page=${page}`);
      }
    }

    return data;
  }

  /**
   * Load a set of entries from feedbin.
   * https://github.com/feedbin/feedbin-api/blob/master/content/entries.md
   * @param washer the washer making the request
   * @param auth the auth settings
   * @param entryIds an array of entry ids to load
   */
  static async getEntriesById(
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

    data = Feedbin.filterOldEntries(washer, data);

    return data;
  }

  /**
   * Remove entries created before the "begin" setting.
   * @param washer the washer making the request
   * @param entries the entries to filter
   */
  static filterOldEntries(washer: Wash, entries: any[]): any[] {
    if (!washer.config.begin) {
      return entries;
    }

    const now = DateTime.utc();
    entries = entries.filter(
      e =>
        now.diff(DateTime.fromISO(e.created_at).toUTC(), "days").days <=
        washer.config.begin
    );

    return entries;
  }
}
