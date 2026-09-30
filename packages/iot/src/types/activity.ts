/**
 * The activity log model.
 *
 * A record of things that happened, for a timeline: a command was requested, a state changed, an
 * alert fired. It is presentation data the product assembles from whatever it logs — this package
 * writes nothing, stores nothing and has no audit guarantees.
 */

/**
 * Suggested kinds. Open on purpose: `(string & {})` keeps autocomplete for these while letting a
 * product log "maintenance" or "shift-change" without a cast.
 */
export type KinetixActivityKind = "command" | "state-change" | "alert" | "automation" | "firmware" | "system" | (string & {});

export const KINETIX_ACTIVITY_KINDS = ["command", "state-change", "alert", "automation", "firmware", "system"] as const;

/**
 * Where a change stood when it was logged. Mirrors the command lifecycle so a `requested` entry is
 * never read as something that happened.
 */
export type KinetixActivityStatus =
  | "requested"
  | "acknowledged"
  | "confirmed"
  | "failed"
  | "timed-out"
  | "unreachable"
  | "cancelled";

export type KinetixActivityEvent = {
  id: string;
  timestamp: string | Date;
  kind: KinetixActivityKind;
  deviceId?: string;
  /** A person or account that caused it. */
  actor?: string;
  /** A system that caused it: a rule, an integration, "schedule". */
  source?: string;
  status?: KinetixActivityStatus;
  /** Already-localised text from the product. */
  message: string;
  detail?: string;
};

export type KinetixActivityDayGroup = {
  /** `YYYY-MM-DD`, or `"unknown"` for events with no usable timestamp. */
  key: string;
  label: string;
  relative: "today" | "yesterday" | "other";
  events: KinetixActivityEvent[];
};
