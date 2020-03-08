import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import Autolinker from "autolinker";
import { DateTime } from "luxon";
import { Config } from "../../core/config";
import { Download, DownloadResult } from "../../core/download";
import { Item } from "../../core/item";
import { Log } from "../../core/log";
import { Washer } from "../../core/washers/washer";

export class Mixcloud {
  static api = "https://api.mixcloud.com";

  static authSettings = {
    clientId: flags.string({
      required: true,
      description:
        "the client id for the Mixcloud application, which can be created at https://www.mixcloud.com/developers/create/"
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
      const response = await washer.http.request({ url });
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
      const me = await washer.http.request({
        url: `${Mixcloud.api}/me/`,
        // eslint-disable-next-line @typescript-eslint/camelcase
        params: { access_token: auth.token, metadata: 1 }
      });
      return me;
    }
  }

  /**
   * Get shows from a specific user.
   * @param washer the washer that is making the request
   * @param user the username to get shows from
   * @param since how far back to request shows for
   */
  static async getUserShows(
    washer: Washer,
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
      const response = await washer.http.request(req);
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

    return data.map(d => Mixcloud.parseShow(d));
  }

  /**
   * Add text/html attributes to a show containing its description.
   * @param washer the washer that is making the request
   * @param show the show to add a description to
   */
  static async getShowDescription(washer: Washer, show: any): Promise<void> {
    const response = await washer.http.request({
      url: `${Mixcloud.api}${show.key}`
    });
    show.text = response.data.description;
    show.html = response.data.description
      .replace(/\n{2,}/g, "</p><p>")
      .replace(/\n/g, "<br>");
    show.html = `<p>${show.html}</p>`;
    show.html = Autolinker.link(show.html, { newWindow: false });
  }

  /**
   * Convert a raw API object into an Item.
   * @param show the show object from the API
   */
  static parseShow(show: any): Item {
    show = show.meta || show;
    const embedFeed = encodeURIComponent(show.key);

    const item: Item = {
      title: show.name,
      text: show.text,
      html: show.html,
      url: show.url,
      created: DateTime.fromJSDate(
        new Date(Date.parse(show.created_time))
      ).toUTC(),
      embed: `<iframe width="100%" height="120" src="https://www.mixcloud.com/widget/iframe/?hide_cover=1&light=1&feed=${embedFeed}" frameborder="0"></iframe>`,
      meta: show
    };

    if (show.tags) {
      item.tags = show.tags
        .map((t: any): string => {
          if (typeof t === "object" && t.name !== undefined) {
            t = t.name;
          }
          return t ? `${t}`.toLowerCase() : "";
        })
        .filter((t: string) => t);
    }

    if (show.user) {
      item.author = show.user.name;
      item.source = {
        title: show.user.name,
        image: show.user.pictures.extra_large,
        url: `https://www.mixcloud.com/${show.user.username}/uploads/`
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
}
