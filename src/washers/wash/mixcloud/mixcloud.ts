import Autolinker from "autolinker";
import { DateTime } from "luxon";
import path from "path";
import { Item } from "../../../core/item";
import { Wash } from "../../../core/washers/wash";
import { Download, DownloadResult } from "../../../storage/download";

export class Mixcloud extends Wash {
  static readonly abstract: boolean = true;

  static flags = {
    ...Wash.flags
  };

  api = "https://api.mixcloud.com";

  async getUserShows(user: string, since: DateTime): Promise<Item[]> {
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

    // Shows don't include descriptions until you request them separately.
    for (const d of data) {
      const response = await this.http.request({
        url: `${this.api}${d.key}`
      });
      d.text = response.data.description;
      d.html = response.data.description
        .replace(/\n{2,}/g, "</p><p>")
        .replace(/\n/g, "<br>");
      d.html = `<p>${d.html}</p>`;
      d.html = Autolinker.link(d.html, { newWindow: false });
    }

    return data.map(d => this.parseShow(d));
  }

  parseShow(show: any): Item {
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
          item.image = path.join(result.dir, result.image);
        }

        if (result.media) {
          item.media = {
            file: path.join(result.dir, result.media),
            size: result.size as number,
            type: result.type as string
          };
        }
      })
    ];

    return item;
  }
}
