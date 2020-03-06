import Autolinker from "autolinker";
import { DateTime } from "luxon";
import { Download, DownloadResult } from "../../core/download";
import { Item } from "../../core/item";
import { Wash } from "../../core/washers/wash";
import { WasherInfo } from "../../core/washers/washerInfo";

export class Mixcloud extends Wash {
  static readonly info = new WasherInfo({
    title: "Mixcloud base class",
    description: "get and parse data from mixcloud.com",
    abstract: true
  });

  static settings = {
    ...Wash.settings
  };

  api = "https://api.mixcloud.com";

  /**
   * Get shows from a specific user.
   * @param user the username to get shows from
   * @param since how far back to request shows for
   */
  protected async getUserShows(user: string, since: DateTime): Promise<Item[]> {
    // Set up the first request.
    const req = {
      url: `${this.api}/${user}/cloudcasts/`,
      params: {
        limit: 50,
        since: Math.floor(since.toSeconds())
      }
    };

    // Get a paged list of shows.
    let data: any[] = [];
    while (true) {
      const response = await this.http.request(req);
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
      await this.getShowDescription(d);
    }

    return data.map(d => this.parseShow(d));
  }

  /**
   * Add text/html attributes to a show containing its description.
   * @param show the show to add a description to
   */
  protected async getShowDescription(show: any): Promise<void> {
    const response = await this.http.request({
      url: `${this.api}${show.key}`
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
  protected parseShow(show: any): Item {
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
