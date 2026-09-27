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

/** A digits-and-dots core, optionally prefixed with `v` and followed by a prerelease/build tail. */
const VERSION = /^v?(\d+(?:\.\d+)*)(.*)$/i;

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
  const match = VERSION.exec(trimmed);
  if (!match) return null;
  return `${match[1]}${match[2] ?? ""}`;
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

function numericSegments(input: unknown): number[] | null {
  const normalized = normalizeFirmwareVersion(input);
  if (normalized === null) return null;
  const core = VERSION.exec(normalized)?.[1];
  if (!core) return null;
  return core.split(".").map((part) => Number.parseInt(part, 10));
}
