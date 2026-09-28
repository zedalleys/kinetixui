import type { KinetixFirmwareInfo, KinetixFirmwareStatus } from "../types/firmware";

/**
 * Firmware version handling.
 *
 * ## What this comparison is, and is not
 *
 * It compares dot-separated numeric segments, left to right, padding the shorter side with zeros —
 * so `1.2` equals `1.2.0`, and `1.10.0` is newer than `1.9.9`. A leading `v` and surrounding
 * whitespace are ignored, and a trailing non-numeric part (`1.4.0-rc.2`, `2.0.0+build7`) is kept for
 * display but **takes no part in ordering**.
 *
 * That last point is the real limitation: `1.4.0-rc.2` and `1.4.0` compare equal here, where full
 * semver would order the release ahead of its candidate. Device firmware strings in the wild are
 * rarely semver — `1.04`, `2.1.3.7` and `R3.2` all occur — so a strict semver parser would reject
 * more real versions than the loose comparison gets wrong. Nothing in the repository depends on
 * prerelease precedence, and no semver dependency is added for it. A product that ships prerelease
 * firmware and needs that ordering should compare versions itself.
 *
 * Unparseable input is never silently treated as `0.0.0`: the comparison returns `null` and the
 * derived status returns `"unknown"`.
 */

/**
 * Split a version string into its numeric core and whatever follows it.
 *
 * ## Why this is a scan and not a regular expression
 *
 * This was `/^v?(\d+(?:\.\d+)*)(.*)$/i`, and that pattern is a polynomial ReDoS — CodeQL's
 * `js/polynomial-redos`, reported against both of its call sites.
 *
 * The trap is the interaction of the two groups. `.` does not match a newline and `$` without `m`
 * will not match before one in the middle of the string, so a version containing a newline forces the
 * overall match to **fail** — and to fail, the engine must first try every way of dividing the
 * digits-and-dots run between `\d+` and the `(?:\.\d+)*` repetition. Measured on
 * `"0" + ".0".repeat(n) + "\n!"`: 141ms at n=8k, 551ms at 16k, **2.4s at 32k**, quadratic.
 *
 * That input is reachable. `normalizeFirmwareVersion` takes `unknown` straight from a device payload,
 * and a gateway reporting a version with a trailing newline is an ordinary kind of malformed — which
 * is exactly the malformed input this module set out to handle gracefully.
 *
 * A single left-to-right pass has no backtracking to do, so it is linear by construction rather than
 * by argument. The grammar it accepts is unchanged: an optional `v`/`V`, then `digit+ ( "." digit+ )*`,
 * then everything else as the tail. A dot extends the core only when a digit follows it, so `"1."`
 * keeps the `.` in the tail exactly as the regex did.
 *
 * ## One deliberate behaviour change
 *
 * The regex returned `null` for any version containing a newline — `"1.0\nx"` was unparseable — while
 * `"1.0 x"` parsed fine. That difference was not a decision: it fell out of `.` excluding `\n`, the
 * same property that made the pattern quadratic. Two strings of identical shape got different answers
 * depending on which whitespace character separated the core from the junk, and the newline one read as
 * "we cannot tell what version this is" all the way out to `resolveFirmwareStatus`.
 *
 * `null` is documented to mean **no numeric core**, and `"1.0\nx"` has one. So a newline is now tail
 * like any other trailing character: kept for display, ignored for ordering. Asserted both ways in the
 * suite, alongside the space case it is now consistent with.
 */
function splitVersion(input: string): { core: string; tail: string } | null {
  let index = input.charCodeAt(0) === 118 || input.charCodeAt(0) === 86 ? 1 : 0; // v | V
  const start = index;
  let coreEnd = index;
  let sawDigit = false;

  while (index < input.length) {
    const code = input.charCodeAt(index);
    if (code >= 48 && code <= 57) {
      sawDigit = true;
      index += 1;
      coreEnd = index;
      continue;
    }
    // A separator belongs to the core only if a digit follows it; otherwise it starts the tail.
    if (code === 46 && sawDigit) {
      const next = input.charCodeAt(index + 1);
      if (next >= 48 && next <= 57) {
        index += 1;
        continue;
      }
    }
    break;
  }

  if (!sawDigit) return null;
  return { core: input.slice(start, coreEnd), tail: input.slice(coreEnd) };
}

/**
 * Trim, drop a leading `v`, and confirm there is a numeric core.
 *
 * Returns the normalised string — `"v1.4.0"` becomes `"1.4.0"` — or `null` if there is no numeric
 * core to compare at all (`"R3.2"`, `""`, `"unknown"`).
 */
export function normalizeFirmwareVersion(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  const split = splitVersion(trimmed);
  if (!split) return null;
  return `${split.core}${split.tail}`;
}

/**
 * `-1` if `a` is older, `1` if newer, `0` if equal — and `null` if either side has no numeric core.
 *
 * `null` rather than a number on purpose: a caller that cannot tell "equal" from "unknown" will
 * report a device as up to date because its version string was gibberish.
 */
export function compareFirmwareVersions(a: unknown, b: unknown): number | null {
  const left = numericSegments(a);
  const right = numericSegments(b);
  if (!left || !right) return null;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    const l = left[i] ?? 0;
    const r = right[i] ?? 0;
    if (l !== r) return l < r ? -1 : 1;
  }
  return 0;
}

/** Whether `available` is strictly newer than `current`. `false` when either cannot be compared. */
export function isFirmwareOutdated(current: unknown, available: unknown): boolean {
  return compareFirmwareVersions(current, available) === -1;
}

/**
 * Derive a firmware status from the two version strings.
 *
 * `updating` and `failed` are states a product knows and this function cannot infer, so they are
 * passed through untouched: only `unknown`, `up-to-date` and `update-available` are ever derived.
 */
export function resolveFirmwareStatus(info: KinetixFirmwareInfo): KinetixFirmwareStatus {
  if (info.status === "updating" || info.status === "failed") return info.status;
  const comparison = compareFirmwareVersions(info.currentVersion, info.availableVersion);
  if (comparison === null) return "unknown";
  return comparison === -1 ? "update-available" : "up-to-date";
}

/** Human-readable firmware status text. */
export function describeFirmwareStatus(status: KinetixFirmwareStatus): string {
  switch (status) {
    case "up-to-date":
      return "Up to date";
    case "update-available":
      return "Update available";
    case "updating":
      return "Updating";
    case "failed":
      return "Update failed";
    case "unknown":
      return "Firmware version unknown";
  }
}

/**
 * The comparable integers in a version, or `null` when there is no numeric core.
 *
 * One `splitVersion` pass rather than normalising and then re-parsing the result: the second call was
 * the other site CodeQL flagged, and re-deriving the core from a string this function had already
 * produced was only ever a way to run the same scan twice.
 */
function numericSegments(input: unknown): number[] | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  const split = splitVersion(trimmed);
  if (!split) return null;
  return split.core.split(".").map((part) => Number.parseInt(part, 10));
}
