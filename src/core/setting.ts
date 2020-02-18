import { CronJob } from "cron";

export class Setting<T> {
  def?: T;
  description: string = "";
  private parser: (setting: any) => T | undefined;

  constructor({
    def,
    description,
    parser
  }: {
    def?: T;
    description: string;
    parser: (setting: any) => T | undefined;
  }) {
    this.def = def;
    this.description = description;
    this.parser = parser;
  }

  parse(setting: any): T | undefined {
    return this.parser(setting) || this.def;
  }

  static string({
    def,
    description,
    parser
  }: {
    description: string;
    def?: string;
    parser?: (setting: any) => string | undefined;
  }) {
    if (!parser) {
      parser = (setting?: any) => {
        if (setting === undefined) {
          return def;
        }
        return setting + "";
      };
    }

    return new Setting<string>({
      description,
      def,
      parser
    });
  }

  static number({
    def,
    description,
    parser
  }: {
    description: string;
    def?: number;
    parser?: (setting: any) => number | undefined;
  }) {
    if (!parser) {
      parser = (setting?: any) => {
        if (setting === undefined) {
          return def;
        }
        return parseFloat(setting);
      };
    }

    return new Setting<number>({
      description,
      def,
      parser
    });
  }

  static cron({
    def,
    description,
    parser
  }: {
    description: string;
    def?: CronJob;
    parser?: (setting: any) => CronJob | undefined;
  }) {
    if (!parser) {
      parser = (setting?: any) => {
        if (setting === undefined) {
          return def;
        }
        return new CronJob(setting);
      };
    }

    return new Setting<CronJob>({
      description,
      def,
      parser
    });
  }

  static query({
    def,
    description,
    parser
  }: {
    description: string;
    def?: string;
    parser?: (setting: any) => string | undefined;
  }) {
    if (!parser) {
      parser = (setting?: any) => {
        if (setting === undefined) {
          return def;
        }
        return setting + "";
      };
    }

    return new Setting<string>({
      description,
      def,
      parser
    });
  }
}
