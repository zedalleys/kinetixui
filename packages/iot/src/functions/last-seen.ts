import { parseTimestamp, resolveNow } from "./time";

/**
 * Last-seen formatting.
 *
 * Two forms of the same fact: `formatLastSeen` is the shorthand a device row shows (`5m ago`), and
 * `describeLastSeen` is the sentence a screen reader gets (`Last seen 5 minutes ago`). Components
 * render both — the short one visibly, the long one as the accessible label — so the abbreviation is
 * never the only thing available.
 *
 * No `Intl`, no locale data, no date library. The output is English and stable, which is what makes
 * it testable; a product needing other languages passes its own string to the component instead.
 *
 * `now` is injectable on both, and every test does so. Nothing here reads the clock unless asked to.
 */

export type FormatLastSeenOptions = {
  /** Treat this as the current time. Defaults to the real clock. */
  now?: string | Date | number | null;
  /** Shown when there is no usable timestamp. Defaults to `"Never"`. */
  neverLabel?: string;
};

/** Under this, both forms say "just now" rather than counting seconds nobody cares about. */
const JUST_NOW_MS = 45_000;
const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/**
 * Short form: `Just now`, `5m ago`, `2h ago`, `3d ago`, or the never label.
 *
 * A timestamp in the future reads as `Just now`. Clock skew between a device and a server is normal
 * and small, and "in 3 minutes" is never the useful reading of it.
 *
 * Known limitation: the ladder stops at days, so a year-old reading renders `400d ago` rather than
 * `1y ago`. Deliberate — a device last seen 400 days ago is a data-retention question, not a
 * formatting one, and inventing month arithmetic would need the locale rules this avoids.
 */
export function formatLastSeen(value: string | Date | number | null | undefined, options: FormatLastSeenOptions = {}): string {
  const elapsed = elapsedMs(value, options);
  if (elapsed === null) return options.neverLabel ?? "Never";
  if (elapsed < JUST_NOW_MS) return "Just now";
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)}m ago`;
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)}h ago`;
  return `${Math.floor(elapsed / DAY_MS)}d ago`;
}

/**
 * Long form, for accessible labels: `Last seen just now`, `Last seen 5 minutes ago`,
 * `Last seen 2 hours ago`, `Last seen 3 days ago`, `Never seen`.
 */
export function describeLastSeen(value: string | Date | number | null | undefined, options: FormatLastSeenOptions = {}): string {
  const elapsed = elapsedMs(value, options);
  if (elapsed === null) return options.neverLabel ? `Last seen ${options.neverLabel}` : "Never seen";
  if (elapsed < JUST_NOW_MS) return "Last seen just now";
  if (elapsed < HOUR_MS) return `Last seen ${plural(Math.floor(elapsed / MINUTE_MS), "minute")} ago`;
  if (elapsed < DAY_MS) return `Last seen ${plural(Math.floor(elapsed / HOUR_MS), "hour")} ago`;
  return `Last seen ${plural(Math.floor(elapsed / DAY_MS), "day")} ago`;
}

/** Milliseconds since the timestamp, never negative; `null` when there is no usable timestamp. */
export function millisecondsSince(
  value: string | Date | number | null | undefined,
  now?: string | Date | number | null,
): number | null {
  const seen = parseTimestamp(value ?? null);
  if (!seen) return null;
  return Math.max(0, resolveNow(now) - seen.getTime());
}

function elapsedMs(value: string | Date | number | null | undefined, options: FormatLastSeenOptions): number | null {
  return millisecondsSince(value, options.now);
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
