import { Command, flags } from "@oclif/command";
import { Dry } from "../core/washers/dry";
import { Rinse } from "../core/washers/rinse";
import { Wash } from "../core/washers/wash";

export default class Run extends Command {
  static description = "";

  static flags = { config: flags.string() };

  static args = [];

  async run() {
    const { args, flags } = this.parse(Run);

    const s: any = { id: "bar", query: "foo" };
    const w = new Wash(s);
    const r = new Rinse(s);
    const d = new Dry(s);
  }
}
