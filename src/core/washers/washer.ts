import { Setting } from "../setting";

export class Washer {
  static readonly source: string;
  static readonly title: string;
  static readonly description: string;
  static readonly help: string;

  static settings = {
    id: Setting.string({
      description: "a unique identifier for this washer"
    })
  };

  readonly id: string;

  readonly memory: object;

  constructor(settings: any = {}, memory: any = {}) {
    if (this.constructor === Washer) {
      throw new Error("don't instantiate Washer directly, use Wash/Rinse/Dry");
    }

    const id = Washer.settings.id.parse(settings.id);
    if (!id) {
      throw new Error("missing id");
    }
    this.id = id;

    this.memory = memory;
  }

  protected init(settings: any = {}) {}

  private loadMemory(): object {
    return {};
  }
}
