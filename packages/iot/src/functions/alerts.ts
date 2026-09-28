import { KINETIX_ALERT_SEVERITIES, type KinetixAlertSeverity, type KinetixDeviceAlert } from "../types/alert";
import { parseTimestamp } from "./time";

/**
 * Alert helpers.
 *
 * A fleet view needs one question answered per device — how loudly is this one asking for help — and
 * that is a reduction over its alerts, not a field on the device.
 */

const RANK = new Map<KinetixAlertSeverity, number>(KINETIX_ALERT_SEVERITIES.map((severity, index) => [severity, index]));

export type AlertFilterOptions = {
  /** Count alerts somebody has already acknowledged. Defaults to false. */
  includeAcknowledged?: boolean;
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
