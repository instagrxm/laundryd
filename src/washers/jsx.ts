import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import React from "react";
import ReactDOMServer from "react-dom/server";
// @ts-ignore: no types available
import JsxParser from "react-jsx-parser";
import { Item, LoadedItem } from "../core/item";
import { Settings } from "../core/settings";
import { Rinse } from "../core/washers/rinse";
import { WasherInfo } from "../core/washers/washerInfo";

// functions aren't supported https://github.com/TroyAlford/react-jsx-parser/issues/107
// seeking a better method https://stackoverflow.com/questions/60537327/
export class JSX extends Rinse {
  static readonly info = new WasherInfo({
    title: "format JSX",
    description: "apply JSX templates to items that format them differently",
    memory: false
  });

  static settings = {
    ...Rinse.settings,

    retain: Settings.retain(-1),

    title: flags.string({
      description: "format an item's title field"
    }),

    text: flags.string({
      description: "format an item's text field"
    }),

    html: flags.string({
      description: "format an item's html field"
    }),

    summary: flags.string({
      description: "format an item's summary field"
    })
  };

  config!: OutputFlags<typeof JSX.settings>;

  async run(items: LoadedItem[]): Promise<Item[]> {
    return items.map(i => this.renderItem(i));
  }

  renderItem(item: LoadedItem): Item {
    const props = {
      jsx: "",
      renderInWrapper: false,
      bindings: { item }
    };

    if (item.title && this.config.title) {
      props.jsx = this.config.title;
      item.title = ReactDOMServer.renderToStaticMarkup(
        React.createElement(JsxParser, props)
      );
    }

    if (item.text && this.config.text) {
      props.jsx = this.config.text;
      item.text = ReactDOMServer.renderToStaticMarkup(
        React.createElement(JsxParser, props)
      );
    }

    if (item.html && this.config.html) {
      props.jsx = this.config.html;
      item.html = ReactDOMServer.renderToStaticMarkup(
        React.createElement(JsxParser, props)
      );
    }

    if (item.summary && this.config.summary) {
      props.jsx = this.config.summary;
      item.summary = ReactDOMServer.renderToStaticMarkup(
        React.createElement(JsxParser, props)
      );
    }

    return item;
  }
}
