import { Hook } from "@oclif/config";
import { parse } from "@oclif/parser";
import { Config } from "../../core/config";
import { Log } from "../../core/log";
import { Database } from "../../storage/database";

/**
 * Set up the global Config and Log instances.
 * @param opts options provided by oclif
 */
const hook: Hook<"prerun"> = async opts => {
  const { flags, args } = parse(opts.argv, {
    flags: opts.Command.flags,
    args: opts.Command.args
  });

  await Database.init(flags.mongo);
  Config.init(opts.config);
  Log.init(opts.Command);
};

export default hook;
