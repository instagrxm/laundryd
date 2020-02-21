import util from "util";
import { LoadedItem } from "../core/item";
import { Log, LogLevel } from "../core/log";
import { Setting } from "../core/setting";
import { Settings } from "../core/settings";
import { Dry } from "../core/washers/dry";

export class Stdout extends Dry {
  static readonly title: string = "stdout";

  static settings = {
    ...Dry.settings,

    color: Setting.boolean({
      def: false,
      description: "output in color"
    }),

    level: Setting.string({
      def: "info",
      description: "get this log level and higher"
    })
  };

  color = Stdout.settings.color.def as boolean;
  level = Stdout.settings.level.def as string;
  levels = [Stdout.settings.level.def as string];

  constructor(settings: Settings) {
    super(settings);

    this.color = Stdout.settings.color.parse(settings.color) as boolean;
    this.level = Stdout.settings.level.parse(settings.level) as string;

    const levels = Object.values(LogLevel).map(l => l.toString());
    if (!levels.includes(this.level)) {
      Log.error(this, "invalid level");
    }

    this.levels = levels.slice(levels.indexOf(this.level));
  }

  async run(items: LoadedItem[]): Promise<void> {
    for (const item of items) {
      if (this.levels.includes(item.description)) {
        const json = util.inspect(item, undefined, undefined, this.color);
        process.stdout.write(json + "\n");
      }
    }
  }
}
