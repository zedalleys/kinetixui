import type {
  KinetixConnectivityState,
  KinetixDeviceConnectivity,
  KinetixDeviceFault,
  KinetixDeviceHealth,
  KinetixDeviceHealthLevel,
  KinetixDeviceState,
  KinetixDeviceStateSummary,
  KinetixHealthReason,
} from "../types/device-state";
import { KINETIX_HEALTH_LEVELS } from "../types/device-state";
import type { KinetixDeviceAlert } from "../types/alert";
import type { KinetixDevice } from "../types/device";
import type { KinetixFirmwareInfo } from "../types/firmware";
import { classifyBatteryLevel } from "./battery";
import { resolveFirmwareStatus } from "./firmware";
import { detectStaleReading } from "./telemetry";
import { isKnownDeviceStatus, normalizeDeviceStatus } from "./status";
import { parseTimestamp } from "./time";

/**
 * Connected-device state derivation.
 *
 * Health here is a **reduction of facts the caller supplied**, each kept as a reason so a UI can show
 * why. It does not diagnose: "battery low" is a reading, not a cause, and no function in this file
 * proposes one.
 */

/** Rank of a health level for comparison; `unknown` is -1 so any real level outranks it. */
export function healthRank(level: KinetixDeviceHealthLevel): number {
  return level === "unknown" ? -1 : KINETIX_HEALTH_LEVELS.indexOf(level);
}

/** The worse of two levels. `unknown` only wins against nothing: knowing something beats knowing nothing. */
export function worseHealth(a: KinetixDeviceHealthLevel, b: KinetixDeviceHealthLevel): KinetixDeviceHealthLevel {
  return healthRank(b) > healthRank(a) ? b : a;
}

/** Human-readable health text. */
export function describeDeviceHealth(level: KinetixDeviceHealthLevel): string {
  switch (level) {
    case "healthy":
      return "Healthy";
    case "degraded":
      return "Degraded";
    case "warning":
      return "Warning";
    case "critical":
      return "Critical";
    case "unknown":
      return "Health unknown";
  }
}

/** Human-readable connectivity text. */
export function describeConnectivity(state: KinetixConnectivityState): string {
  switch (state) {
    case "online":
      return "Online";
    case "offline":
      return "Offline";
    case "unreachable":
      return "Unreachable";
    case "stale":
      return "Data is out of date";
    case "connecting":
      return "Connecting";
    case "unknown":
      return "Connection unknown";
  }
}

export type DeriveConnectivityOptions = {
  now?: string | Date | number | null;
  /** A device online but silent for longer than this is `stale`. Omit to skip the age check. */
  staleAfterMs?: number;
};

/**
 * Connectivity from an existing {@link KinetixDevice}.
 *
 * `offline`/`stale` statuses map straight through; every other status means the device is talking,
 * so `online` — unless `staleAfterMs` is given and `lastSeenAt` is older than it (or absent, because
 * an absent timestamp is not evidence of freshness).
 *
 * A missing or unrecognised status is `unknown`, not `offline`: `normalizeDeviceStatus` falls back to
 * `offline` for a badge, but a connectivity claim needs evidence, and "we could not read this field"
 * is not evidence that the device is gone. A backend that literally reports `unreachable` keeps that
 * word, because it is reporting a failed attempt. Otherwise `unreachable` and `connecting` are never
 * derived: only the layer that makes attempts knows about them.
 */
export function deriveDeviceConnectivity(
  device: Pick<KinetixDevice, "status" | "lastSeenAt" | "signal">,
  options: DeriveConnectivityOptions = {},
): KinetixDeviceConnectivity {
  const status = normalizeDeviceStatus(device.status);
  let state: KinetixConnectivityState;
  if (!isKnownDeviceStatus(device.status)) state = "unknown";
  else if (isUnreachableSpelling(device.status)) state = "unreachable";
  else state = status === "offline" ? "offline" : status === "stale" ? "stale" : "online";
  if (state === "online" && options.staleAfterMs !== undefined && detectStaleReading(device.lastSeenAt, options.staleAfterMs, options.now)) {
    state = "stale";
  }
  const out: KinetixDeviceConnectivity = { state };
  if (device.lastSeenAt !== undefined) out.lastSeenAt = device.lastSeenAt;
  if (device.signal !== undefined) out.signal = device.signal;
  return out;
}

/** `normalizeDeviceStatus` folds the spelling `unreachable` into `offline`; connectivity keeps it apart. */
function isUnreachableSpelling(input: unknown): boolean {
  return typeof input === "string" && input.trim().toLowerCase() === "unreachable";
}

export type DeriveDeviceHealthInput = {
  status?: KinetixDevice["status"] | string | null;
  connectivity?: Pick<KinetixDeviceConnectivity, "state"> | null;
  battery?: number | null;
  firmware?: KinetixFirmwareInfo | null;
  faults?: readonly KinetixDeviceFault[] | null;
  alerts?: readonly KinetixDeviceAlert[] | null;
};

const isActiveFault = (fault: KinetixDeviceFault | null | undefined): fault is KinetixDeviceFault =>
  !!fault && parseTimestamp(fault.clearedAt ?? null) === null;

/**
 * Derive a device's health from what is known about it.
 *
 * The level is the worst reason. With no reasons it is `healthy` only if something positive was
 * actually observed (the device is online, or reports a battery or firmware); with no evidence at all
 * it is `unknown`, because a device we know nothing about is not a healthy one.
 *
 * Acknowledging an alert does not lower health — it says a person saw it, not that it is over. Only
 * `resolvedAt` removes it. Informational alerts never move health.
 */
export function deriveDeviceHealth(input: DeriveDeviceHealthInput = {}): KinetixDeviceHealth {
  const reasons: KinetixHealthReason[] = [];
  // An unrecognised status is no evidence at all, rather than the `offline` a badge would fall back to.
  const status = input.status === undefined || input.status === null || !isKnownDeviceStatus(input.status) ? undefined : normalizeDeviceStatus(input.status);

  let connectivity: KinetixConnectivityState | undefined = input.connectivity?.state;
  if (!connectivity && status) {
    connectivity = isUnreachableSpelling(input.status)
      ? "unreachable"
      : status === "offline"
        ? "offline"
        : status === "stale"
          ? "stale"
          : status === "disabled"
            ? undefined
            : "online";
  }
  // `unknown` and `connecting` add no reason and no evidence: neither says anything about the device.

  if (status === "error") reasons.push({ code: "device-error", level: "critical", message: "The device reports an error" });
  else if (status === "warning") reasons.push({ code: "device-warning", level: "warning", message: "The device reports a warning" });

  if (connectivity === "unreachable") reasons.push({ code: "unreachable", level: "warning", message: "The device is unreachable" });
  else if (connectivity === "offline") reasons.push({ code: "offline", level: "warning", message: "The device is offline" });
  else if (connectivity === "stale") reasons.push({ code: "stale", level: "degraded", message: "The device's data is out of date" });

  // A disabled device is reachable but deliberately out of service; nothing about its health is observed.
  let evidence = connectivity === "online" && status !== "disabled";

  if (typeof input.battery === "number" && Number.isFinite(input.battery)) {
    evidence = true;
    const level = classifyBatteryLevel(input.battery);
    if (level === "critical") reasons.push({ code: "battery-critical", level: "critical", message: `Battery is critically low (${Math.round(input.battery)}%)` });
    else if (level === "low") reasons.push({ code: "battery-low", level: "warning", message: `Battery is low (${Math.round(input.battery)}%)` });
  }

  if (input.firmware) {
    const firmware = resolveFirmwareStatus(input.firmware);
    if (firmware !== "unknown") evidence = true;
    if (firmware === "failed") reasons.push({ code: "firmware-failed", level: "warning", message: "The last firmware update failed" });
    else if (firmware === "update-available") reasons.push({ code: "firmware-update-available", level: "degraded", message: "A firmware update is available" });
  }

  const faults = (Array.isArray(input.faults) ? input.faults : []).filter(isActiveFault);
  for (const fault of faults) {
    const level = fault.severity === "critical" ? "critical" : fault.severity === "warning" ? "warning" : "degraded";
    reasons.push({ code: "fault", level, message: fault.message });
  }

  const alerts = (Array.isArray(input.alerts) ? input.alerts : []).filter(
    (alert) => alert && parseTimestamp(alert.resolvedAt ?? null) === null,
  );
  const critical = alerts.filter((a) => a.severity === "critical").length;
  const warning = alerts.filter((a) => a.severity === "warning").length;
  if (critical > 0) reasons.push({ code: "alert", level: "critical", message: `${critical} critical ${critical === 1 ? "alert" : "alerts"}` });
  if (warning > 0) reasons.push({ code: "alert", level: "warning", message: `${warning} ${warning === 1 ? "warning" : "warnings"}` });

  // Stable sort keeps input order among equals, so the output is deterministic.
  reasons.sort((a, b) => healthRank(b.level) - healthRank(a.level));

  let level: KinetixDeviceHealthLevel;
  if (reasons.length > 0) level = reasons[0]!.level;
  else level = evidence ? "healthy" : "unknown";

  return { level, reasons, faults };
}

/** The keys whose requested value differs from the confirmed one — the changes still unconfirmed. */
function unconfirmedKeys(state: Pick<KinetixDeviceState, "confirmedValues" | "requestedValues">): string[] {
  const requested = state.requestedValues ?? {};
  const confirmed = state.confirmedValues ?? {};
  return Object.keys(requested).filter((key) => !Object.is(requested[key], confirmed[key]));
}

/**
 * Reduce a {@link KinetixDeviceState} to a summary and one sentence.
 *
 * The sentence reports the confirmed state and names unconfirmed requests as requests; it never
 * says a requested value is the device's current one.
 */
export function summarizeDeviceState(state: KinetixDeviceState): KinetixDeviceStateSummary {
  const activeFaults = (state.faults ?? []).filter(isActiveFault).length;
  const activeAlerts = (state.alerts ?? []).filter((a) => a && parseTimestamp(a.resolvedAt ?? null) === null).length;
  const pendingCommands = (state.pendingCommands ?? []).length;
  const unconfirmed = unconfirmedKeys(state);
  const health = state.health?.level ?? "unknown";
  // Missing connectivity is `unknown`. It used to be `offline`, which told a reader a device was gone
  // when all that was true is that nobody had said.
  const connectivity = state.connectivity?.state ?? "unknown";

  const parts = [`${state.device?.name ?? "Device"}: ${describeDeviceHealth(health).toLowerCase()}`, describeConnectivity(connectivity).toLowerCase()];
  if (activeFaults > 0) parts.push(`${activeFaults} active ${activeFaults === 1 ? "fault" : "faults"}`);
  if (activeAlerts > 0) parts.push(`${activeAlerts} open ${activeAlerts === 1 ? "alert" : "alerts"}`);
  if (unconfirmed.length > 0) parts.push(`${unconfirmed.length === 1 ? "1 change" : `${unconfirmed.length} changes`} requested but not confirmed`);
  else if (pendingCommands > 0) {
    // "In progress" promises movement. Beside an offline or unreachable link the commands are still open, and
    // nothing is moving them, so the sentence says only that they are not confirmed.
    const linkLost = connectivity === "offline" || connectivity === "unreachable";
    parts.push(`${pendingCommands} ${pendingCommands === 1 ? "command" : "commands"} ${linkLost ? "not confirmed" : "in progress"}`);
  }

  return {
    health,
    connectivity,
    pendingCommands,
    activeFaults,
    activeAlerts,
    unconfirmed,
    needsAttention: healthRank(health) >= healthRank("warning") || connectivity === "offline" || connectivity === "unreachable",
    description: `${parts.join(". ")}.`,
  };
}

export type KinetixFleetHealthEntry = {
  device: KinetixDevice;
  health: KinetixDeviceHealth;
  connectivity: KinetixDeviceConnectivity;
};

export type AssessDevicesOptions = {
  /** Every alert for the fleet; matched to devices by `deviceId`. */
  alerts?: readonly KinetixDeviceAlert[] | null;
  now?: string | Date | number | null;
  /** Passed to {@link deriveDeviceConnectivity}: online-but-silent past this is `stale`. */
  staleAfterMs?: number;
};

/**
 * Health and connectivity for each device, from what a {@link KinetixDevice} carries plus its alerts.
 *
 * Firmware and faults are not on `KinetixDevice`, so they are not considered here; a product that has
 * them calls {@link deriveDeviceHealth} itself. Input order is preserved.
 */
export function assessDevices(
  devices: readonly KinetixDevice[] | null | undefined,
  options: AssessDevicesOptions = {},
): KinetixFleetHealthEntry[] {
  if (!Array.isArray(devices)) return [];
  const alerts = Array.isArray(options.alerts) ? options.alerts : [];
  return devices
    .filter((device): device is KinetixDevice => !!device)
    .map((device) => {
      const connectivity = deriveDeviceConnectivity(device, options);
      const health = deriveDeviceHealth({
        status: device.status,
        connectivity,
        battery: device.battery,
        alerts: alerts.filter((alert) => alert?.deviceId === device.id),
      });
      return { device, health, connectivity };
    });
}

export type KinetixFleetHealthSummary = {
  total: number;
  /** Devices per health level. Every level present, and they sum to `total`. */
  byHealth: Record<KinetixDeviceHealthLevel, number>;
  /** Devices offline or unreachable. Counted separately because it overlaps `byHealth`. */
  offline: number;
  /** The worst level present, or `unknown` for an empty fleet. */
  worst: KinetixDeviceHealthLevel;
  /** Devices worst-first; ties keep input order. */
  entries: KinetixFleetHealthEntry[];
  description: string;
};

/**
 * The counts behind a "device health" summary: how many are healthy, degraded, warning, critical,
 * unknown, and how many are offline, with the devices listed worst-first.
 *
 * Offline is reported beside the health counts rather than as one of them, because an offline device
 * also has a health level and forcing it into one bucket would make the counts stop summing to the
 * fleet size.
 */
export function summarizeFleetHealth(
  devices: readonly KinetixDevice[] | null | undefined,
  options: AssessDevicesOptions = {},
): KinetixFleetHealthSummary {
  const entries = assessDevices(devices, options);
  const byHealth: Record<KinetixDeviceHealthLevel, number> = { healthy: 0, degraded: 0, warning: 0, critical: 0, unknown: 0 };
  let offline = 0;
  let worst: KinetixDeviceHealthLevel = "unknown";
  for (const entry of entries) {
    byHealth[entry.health.level] += 1;
    worst = worseHealth(worst, entry.health.level);
    if (entry.connectivity.state === "offline" || entry.connectivity.state === "unreachable") offline += 1;
  }
  const sorted = entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => healthRank(b.entry.health.level) - healthRank(a.entry.health.level) || a.index - b.index)
    .map(({ entry }) => entry);

  const n = entries.length;
  let description: string;
  if (n === 0) description = "No devices.";
  else {
    const parts = [`${byHealth.healthy} of ${n} healthy`];
    if (byHealth.critical > 0) parts.push(`${byHealth.critical} critical`);
    if (byHealth.warning > 0) parts.push(`${byHealth.warning} warning`);
    if (byHealth.degraded > 0) parts.push(`${byHealth.degraded} degraded`);
    if (byHealth.unknown > 0) parts.push(`${byHealth.unknown} unknown`);
    if (offline > 0) parts.push(`${offline} offline`);
    description = `${parts.join(", ")}.`;
  }
  return { total: n, byHealth, offline, worst, entries: sorted, description };
}
