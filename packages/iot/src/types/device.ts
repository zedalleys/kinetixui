/**
 * The device model.
 *
 * Deliberately generic. A field earns its place here only if a smart thermostat, a soil probe, an
 * infusion pump, a delivery van tracker and a fitness band would all populate it with the same
 * meaning. Anything narrower belongs in `metadata`, which is where a product puts its own shape
 * without asking this module to grow a vocabulary it cannot honour for everyone else.
 *
 * There are no transport or protocol fields. How a device is reached — MQTT, BLE, a polled HTTP
 * endpoint — changes which of these values you can populate and how often, but not what they mean,
 * and this module models meaning only.
 */

/**
 * What a connected device is currently doing, from the product's point of view.
 *
 * These are presentation states rather than link states: `stale` is "we have a connection story but
 * the data behind it is old", which is the condition most device UIs get wrong by showing a
 * confident "online".
 */
export type KinetixDeviceStatus =
  | "online"
  | "offline"
  | "stale"
  | "syncing"
  | "pairing"
  | "updating"
  | "warning"
  | "error"
  | "disabled";

/** Every status, in the order a device list would normally sort by severity of attention needed. */
export const KINETIX_DEVICE_STATUSES: readonly KinetixDeviceStatus[] = [
  "error",
  "warning",
  "offline",
  "stale",
  "updating",
  "pairing",
  "syncing",
  "online",
  "disabled",
] as const;

export type KinetixDevice = {
  id: string;
  name: string;
  /** Product-defined device kind, e.g. "thermostat", "soil-probe", "gateway". Free text on purpose. */
  type: string;
  status: KinetixDeviceStatus;
  /** Percentage, 0–100. Absent means the device does not report a battery, not that it is empty. */
  battery?: number;
  /** Normalised signal quality, 0–100. See `classifySignalStrength` for why this is not dBm. */
  signal?: number;
  firmwareVersion?: string;
  lastSeenAt?: string | Date;
  locationName?: string;
  /** Who made it. Product-supplied and never interpreted here. */
  manufacturer?: string;
  model?: string;
  /** Placement, as the product names it. For a real hierarchy use `KinetixSpaceNode.deviceIds`. */
  room?: string;
  zone?: string;
  site?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Battery bands. `unknown` is a first-class result rather than a fallback: a device that does not
 * report a battery is a different thing from a device whose battery is flat, and a UI that renders
 * them the same way is lying about one of them.
 */
export type KinetixBatteryLevel = "unknown" | "critical" | "low" | "medium" | "high" | "full";

/** Signal bands. `none` means "reported, and it is zero"; `unknown` means "not reported". */
export type KinetixSignalLevel = "unknown" | "none" | "weak" | "fair" | "good" | "excellent";
