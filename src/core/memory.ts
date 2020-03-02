import { OutputFlags } from "@oclif/parser/lib/parse";
import { DateTime } from "luxon";
import { Washer } from "./washers/washer";

/**
 * State that's maintained for a washer between runs.
 */
export interface Memory {
  [key: string]: any;

  /**
   * The last time the washer was run.
   */
  lastRun: DateTime;

  /**
   * How long the last run took, in milliseconds.
   */
  lastDuration: number;

  /**
   * The configuration of the last run.
   */
  config: OutputFlags<typeof Washer.settings>;
}
