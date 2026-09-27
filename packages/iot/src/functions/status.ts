import { KINETIX_DEVICE_STATUSES, type KinetixDeviceStatus } from "../types/device";

/**
 * Status normalisation.
 *
 * Every fleet backend spells these differently, so a UI that switches on a raw string grows a
 * default branch that renders nothing. `normalizeDeviceStatus` always returns a usable status, and
 * `isKnownDeviceStatus` preserves the one thing normalisation throws away: whether the input was
 * something we actually recognised.
 */

const KNOWN = new Set<string>(KINETIX_DEVICE_STATUSES);

/**
 * Spellings seen in the wild that mean exactly one of our statuses.
 *
 * Kept small and literal on purpose. A guessed alias is worse than an unrecognised one: `"idle"`
 * could mean online-and-quiet or not-yet-paired depending on the vendor, so it is not in here.
 */
const ALIASES: Readonly<Record<string, KinetixDeviceStatus>> = {
  connected: "online",
  up: "online",
  active: "online",
  disconnected: "offline",
  down: "offline",
  unreachable: "offline",
  lost: "stale",
  ota: "updating",
  "firmware-update": "updating",
  upgrading: "updating",
  provisioning: "pairing",
  faulted: "error",
  failed: "error",
  degraded: "warning",
  disabled: "disabled",
  deactivated: "disabled",
};

/**
 * Coerce anything into a `KinetixDeviceStatus`.
 *
 * Known statuses and the aliases above map through, case-insensitively, with surrounding whitespace
 * and `_`/space separators folded to `-`.
 *
 * **Unrecognised input becomes `"offline"`.** That is the conservative end of the two bad options: it
 * never invents a fault the device did not report, and it never claims a device is reachable when we
 * cannot show that it is. It does mean a typo in a backend's status field reads as a device being
 * down — which is why `isKnownDeviceStatus` exists, so a product that wants to distinguish "the
 * device is off" from "we could not read this field" is able to.
 */
export function normalizeDeviceStatus(input: unknown): KinetixDeviceStatus {
  const key = statusKey(input);
  if (key === null) return "offline";
  if (KNOWN.has(key)) return key as KinetixDeviceStatus;
  return ALIASES[key] ?? "offline";
}

/** Whether `normalizeDeviceStatus` recognised this input rather than falling back to `"offline"`. */
export function isKnownDeviceStatus(input: unknown): boolean {
  const key = statusKey(input);
  if (key === null) return false;
  return KNOWN.has(key) || Object.prototype.hasOwnProperty.call(ALIASES, key);
}

/** Human-readable status text. The label a badge shows, and never a bare enum value. */
export function describeDeviceStatus(status: KinetixDeviceStatus): string {
  switch (status) {
    case "online":
      return "Online";
    case "offline":
      return "Offline";
    case "stale":
      return "Data is stale";
    case "syncing":
      return "Syncing";
    case "pairing":
      return "Pairing";
    case "updating":
      return "Updating";
    case "warning":
      return "Needs attention";
    case "error":
      return "Error";
    case "disabled":
      return "Disabled";
  }
}

/**
 * Whether this status should draw someone's eye. Used for sorting a fleet and for choosing emphasis
 * — never as the only signal, because emphasis is not information.
 */
export function needsAttention(status: KinetixDeviceStatus): boolean {
  return status === "error" || status === "warning" || status === "offline" || status === "stale";
}

function statusKey(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const key = input.trim().toLowerCase().replace(/[\s_]+/g, "-");
  return key.length > 0 ? key : null;
}
