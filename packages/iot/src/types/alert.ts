/**
 * The alert model.
 *
 * "Troubleshoot" is in this module's positioning, and troubleshooting starts with knowing which of
 * forty devices is the one shouting. An alert is a severity, a message and a time — not a
 * notification-delivery mechanism, which this module does not have.
 */
export type KinetixAlertSeverity = "info" | "warning" | "critical";

/** Ascending severity. Index order is the comparison order, so it is the one place it is defined. */
export const KINETIX_ALERT_SEVERITIES: readonly KinetixAlertSeverity[] = ["info", "warning", "critical"] as const;

export type KinetixDeviceAlert = {
  id: string;
  deviceId: string;
  severity: KinetixAlertSeverity;
  /** Human-readable, already localised by the product. This module never composes alert copy. */
  message: string;
  raisedAt: string | Date;
  /** Present once someone has seen it. An acknowledged alert is still an alert, just not a new one. */
  acknowledgedAt?: string | Date;
};
