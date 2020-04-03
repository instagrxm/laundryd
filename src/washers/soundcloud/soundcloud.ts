import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import { AxiosRequestConfig, AxiosResponse } from "axios";
import { DateTime } from "luxon";
import path from "path";
import querystring from "querystring";
import {
  Config,
  Download,
  DownloadResult,
  Item,
  Log,
  Shared,
  Wash,
  Washer,
} from "../../core";

export class SoundCloud {
  static icon =
    "https://a-v2.sndcdn.com/assets/images/sc-icons/ios-a62dfc8fe7.png";

  static api = "https://api.soundcloud.com";

  static urlPattern = /^http(s)?:\/\/(www.)?soundcloud.com/i;

  static url = "https://soundcloud.com";

  static filter = {
    url: { $regex: "^http(s)?:\\/\\/(www.)?soundcloud.com", $options: "i" },
  };

  static authSettings = {
    clientId: flags.string({
      required: true,
      description:
        "the client ID for the SoundCloud application, which can be created at https://soundcloud.com/you/apps",
    }),

    clientSecret: flags.string({
      required: true,
      description: "the client secret for the SoundCloud application",
    }),

    code: flags.string({
      hidden: true,
      description: "the oauth code used to get an access token",
    }),

    token: flags.string({
      description: "the access token for the SoundCloud API",
    }),
  };

  static querySettings = {
    minDuration: flags.integer({
      description: "Only get tracks longer than this many minutes",
    }),
    maxDuration: flags.integer({
      description: "Only get tracks shorter than this many minutes",
    }),
  };

  /**
   * Authorize against the SoundCloud API and return information about the user
   * https://developers.soundcloud.com/docs/api/reference#token
   * @param washer the washer that is making the request
   * @param auth auth settings
   */
  static async auth(
    washer: Washer,
    auth: OutputFlags<typeof SoundCloud.authSettings>
  ): Promise<any> {
    const [user, repo] = Config.config.pjson.repository.split("/");
    // Using the old redirect URL because SoundCloud apps are no longer editable.
    const redirectUrl =
      "https://endquote.github.io/laundry/callbacks/soundcloud.html";
    const params = querystring.stringify({
      client_id: auth.clientId,
      client_secret: auth.clientSecret,
      redirect_uri: redirectUrl,
      response_type: "code",
      scope: "non-expiring",
    });
    const authUrl = `https://soundcloud.com/connect?${params}`;

    if (auth.code) {
      const res = await SoundCloud.callAPI(washer, {
        url: "https://api.soundcloud.com/oauth2/token",
        method: "POST",
        params: {
          client_id: auth.clientId,
          redirect_uri: redirectUrl,
          client_secret: auth.clientSecret,
          grant_type: "authorization_code",
          code: auth.code,
        },
      });
      const t = res.data.access_token;
      if (t) {
        await Log.error(washer, {
          msg: `Token acquired. Use --token=${t} or set SOUNDCLOUD_TOKEN for this washer.`,
        });
      }
    }

    if (!auth.token) {
      await Log.error(washer, {
        msg: `You don't have an access token. Go to this URL in a browser:\n${authUrl} \n\nThen run the washer again with --code=[code]`,
      });
    }

    // Get the user's profile info.
    if (auth.token) {
      const me = await SoundCloud.callAPI(washer, {
        url: `${SoundCloud.api}/me/`,
        params: { oauth_token: auth.token },
      });
      return me.data;
    }
  }

  /**
   * Queue a request to the SoundCloud API, handling rate limits as needed.
   * @param washer the washer making the request
   * @param config the request configuration
   */
  static async callAPI(
    washer: Washer,
    config: AxiosRequestConfig
  ): Promise<AxiosResponse<any>> {
    // @ts-ignore: token doesn't exist on all washers
    const queueName = washer.config.token;
    return await Shared.queueHttp(washer, queueName, config);
  }

  /**
   * Get tracks from a specific user.
   * @param washer the washer that is making the request
   * @param auth auth settings
   * @param query query settings
   * @param userId the userid to get tracks for
   */
  static async getUserTracks(
    washer: Wash,
    auth: OutputFlags<typeof SoundCloud.authSettings>,
    query: OutputFlags<typeof SoundCloud.querySettings>,
    userId: number
  ): Promise<Item[]> {
    // Set up the first request.
    // https://developers.soundcloud.com/docs/api/reference#tracks
    const req: AxiosRequestConfig = {
      url: `${SoundCloud.api}/users/${userId}/tracks/`,
      params: { client_id: auth.clientId, limit: 50, linked_partitioning: 1 },
    };

    if (query.minDuration) {
      req.params["duration[from]"] = query.minDuration * 1000 * 60;
    }

    if (query.maxDuration) {
      req.params["duration[to]"] = query.maxDuration * 1000 * 60;
    }

    const data = await SoundCloud.getTrackList(washer, req);

    return Promise.all(data.map((d) => SoundCloud.parseData(washer, d)));
  }

  /**
   * Request an API that returns a track list, navigate its pages and filter old tracks.
   * @param washer the washer making the request
   * @param req a request configured to retrieve a track list
   */
  static async getTrackList(
    washer: Wash,
    req: AxiosRequestConfig
  ): Promise<any[]> {
    let data: any[] = [];
    while (true) {
      const res = await SoundCloud.callAPI(washer, req);

      const found = [];
      for (const track of res.data.collection) {
        const taken = DateTime.fromJSDate(new Date(track.created_at));
        const old = taken.diff(washer.memory.lastRun, "days").days <= 0;
        if (!old) {
          found.push(track);
        }
      }
      data = data.concat(found);

      if (
        !res.data.collection.length ||
        !res.data.next_href ||
        found.length < res.data.collection.length
      ) {
        break;
      }

      req.url = res.data.next_href;
    }

    return data;
  }

  static htmlTemplate = Shared.loadTemplate(
    path.join(__dirname, "template.hbs")
  );

  /**
   * Convert a raw API object into an Item.
   * @param data the track object from the API
   */
  static async parseData(washer: Wash, data: any): Promise<Item> {
    const item = Shared.createItem(
      data.permalink_url,
      DateTime.fromJSDate(new Date(data.created_at)).toUTC(),
      washer
    );

    item.title = data.title;
    item.text = data.description;
    item.html = SoundCloud.htmlTemplate(data);
    item.meta = data;

    // https://developers.soundcloud.com/docs/api/reference#oembed
    const res = await SoundCloud.callAPI(washer, {
      url: "https://soundcloud.com/oembed",
      params: { format: "json", url: item.url },
    });

    item.embed = res.data.html;

    if (!washer.config.download) {
      item.html = `${item.html}${item.embed}`;
    }

    if (data.tag_list) {
      // Tag list: yous truly r "ritual union" little dragon man live sweden gothenburg
      let list = data.tag_list + "";
      let tags: string[] = [];
      const spaced = list.match(/"[^"]+"/g);
      if (spaced) {
        spaced.forEach((t) => {
          list = list.replace(t, "");
          tags.push(t.replace(/"/g, "").trim());
        });
      }
      tags = tags.concat(list.split(/\s+/));
      item.tags = tags;
    }

    if (data.user) {
      item.author = data.user.username;
      item.source = {
        title: data.user.username,
        image: data.user.avatar_url.replace("large.jpg", "t500x500.jpg"),
        url: data.user.permalink_url,
      };
    }

    item.downloads = [
      Download.audio(item, item.url, (result: DownloadResult) => {
        if (result.image) {
          item.image = `${result.url}/${result.image}`;
          if (item.meta) {
            item.meta.artwork_url = item.image;
          }
        }

        if (result.media) {
          item.media = {
            file: `${result.url}/${result.media}`,
            size: result.size as number,
            type: result.type as string,
            duration: Math.ceil(data.duration / 1000 / 60),
          };
        }
      }),
    ];

    return item;
  }
}
