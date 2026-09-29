/**
 * Automation formatting and state.
 *
 * `last-seen.ts` deliberately clamps future timestamps to "just now", because a device reporting a
 * time slightly ahead of the server is clock skew and never news. Scheduling is the opposite case: a
 * *next run* is legitimately in the future, and `millisecondsSince` floors at zero, so reusing it
 * here would render tomorrow's irrigation as "just now". Scheduling therefore gets its own
 * two-directional formatter rather than bending one built on a one-directional assumption.
 *
 * Same rules as the rest of `functions/`: React-free, no `Intl`, no locale data, no date library,
 * `now` injectable on everything so output is testable without mocking the clock.
 */

import type { KinetixAutomation, KinetixAutomationStatus } from "../types/automation";
import { parseTimestamp, resolveNow } from "./time";

const SOON_MS = 45_000;
const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

export type RelativeTimeOptions = {
  /** Treat this as the current time. Defaults to the real clock. */
  now?: string | Date | number | null;
  /** Returned when there is no usable timestamp. Defaults to `"Unknown"`. */
  unknownLabel?: string;
};

/**
 * Signed milliseconds from `now` to the timestamp: positive is future, negative is past.
 *
 * Deliberately *not* floored at zero, which is the whole difference between this and
 * `millisecondsSince`. `null` when there is no usable timestamp.
 */
export function millisecondsUntil(
  value: string | Date | number | null | undefined,
  now?: string | Date | number | null,
): number | null {
  const at = parseTimestamp(value ?? null);
  if (!at) return null;
  return at.getTime() - resolveNow(now);
}

/**
 * Short form, both tenses: `in 4h`, `5m ago`, `now`.
 *
 * One function for both directions on purpose — a caller formatting an automation's times should not
 * have to know which side of `now` each one falls on, and a schedule that has just slipped past its
 * due time flips from `in 1m` to `1m ago` without the caller doing anything.
 *
 * Lowercase, because every caller composes it into a phrase ("Next run in 4h"). The same ladder and
 * the same day-cap as `formatLastSeen`, for the same reasons.
 */
export function formatRelativeTime(
  value: string | Date | number | null | undefined,
  options: RelativeTimeOptions = {},
): string {
  const delta = millisecondsUntil(value, options.now);
  if (delta === null) return options.unknownLabel ?? "Unknown";
  const magnitude = Math.abs(delta);
  if (magnitude < SOON_MS) return "now";

  const amount =
    magnitude < HOUR_MS
      ? `${Math.floor(magnitude / MINUTE_MS)}m`
      : magnitude < DAY_MS
        ? `${Math.floor(magnitude / HOUR_MS)}h`
        : `${Math.floor(magnitude / DAY_MS)}d`;

  return delta > 0 ? `in ${amount}` : `${amount} ago`;
}

/** Long form, for accessible labels: `in 4 hours`, `5 minutes ago`, `just now`. */
export function describeRelativeTime(
  value: string | Date | number | null | undefined,
  options: RelativeTimeOptions = {},
): string {
  const delta = millisecondsUntil(value, options.now);
  if (delta === null) return options.unknownLabel ?? "Unknown";
  const magnitude = Math.abs(delta);
  if (magnitude < SOON_MS) return "just now";

  const [count, noun] =
    magnitude < HOUR_MS
      ? ([Math.floor(magnitude / MINUTE_MS), "minute"] as const)
      : magnitude < DAY_MS
        ? ([Math.floor(magnitude / HOUR_MS), "hour"] as const)
        : ([Math.floor(magnitude / DAY_MS), "day"] as const);

  const phrase = `${count} ${noun}${count === 1 ? "" : "s"}`;
  return delta > 0 ? `in ${phrase}` : `${phrase} ago`;
}

/**
 * A sentence for an automation's current state, for accessible labels and summaries.
 *
 * `enabled` is separate from `status` because the two disagree in a state worth naming: an
 * automation can be `idle` and disarmed, which reads as "Off", not "Idle".
 */
export function describeAutomationStatus(status: KinetixAutomationStatus, enabled = true): string {
  if (!enabled) return "Off";
  switch (status) {
    case "running":
      return "Running now";
    case "failed":
      return "Last run failed";
    case "disabled":
      return "Off";
    default:
      return "Idle";
  }
}

/**
 * Whether an automation can be triggered by hand right now.
 *
 * `running` is excluded so a second press cannot queue a duplicate run. On a lighting scene that
 * would be cosmetic; on an irrigation valve or a door lock it is not.
 */
export function canRunAutomation(automation: Pick<KinetixAutomation, "status" | "enabled">): boolean {
  return automation.enabled && automation.status !== "running" && automation.status !== "disabled";
}

/**
 * Comparator putting automations that need a human first: failed, then running, then the rest.
 *
 * Returns 0 for everything within a band rather than tie-breaking on name, matching
 * `compareDeviceAttention`: `.sort` is stable in ES2019, so an equal result preserves whatever order
 * the product already chose, and a tiebreak invented here would override it.
 *
 * ```ts
 * const worstFirst = [...automations].sort(compareAutomationAttention);
 * ```
 */
export function compareAutomationAttention(
  a: Pick<KinetixAutomation, "status"> | null | undefined,
  b: Pick<KinetixAutomation, "status"> | null | undefined,
): number {
  return automationAttentionRank(a?.status) - automationAttentionRank(b?.status);
}

function automationAttentionRank(status: KinetixAutomationStatus | undefined): number {
  switch (status) {
    case "failed":
      return 0;
    case "running":
      return 1;
    default:
      return 2;
  }
}
