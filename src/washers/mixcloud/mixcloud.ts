import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import { AxiosRequestConfig, AxiosResponse } from "axios";
import delay from "delay";
import { DateTime } from "luxon";
import { Config } from "../../core/config";
import { Download, DownloadResult } from "../../core/download";
import { Handlebars } from "../../core/formatting";
import { Item } from "../../core/item";
import { Log } from "../../core/log";
import { Settings } from "../../core/settings";
import { Shared } from "../../core/washers/shared";
import { Wash } from "../../core/washers/wash";
import { Washer } from "../../core/washers/washer";
import { Like } from "./like";
import { Repost } from "./repost";

export class Mixcloud {
  static api = "https://api.mixcloud.com";

  static urlPattern = /^http(s)?:\/\/(www.)?mixcloud.com/i;

  static authSettings = {
    clientId: flags.string({
      required: true,
      description:
        "the client ID for the Mixcloud application, which can be created at https://www.mixcloud.com/developers/create/"
    }),

    clientSecret: flags.string({
      required: true,
      description: "the client secret for the Mixcloud application"
    }),

    token: flags.string({
      description: "the access token for the Mixcloud API"
    }),

    code: flags.string({
      hidden: true,
      description: "the oauth code used to get an access token"
    })
  };

  static filterSetting = Settings.filter({
    url: {
      $regex: Mixcloud.urlPattern
    }
  });

  /**
   * Authorize against the Mixcloud API and return information about the user
   * @param washer the washer that is making the request
   * @param auth auth settings
   */
  static async auth(
    washer: Washer,
    auth: OutputFlags<typeof Mixcloud.authSettings>
  ): Promise<any> {
    const [user, repo] = Config.config.pjson.repository.split("/");
    const redirectUrl = encodeURIComponent(
      `https://${user}.github.io/${repo}/auth/mixcloud.html`
    );
    const authUrl = `https://www.mixcloud.com/oauth/authorize?client_id=${auth.clientId}&redirect_uri=${redirectUrl}`;

    if (auth.code) {
      const url = `https://www.mixcloud.com/oauth/access_token?client_id=${auth.clientId}&redirect_uri=${redirectUrl}&client_secret=${auth.clientSecret}&code=${auth.code}`;
      const response = await Mixcloud.callAPI(washer, { url });
      const t = response.data.access_token;
      if (t) {
        await Log.error(washer, {
          msg: `Token acquired. Use --token=${t} or set MIXCLOUD_TOKEN for this command.`
        });
      }
    }

    if (!auth.token) {
      await Log.error(washer, {
        msg: `You don't have an access token. Go to this URL in a browser:\n${authUrl} \n\nThen run the command again with --code=[code]`
      });
    }

    // Get the user's profile info.
    if (auth.token) {
      const me = await Mixcloud.callAPI(washer, {
        url: `${Mixcloud.api}/me/`,
        // eslint-disable-next-line @typescript-eslint/camelcase
        params: { access_token: auth.token, metadata: 1 }
      });
      return me;
    }
  }

  /**
   * Queue a request to the Mixcloud API, handling rate limits as needed.
   * @param washer the washer making the request
   * @param config the request configuration
   */
  static async callAPI(
    washer: Washer,
    config: AxiosRequestConfig
  ): Promise<AxiosResponse<any>> {
    const retry = async (error: any): Promise<void> => {
      const limited = error.response.data?.error?.type === "RateLimitException";
      let time = parseInt(error.response.headers["retry-after"]);

      if (!limited || isNaN(time)) {
        // This isn't a rate limit error, so throw it
        throw error;
      }

      time = (time + 5) * 1000;
      await Log.debug(washer, { msg: `rate limit delay ${time}ms` });
      await delay(time);
    };

    // @ts-ignore: token doesn't exist on all washers
    const queueName = washer.config.token;

    return await Shared.queueHttp(washer, queueName, config, retry);
  }

  /**
   * Get shows from a specific user.
   * @param washer the washer that is making the request
   * @param user the username to get shows from
   * @param since how far back to request shows for
   */
  static async getUserShows(
    washer: Wash,
    user: string,
    since: DateTime
  ): Promise<Item[]> {
    // Set up the first request.
    const req = {
      url: `${Mixcloud.api}/${user}/cloudcasts/`,
      params: {
        limit: 50,
        since: Math.floor(since.toSeconds())
      }
    };

    // Get a paged list of shows.
    let data: any[] = [];
    while (true) {
      const response = await Mixcloud.callAPI(washer, req);
      data = data.concat(response.data.data);

      if (
        !response.data.data.length ||
        !response.data.paging ||
        !response.data.paging.next
      ) {
        break;
      }

      req.url = response.data.paging.next;
    }

    for (const d of data) {
      await Mixcloud.getShowDescription(washer, d);
    }

    return data.map(d => Mixcloud.parseData(washer, d));
  }

  static htmlTemplate = Handlebars.compile(
    `<div class="laundry-mixcloud">{{{basicLinker (breaksToHtml description)}}}</div>`
  );

  /**
   * Add text/html attributes to a show containing its description.
   * @param washer the washer that is making the request
   * @param show the show to add a description to
   */
  static async getShowDescription(washer: Wash, show: any): Promise<void> {
    const response = await Mixcloud.callAPI(washer, {
      url: `${Mixcloud.api}${show.key}`
    });

    show.text = response.data.description;
    show.html = Mixcloud.htmlTemplate(response.data);
  }

  /**
   * Convert a raw API object into an Item.
   * @param data the show object from the API
   */
  static parseData(washer: Wash, data: any): Item {
    data = data.meta || data;
    const embedFeed = encodeURIComponent(data.key);

    const item: Item = {
      title: data.name,
      text: data.text,
      html: data.html,
      url: data.url,
      created: DateTime.fromJSDate(
        new Date(Date.parse(data.created_time))
      ).toUTC(),
      embed: `<iframe width="100%" height="120" src="https://www.mixcloud.com/widget/iframe/?hide_cover=1&light=1&feed=${embedFeed}" frameborder="0"></iframe>`,
      meta: data
    };

    if (!washer.config.download) {
      item.html = `${item.html}${item.embed}`;
    }

    if (data.tags) {
      item.tags = data.tags
        .map((t: any): string => {
          if (typeof t === "object" && t.name !== undefined) {
            t = t.name;
          }
          return t ? `${t}`.toLowerCase() : "";
        })
        .filter((t: string) => t);
    }

    if (data.user) {
      item.author = data.user.name;
      item.source = {
        title: data.user.name,
        image: data.user.pictures.extra_large,
        url: `https://www.mixcloud.com/${data.user.username}/uploads/`
      };
    }

    item.downloads = [
      Download.audio(item, item.url, (result: DownloadResult) => {
        if (result.image) {
          item.image = `${result.url}/${result.image}`;
        }

        if (result.media) {
          item.media = {
            file: `${result.url}/${result.media}`,
            size: result.size as number,
            type: result.type as string
          };
        }
      })
    ];

    return item;
  }

  // https://www.mixcloud.com/developers/#following-favoriting
  static async showAction(washer: Like | Repost, item: Item): Promise<void> {
    const action = washer instanceof Like ? "favorite" : "repost";

    let url = item.url;

    // Use the API endpoint
    url = url.replace(Mixcloud.urlPattern, Mixcloud.api);

    // Add trailing slash
    if (!url.match(/\/$/)) {
      url += "/";
    }

    // Add action
    url += `${action}/`;

    const req: AxiosRequestConfig = {
      url,
      method: washer.config.state ? "post" : "delete",
      // eslint-disable-next-line @typescript-eslint/camelcase
      params: { access_token: washer.config.token }
    };

    await Mixcloud.callAPI(washer, req);
  }
}
