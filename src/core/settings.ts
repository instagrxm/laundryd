import { flags } from "@oclif/command";
import { IBooleanFlag } from "@oclif/parser/lib/flags";
import { CronTime } from "cron";

export const Settings = {
  download: (): IBooleanFlag<boolean> => {
    return flags.boolean({
      default: false,
      allowNo: true,
      description: "whether to download media"
    });
  },

  downloadPool: (def = 0): flags.IOptionFlag<number | undefined> => {
    return flags.integer({
      required: true,
      default: () => {
        const env = process.env.LAUNDRY_DOWNLOAD_POOL;
        if (env) {
          const n = parseInt(env);
          if (!isNaN(n)) {
            return n;
          }
        }
        return 5;
      },
      hidden: true,
      description:
        "how many downloads to perform simultaneously\n(env: LAUNDRY_DOWNLOAD_POOL)"
    });
  },

  retain: (def = 0): flags.IOptionFlag<number | undefined> => {
    return flags.integer({
      required: true,
      default: def,
      description:
        "the number of days to keep items, or 0 to keep forever, or -1 to not keep at all"
    });
  },

  schedule: (
    required = false,
    def?: string
  ): flags.IOptionFlag<string | undefined> => {
    return flags.string({
      default: def,
      required,
      parse: (input: string) => {
        const time = new CronTime(input);
        return input;
      },
      description: "when to run the washer"
    });
  },

  subscribe: (): flags.IOptionFlag<string[] | undefined> => {
    return flags.build<string[]>({
      default: [],
      parse: (input: string) => {
        if (!input || !(typeof input === "string")) {
          throw new Error("missing subscribe");
        }
        return input.split(",");
      },
      description: "listen for items from this washer id"
    })();
  },

  // https://docs.mongodb.com/manual/reference/operator/query/#query-selectors
  filter: (def?: any): flags.IOptionFlag<any | undefined> => {
    return flags.build<any>({
      default: def,
      required: false,
      parse: (input: string) => {
        try {
          return JSON.parse(input);
        } catch (error) {
          throw new Error(`bad filter: ${error.message}`);
        }
      },
      description: "filter incoming items using a mongodb filter query"
    })();
  },

  // Enforce "allowNo" on boolean flags
  // https://oclif.io/docs/flags
  boolean: (options: Partial<IBooleanFlag<boolean>>): IBooleanFlag<boolean> => {
    options.allowNo = true;
    return flags.boolean(options);
  }
};
