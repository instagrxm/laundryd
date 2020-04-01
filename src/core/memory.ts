import { DateTime } from "luxon";
import { WasherId } from ".";

/**
 * State that's maintained for a washer between runs.
 */
export interface Memory {
  [key: string]: any;

  washer: WasherId;

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
  config: any;
}
