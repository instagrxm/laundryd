import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import {
  Handlebars as HB,
  Item,
  Rinse,
  Settings,
  WasherInfo
} from "../../core";

export class Handlebars extends Rinse {
  static readonly info = new WasherInfo({
    title: "format with handlebars",
    description:
      "apply handlebars templates to items that format them differently",
    memory: false
  });

  static templateSetting = (
    description: string
  ): flags.IOptionFlag<HandlebarsTemplateDelegate<any> | undefined> => {
    return flags.build<HandlebarsTemplateDelegate<any>>({
      parse: (input: string) => {
        const template = HB.compile(input);
        template({}); // throw error if the template is bad
        return template;
      },
      description
    })();
  };

  static settings = {
    ...Rinse.settings,
    retain: Settings.retain(-1),
    title: Handlebars.templateSetting("format an item's title field"),
    text: Handlebars.templateSetting("format an item's text field"),
    html: Handlebars.templateSetting("format an item's html field"),
    summary: Handlebars.templateSetting("format an item's summary field")
  };

  config!: OutputFlags<typeof Handlebars.settings>;

  async run(items: Item[]): Promise<Item[]> {
    return items.map(i => this.renderItem(i));
  }

  renderItem(item: Item): Item {
    if (item.title && this.config.title) {
      item.title = this.config.title(item);
    }

    if (item.text && this.config.text) {
      item.text = this.config.text(item);
    }

    if (item.html && this.config.html) {
      item.html = this.config.html(item);
    }

    if (item.summary && this.config.summary) {
      item.summary = this.config.summary(item);
    }

    return item;
  }
}
