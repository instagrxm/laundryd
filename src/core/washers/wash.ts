import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import { Item } from "../item";
import { Washer } from "./washer";

export class Wash extends Washer {
  static readonly title: string = "wash";
  static readonly description: string =
    "retrieve data on a schedule and parse it into a normalized format";

  static flags = {
    ...Washer.flags,

    begin: flags.integer({
      default: 0,
      parse: (input: string) => Math.abs(Math.round(parseFloat(input))),
      description: "the number of days of past items to load in the first run"
    }),

    retain: flags.integer({
      default: 0,
      parse: (input: string) => Math.abs(Math.round(parseFloat(input))),
      description: "the number of days to keep items, or 0 to keep forever"
    })
  };

  config!: OutputFlags<typeof Wash.flags>;

  async run(): Promise<Item[]> {
    return [];
  }
}
