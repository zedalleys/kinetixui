/**
 * Monitoring models (M3): how old a piece of data is, a battery's policy, the change between two
 * readings, and what a command's feedback says.
 *
 * These are separate dimensions on purpose. A device can be `online` with stale telemetry, `offline`
 * with a reading that is still fresh enough for the product's policy, and of `unknown` connectivity
 * while its last battery reading is known and old. Connectivity (`KinetixConnectivityState`) is about
 * the link; freshness is about one piece of data; neither is derived from the other.
 */
import type { KinetixCommandLifecycleStage } from "./command";

/**
 * How old one piece of data is against the **application's** policy.
 *
 * - `fresh`: dated, and no older than the policy allows.
 * - `stale`: dated, and older than the policy allows. Still a real value; shown as last known.
 * - `unknown`: undated, or no policy was supplied. There is no default timeout: how fresh is fresh is a
 *   property of the device and the product (a soil probe reporting twice a day is not stale at noon).
 */
export type KinetixFreshness = "fresh" | "stale" | "unknown";

export const KINETIX_FRESHNESS_STATES: readonly KinetixFreshness[] = ["fresh", "stale", "unknown"] as const;

/**
 * Battery band boundaries a product may override. Percentages; each band is closed at its upper bound
 * (`critical` is `value <= critical`). The defaults are 10 and 25 (`classifyBatteryLevel`).
 */
export type KinetixBatteryThresholds = {
  critical?: number;
  low?: number;
};

/**
 * The change from a previous reading to the current one. Only produced when both readings exist; a
 * single sample has no change, and an absent previous value is not zero.
 */
export type KinetixReadingDelta = {
  /** `current - previous`. */
  value: number;
  direction: "up" | "down" | "none";
};

/** The tone of a command's feedback. Words carry the meaning; the tone only reinforces it. */
export type KinetixCommandFeedbackTone = "neutral" | "pending" | "success" | "attention";

/** What `describeCommandFeedback` says about one lifecycle. */
export type KinetixCommandFeedback = {
  stage: KinetixCommandLifecycleStage;
  /** A short label: "Requested, not yet confirmed", "Timed out, may still apply". */
  headline: string;
  /** The full sentence, the same one `describeCommandLifecycle` writes. */
  sentence: string;
  tone: KinetixCommandFeedbackTone;
  /** The request is still open. */
  pending: boolean;
  /** The lifecycle allows a retry from here (`canRetryLifecycle`). */
  retryable: boolean;
};
