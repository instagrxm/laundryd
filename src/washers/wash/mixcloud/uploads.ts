import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import { Config } from "../../../core/config";
import { Item } from "../../../core/item";
import { Log } from "../../../core/log";
import { Mixcloud } from "./mixcloud";

export default class Uploads extends Mixcloud {
  static readonly abstract: boolean = false;
  static readonly title: string = "wash/mixcloud/uploads";
  static readonly description: string =
    "load new uploads from everyone you're following on Mixcloud";

  static settings = {
    ...Mixcloud.settings,

    clientId: flags.string({
      description:
        "the client id for the Mixcloud application, which can be created at https://www.mixcloud.com/developers/create/\n(env: MIXCLOUD_CLIENTID)",
      env: "MIXCLOUD_CLIENTID",
      required: true
    }),

    clientSecret: flags.string({
      description:
        "the client secret for the Mixcloud application\n(env: MIXCLOUD_CLIENTSECRET)",
      env: "MIXCLOUD_CLIENTSECRET",
      required: true
    }),

    token: flags.string({
      description:
        "the access token for the Mixcloud API\n(env: MIXCLOUD_TOKEN)",
      env: "MIXCLOUD_TOKEN"
    }),

    code: flags.string({
      description: "the oauth code used to get an access token",
      hidden: true
    })
  };

  config!: OutputFlags<typeof Uploads.settings>;

  protected me!: any;

  async init(): Promise<void> {
    await super.init();
    await this.auth();
  }

  async auth(): Promise<void> {
    const [user, repo] = Config.config.pjson.repository.split("/");
    const redirectUrl = encodeURIComponent(
      `https://${user}.github.io/${repo}/auth/mixcloud.html`
    );
    const authUrl = `https://www.mixcloud.com/oauth/authorize?client_id=${this.config.clientId}&redirect_uri=${redirectUrl}`;

    if (this.config.code) {
      const url = `https://www.mixcloud.com/oauth/access_token?client_id=${this.config.clientId}&redirect_uri=${redirectUrl}&client_secret=${this.config.clientSecret}&code=${this.config.code}`;
      const response = await this.http.request({ url });
      const t = response.data.access_token;
      if (t) {
        await Log.error(this, {
          msg: `Token acquired. Use --token=${t} or set MIXCLOUD_TOKEN for this command.`
        });
      }
    }

    if (!this.config.token) {
      await Log.error(this, {
        msg: `You don't have an access token. Go to this URL in a browser:\n${authUrl} \n\nThen run the command again with --code=[code]`
      });
    }
  }

  async run(): Promise<Item[]> {
    // Get the user's profile info.
    this.me = await this.http.request({
      url: `${this.api}/me/`,
      // eslint-disable-next-line @typescript-eslint/camelcase
      params: { access_token: this.config.token, metadata: 1 }
    });

    // Set up the first request.
    const req = {
      url: this.me.data.metadata.connections.following,
      // eslint-disable-next-line @typescript-eslint/camelcase
      params: { access_token: this.config.token, limit: 50 }
    };

    // Get a paged list of people they're following.
    let data: any[] = [];
    while (true) {
      const response = await this.http.request(req);

      for (const user of response.data.data) {
        // Pass each user to the user command.
        const shows = await this.getUserShows(
          user.username,
          this.memory.lastRun
        );
        data = data.concat(shows);
      }

      if (
        !response.data.data.length ||
        !response.data.paging ||
        !response.data.paging.next
      ) {
        break;
      }

      req.url = response.data.paging.next;
    }

    return data.map(d => this.parseShow(d));
  }

  parseShow(data: any): Item {
    const item = super.parseShow(data);

    // Parse data the same as the user command, but change the feed source attributes.
    // item.sourceImage = this.me.data.pictures.extra_large;
    item.source = {
      image: "https://www.mixcloud.com/media/images/www/global/favicon-64.png",
      url: this.me.data.url,
      title: "Mixcloud - New Shows"
    };

    return item;
  }
}
