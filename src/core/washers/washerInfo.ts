export class WasherInfo {
  /**
   * A human-readable title for the washer.
   */
  readonly title: string;

  /**
   * A description of what the washer does.
   */
  readonly description: string;

  /**
   * If true, save and restore washer.memory between runs.
   */
  readonly memory: boolean;

  /**
   * If true, the washer cannot be used directly, only inherited from.
   */
  readonly abstract: boolean;

  /**
   * A filter which limits items that Rinse/Dry can process
   */
  readonly filter?: any;

  /**
   * The name of the washer generated from its file path.
   */
  name = "";

  constructor({
    title,
    description,
    abstract = false,
    memory = true,
    filter
  }: {
    title: string;
    description: string;
    memory?: boolean;
    abstract?: boolean;
    filter?: any;
  }) {
    this.title = title;
    this.description = description;
    this.memory = memory;
    this.abstract = abstract;
    this.filter = filter;
  }
}
