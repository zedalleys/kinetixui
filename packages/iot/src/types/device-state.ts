/**
 * The connected-device state model.
 *
 * This composes the models that already exist — {@link KinetixDevice}, commands, alerts, firmware —
 * into the one object a device screen actually needs, rather than restating any of them. It adds only
 * what they cannot express alone: *reachability* as its own fact (a device can be `warning` and still
 * reachable, or healthy and unreachable), *health* as a derived verdict with its reasons attached, and
 * the *capabilities* a device offers as data the product supplies.
 *
 * Nothing here talks to a device. The product fills these in from whatever it knows.
 */

import type { KinetixDeviceAlert, KinetixAlertSeverity } from "./alert";
import type { KinetixDeviceCommand } from "./command";
import type { KinetixDeviceMode } from "./control";
import type { KinetixDevice } from "./device";

/**
 * Whether we can reach the device, as a claim about the link rather than the device's condition.
 *
 * `unreachable` is stronger than `offline`: offline is "it told us it is gone (or went quiet)",
 * unreachable is "we tried and could not get there" — the state a timed-out command lands in.
 * `stale` means a link story exists but the data behind it is old.
 */
export type KinetixConnectivityState = "online" | "offline" | "unreachable" | "stale";

export const KINETIX_CONNECTIVITY_STATES: readonly KinetixConnectivityState[] = [
  "unreachable",
  "offline",
  "stale",
  "online",
] as const;

export type KinetixDeviceConnectivity = {
  state: KinetixConnectivityState;
  lastSeenAt?: string | Date;
  /** Normalised 0–100, as everywhere in this package. Absent means not reported. */
  signal?: number;
};

/** Ascending concern. `unknown` sits outside the order: nothing is known, which is not the same as fine. */
export type KinetixDeviceHealthLevel = "healthy" | "degraded" | "warning" | "critical" | "unknown";

/** Ascending concern, `unknown` excluded. Index order is the comparison order. */
export const KINETIX_HEALTH_LEVELS: readonly Exclude<KinetixDeviceHealthLevel, "unknown">[] = [
  "healthy",
  "degraded",
  "warning",
  "critical",
] as const;

/** A fault a device reports. The code is the product's own; this module invents none. */
export type KinetixDeviceFault = {
  id: string;
  code: string;
  message: string;
  severity: KinetixAlertSeverity;
  raisedAt?: string | Date;
  /** Present once the device reports the fault has cleared. */
  clearedAt?: string | Date;
};

/** One observed condition that moved health off `healthy`. A fact about the inputs, never a diagnosis. */
export type KinetixHealthReason = {
  code:
    | "device-error"
    | "device-warning"
    | "unreachable"
    | "offline"
    | "stale"
    | "battery-critical"
    | "battery-low"
    | "firmware-failed"
    | "firmware-update-available"
    | "fault"
    | "alert";
  level: Exclude<KinetixDeviceHealthLevel, "healthy" | "unknown">;
  message: string;
};

export type KinetixDeviceHealth = {
  level: KinetixDeviceHealthLevel;
  reasons: KinetixHealthReason[];
  faults: KinetixDeviceFault[];
};

/**
 * What a capability *is*, as an interaction shape. Mirrors the control affordances plus the two a
 * state model needs that a control does not: reading a metric, and firing a one-shot action.
 */
export type KinetixDeviceCapabilityKind = "power" | "level" | "setpoint" | "mode" | "telemetry" | "action";

/**
 * Something a device can do or report. Ranges, steps, units and modes are **product-supplied** — a
 * pump's level is 0–100 % and a thermostat's setpoint is 5–30 °C, and this package knows neither.
 */
export type KinetixDeviceCapability = {
  id: string;
  kind: KinetixDeviceCapabilityKind;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  /** For `mode`. */
  modes?: readonly KinetixDeviceMode[];
  /** For `telemetry`: the metric key it reports. */
  metric?: string;
  /** Reported but not settable. */
  readOnly?: boolean;
};

export type KinetixDeviceState = {
  /** Identity: who this is. */
  device: KinetixDevice;
  connectivity: KinetixDeviceConnectivity;
  health: KinetixDeviceHealth;
  capabilities: KinetixDeviceCapability[];
  /** Capability id → the value the device last reported. The only values that are true. */
  confirmedValues: Record<string, unknown>;
  /** Capability id → the value the user asked for and the device has not confirmed. */
  requestedValues: Record<string, unknown>;
  pendingCommands: KinetixDeviceCommand[];
  faults: KinetixDeviceFault[];
  alerts: KinetixDeviceAlert[];
};

/** A device's state reduced to what a header, list row or notification needs. */
export type KinetixDeviceStateSummary = {
  health: KinetixDeviceHealthLevel;
  connectivity: KinetixConnectivityState;
  pendingCommands: number;
  activeFaults: number;
  /** Alerts not resolved. Acknowledged ones are still counted: seen is not fixed. */
  activeAlerts: number;
  /** Capability ids whose requested value differs from the confirmed one. */
  unconfirmed: string[];
  needsAttention: boolean;
  /** One plain sentence. Never claims a requested value as current. */
  description: string;
};
