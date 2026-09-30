import { type KinetixAlertSeverity, type KinetixDeviceAlert } from "../types/alert";
import { parseTimestamp, resolveNow } from "./time";

/**
 * Alert helpers.
 *
 * A fleet view needs one question answered per device — how loudly is this one asking for help — and
 * that is a reduction over its alerts, not a field on the device.
 */

const RANK = /* @__PURE__ */ new Map<KinetixAlertSeverity, number>([["info", 0], ["warning", 1], ["critical", 2]]);

export type AlertFilterOptions = {
  /** Count alerts somebody has already acknowledged. Defaults to false. */
  includeAcknowledged?: boolean;
  /** Count alerts whose condition has cleared (`resolvedAt`). Defaults to false. */
  includeResolved?: boolean;
};

/**
 * The loudest severity in a list, or `null` when there is nothing to report.
 *
 * `null` rather than `"info"` for an empty list: "no alerts" and "an informational alert" are
 * different states, and a device with neither should not render a badge at all.
 *
 * Acknowledged alerts are excluded by default. They have not gone away, but they are not news, and
 * a fleet list that keeps shouting about them trains people to ignore it.
 */
export function highestAlertSeverity(
  alerts: readonly KinetixDeviceAlert[] | null | undefined,
  options: AlertFilterOptions = {},
): KinetixAlertSeverity | null {
  let highest: KinetixAlertSeverity | null = null;
  for (const alert of activeAlerts(alerts, options)) {
    const rank = RANK.get(alert.severity);
    if (rank === undefined) continue; // an unknown severity is not silently promoted to critical
    if (highest === null || rank > (RANK.get(highest) ?? -1)) highest = alert.severity;
  }
  return highest;
}

/** The alerts worth showing, newest first. Ones with an unusable `raisedAt` sort last, not first. */
export function activeAlerts(
  alerts: readonly KinetixDeviceAlert[] | null | undefined,
  options: AlertFilterOptions = {},
): KinetixDeviceAlert[] {
  if (!Array.isArray(alerts)) return [];
  const kept = alerts.filter((alert) => {
    if (!alert) return false;
    if (!options.includeResolved && parseTimestamp(alert.resolvedAt ?? null) !== null) return false;
    if (options.includeAcknowledged) return true;
    return parseTimestamp(alert.acknowledgedAt ?? null) === null;
  });
  return kept.sort((a, b) => {
    const at = parseTimestamp(a.raisedAt ?? null)?.getTime();
    const bt = parseTimestamp(b.raisedAt ?? null)?.getTime();
    if (at === undefined && bt === undefined) return 0;
    if (at === undefined) return 1;
    if (bt === undefined) return -1;
    return bt - at;
  });
}

/** Human-readable severity text. */
export function describeAlertSeverity(severity: KinetixAlertSeverity): string {
  switch (severity) {
    case "info":
      return "Information";
    case "warning":
      return "Warning";
    case "critical":
      return "Critical";
  }
}

// ---------------------------------------------------------------------------------------------
// Ordering, acknowledgement, grouping and counts.
// ---------------------------------------------------------------------------------------------

const timeOf = (value: string | Date | undefined): number | undefined => parseTimestamp(value ?? null)?.getTime();
const isResolved = (alert: KinetixDeviceAlert): boolean => timeOf(alert.resolvedAt) !== undefined;
const isAcknowledged = (alert: KinetixDeviceAlert): boolean => timeOf(alert.acknowledgedAt) !== undefined;
const severityRank = (alert: KinetixDeviceAlert): number => RANK.get(alert.severity) ?? -1;

/**
 * A new array in the order a person triages: unresolved before resolved, then loudest severity, then
 * unacknowledged before acknowledged, then newest first. Alerts with an unusable `raisedAt` sort last
 * within their tier rather than first. The input is not mutated, and ties keep input order.
 */
export function sortAlerts(alerts: readonly KinetixDeviceAlert[] | null | undefined): KinetixDeviceAlert[] {
  if (!Array.isArray(alerts)) return [];
  return alerts
    .filter((alert): alert is KinetixDeviceAlert => !!alert)
    .map((alert, index) => ({ alert, index }))
    .sort((a, b) => {
      const resolved = Number(isResolved(a.alert)) - Number(isResolved(b.alert));
      if (resolved !== 0) return resolved;
      const severity = severityRank(b.alert) - severityRank(a.alert);
      if (severity !== 0) return severity;
      const acknowledged = Number(isAcknowledged(a.alert)) - Number(isAcknowledged(b.alert));
      if (acknowledged !== 0) return acknowledged;
      const at = timeOf(a.alert.raisedAt);
      const bt = timeOf(b.alert.raisedAt);
      if (at !== bt) {
        if (at === undefined) return 1;
        if (bt === undefined) return -1;
        return bt - at;
      }
      return a.index - b.index;
    })
    .map(({ alert }) => alert);
}

/**
 * The alert, acknowledged. Returns a new object; the original is untouched. Already-acknowledged
 * alerts are returned as-is so the first acknowledgement time is never overwritten.
 */
export function acknowledgeAlert(alert: KinetixDeviceAlert, now?: string | Date | number | null): KinetixDeviceAlert {
  if (isAcknowledged(alert)) return alert;
  return { ...alert, acknowledgedAt: new Date(resolveNow(now)).toISOString() };
}

export type KinetixDeviceAlertGroup = {
  deviceId: string;
  /** Sorted with {@link sortAlerts}. */
  alerts: KinetixDeviceAlert[];
  /** Loudest severity among the unresolved alerts, or `null` if all are resolved. */
  highest: KinetixAlertSeverity | null;
  unacknowledged: number;
};

/** Alerts grouped per device, the device with the loudest unresolved alert first. Ties keep first-seen order. */
export function groupAlertsByDevice(alerts: readonly KinetixDeviceAlert[] | null | undefined): KinetixDeviceAlertGroup[] {
  const byDevice = new Map<string, KinetixDeviceAlert[]>();
  for (const alert of sortAlerts(alerts)) {
    const list = byDevice.get(alert.deviceId);
    if (list) list.push(alert);
    else byDevice.set(alert.deviceId, [alert]);
  }
  const groups = [...byDevice].map(([deviceId, list]): KinetixDeviceAlertGroup => {
    const open = list.filter((a) => !isResolved(a));
    return {
      deviceId,
      alerts: list,
      highest: highestAlertSeverity(open, { includeAcknowledged: true }),
      unacknowledged: open.filter((a) => !isAcknowledged(a)).length,
    };
  });
  const rank = (g: KinetixDeviceAlertGroup) => (g.highest === null ? -1 : (RANK.get(g.highest) ?? -1));
  return groups.map((g, i) => ({ g, i })).sort((a, b) => rank(b.g) - rank(a.g) || a.i - b.i).map(({ g }) => g);
}

export type CountAlertsOptions = {
  /** Count resolved alerts too. Defaults to false. */
  includeResolved?: boolean;
  /** Count only alerts nobody has acknowledged. Defaults to false: seen is not fixed. */
  unacknowledgedOnly?: boolean;
};

/**
 * Alerts per severity, every severity present including zeroes. Unlike {@link activeAlerts} this
 * counts acknowledged alerts by default, since a count is about how many conditions exist, and
 * acknowledging one does not end it. Unknown severities are not counted.
 */
export function countAlertsBySeverity(
  alerts: readonly KinetixDeviceAlert[] | null | undefined,
  options: CountAlertsOptions = {},
): Record<KinetixAlertSeverity, number> {
  const counts = { info: 0, warning: 0, critical: 0 } as Record<KinetixAlertSeverity, number>;
  if (!Array.isArray(alerts)) return counts;
  for (const alert of alerts as readonly KinetixDeviceAlert[]) {
    if (!alert || !RANK.has(alert.severity)) continue;
    if (!options.includeResolved && isResolved(alert)) continue;
    if (options.unacknowledgedOnly && isAcknowledged(alert)) continue;
    counts[alert.severity] += 1;
  }
  return counts;
}

export type KinetixAlertSummary = {
  /** Every alert supplied. */
  total: number;
  /** Unresolved alerts. */
  open: number;
  unacknowledged: number;
  bySeverity: Record<KinetixAlertSeverity, number>;
  highest: KinetixAlertSeverity | null;
  /** Devices with at least one open alert. */
  devices: number;
  description: string;
};

/**
 * Counts and one sentence for a list of alerts. The sentence states numbers only — how many, how
 * loud, how many are unseen — and offers no cause or advice.
 */
export function summarizeAlerts(alerts: readonly KinetixDeviceAlert[] | null | undefined): KinetixAlertSummary {
  const list = Array.isArray(alerts) ? alerts.filter((a): a is KinetixDeviceAlert => !!a) : [];
  const open = list.filter((a) => !isResolved(a));
  const bySeverity = countAlertsBySeverity(list);
  const unacknowledged = open.filter((a) => !isAcknowledged(a)).length;
  const devices = new Set(open.map((a) => a.deviceId)).size;
  const highest = highestAlertSeverity(open, { includeAcknowledged: true });

  let description: string;
  if (open.length === 0) description = "No open alerts.";
  else {
    const parts: string[] = [];
    if (bySeverity.critical > 0) parts.push(`${bySeverity.critical} critical`);
    if (bySeverity.warning > 0) parts.push(`${bySeverity.warning} warning`);
    if (bySeverity.info > 0) parts.push(`${bySeverity.info} informational`);
    description = `${open.length} open ${open.length === 1 ? "alert" : "alerts"} on ${devices} ${devices === 1 ? "device" : "devices"}: ${parts.join(", ")}. ${unacknowledged} not yet acknowledged.`;
  }
  return { total: list.length, open: open.length, unacknowledged, bySeverity, highest, devices, description };
}
