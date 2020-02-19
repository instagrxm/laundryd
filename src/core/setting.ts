import { CronTime } from "cron";

export class Setting<T> {
  def?: T;
  description = "";
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
  }): Setting<string> {
    if (!parser) {
      parser = (setting?: any): string | undefined => {
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
  }): Setting<number> {
    if (!parser) {
      parser = (setting?: any): number | undefined => {
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
    def?: CronTime;
    parser?: (setting: any) => CronTime | undefined;
  }): Setting<CronTime> {
    if (!parser) {
      parser = (setting?: any): CronTime | undefined => {
        if (setting === undefined) {
          return def;
        }
        return new CronTime(setting);
      };
    }

    return new Setting<CronTime>({
      description,
      def,
      parser
    });
  }
}
