/**
 * Timestamp handling, shared by everything in this module that takes a `string | Date`.
 *
 * Device payloads produce all of: ISO strings, `Date` objects, empty strings, nulls and the string
 * "null". One place decides what each of those means, so that `formatLastSeen`, `detectStaleReading`
 * and the alert helpers cannot disagree about whether a timestamp is real.
 */

/**
 * A usable `Date`, or `null`.
 *
 * `null` for anything that is absent, not a date, or an Invalid Date. Numbers are accepted as epoch
 * milliseconds because that is what a JSON payload from a gateway usually carries.
 */
export function parseTimestamp(value: string | Date | number | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const fromEpoch = new Date(value);
    return Number.isNaN(fromEpoch.getTime()) ? null : fromEpoch;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** `now` as a millisecond stamp, defaulting to the real clock. Every public function takes one so
 *  that time-dependent output is testable without mocking the global clock. */
export function resolveNow(now?: string | Date | number | null): number {
  const parsed = parseTimestamp(now ?? null);
  return parsed ? parsed.getTime() : Date.now();
}
