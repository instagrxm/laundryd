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

  static boolean({
    def,
    description,
    parser
  }: {
    description: string;
    def?: boolean;
    parser?: (setting: any) => boolean | undefined;
  }): Setting<boolean> {
    if (!parser) {
      parser = (setting?: any): boolean | undefined => {
        if (setting === undefined) {
          return def;
        }
        return setting ? true : false;
      };
    }

    return new Setting<boolean>({
      description,
      def,
      parser
    });
  }

  static strings({
    def = [],
    description,
    parser
  }: {
    description: string;
    def?: string[];
    parser?: (setting: any) => string[] | undefined;
  }): Setting<string[]> {
    if (!parser) {
      parser = (setting?: any): string[] | undefined => {
        if (setting === undefined) {
          return def;
        }
        return setting;
      };
    }

    return new Setting<string[]>({
      description,
      def,
      parser
    });
  }
}
