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

/**
 * A suggested vocabulary for {@link KinetixDeviceAlert.kind}. It is a suggestion, not a closed set:
 * `kind` is an open string because the fourth product always has an alert nobody predicted, and a
 * union would force it to lie or fork. Use these where they fit so grouping and icons line up.
 */
export const KINETIX_ALERT_KINDS = [
  "device-offline",
  "low-battery",
  "abnormal-reading",
  "pressure-high",
  "flow-low",
  "firmware-update-required",
  "sensor-stale",
  "command-failed",
] as const;

export type KinetixSuggestedAlertKind = (typeof KINETIX_ALERT_KINDS)[number];

/**
 * A next step the *application* offers for an alert, such as "Restart pump". This module supplies no
 * actions and infers no causes; it only carries the one the product attached.
 */
export type KinetixAlertAction = {
  id: string;
  label: string;
  description?: string;
};

export type KinetixDeviceAlert = {
  id: string;
  deviceId: string;
  severity: KinetixAlertSeverity;
  /** Human-readable, already localised by the product. This module never composes alert copy. */
  message: string;
  raisedAt: string | Date;
  /** Present once someone has seen it. An acknowledged alert is still an alert, just not a new one. */
  acknowledgedAt?: string | Date;
  /** Open string; see {@link KINETIX_ALERT_KINDS} for the suggested set. */
  kind?: string;
  /** Application-supplied next step. Never generated here. */
  action?: KinetixAlertAction;
  /** Who or what raised it: a rule id, a subsystem, a person. Free text, product vocabulary. */
  source?: string;
  /** Present once the underlying condition has cleared. Distinct from acknowledged: the user saw it vs. it is over. */
  resolvedAt?: string | Date;
};
