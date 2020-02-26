import { flags } from "@oclif/command";
import { CronTime } from "cron";

export const SharedFlags = {
  mongo: (): flags.IOptionFlag<string | undefined> => {
    return flags.string({
      required: true,
      description: "mongodb connection string",
      default: "mongodb://localhost:27017/laundry"
    });
  },

  retain: (def = 0): flags.IOptionFlag<number | undefined> => {
    return flags.integer({
      default: def,
      parse: (input: string) => Math.round(parseFloat(input)),
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

  files: (): flags.IOptionFlag<string | undefined> => {
    return flags.string({
      required: true,
      default: "OS cache dir",
      env: "LAUNDRY_FILES",
      description:
        "where to store downloaded files, either a local path or an s3:// location"
    });
  },

  fileUrl: (): flags.IOptionFlag<string | undefined> => {
    return flags.string({
      required: true,
      default: "http://localhost:3000/files",
      env: "LAUNDRY_URL",
      description: "a URL which maps to the file location"
    });
  },

  downloadPool: (def = 0): flags.IOptionFlag<number | undefined> => {
    return flags.integer({
      required: true,
      default: 5,
      env: "LAUNDRY_DOWNLOAD_POOL",
      hidden: true,
      description: "how many downloads to perform simultaneously"
    });
  }
};
