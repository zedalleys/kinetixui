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

/**
 * Who or what caused an event, as the application recorded it (M3). A closed set so a UI can give each
 * a shape and a word; `unknown` is the honest value when nothing was recorded, and it is never guessed
 * from `actor` or `source`.
 *
 * - `user`: a person acted (in this app or another).
 * - `device`: the device itself — a physical switch, a sensor threshold, a reboot.
 * - `automation`: a rule, schedule or scene.
 * - `system`: the platform — a backend job, a firmware rollout.
 */
export type KinetixActivityOrigin = "user" | "device" | "automation" | "system" | "unknown";

export const KINETIX_ACTIVITY_ORIGINS: readonly KinetixActivityOrigin[] = ["user", "device", "automation", "system", "unknown"] as const;

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
  /** Who or what caused it (M3). Absent is `unknown`; see {@link KinetixActivityOrigin}. */
  origin?: KinetixActivityOrigin;
  /** The command this event belongs to, when the product correlates them (the lifecycle's `commandId`). */
  commandId?: string;
  /** Already-localised text from the product. */
  message: string;
  detail?: string;
  /** Product data carried for the product's own use (a command id, a zone). Never read by this package. */
  metadata?: Record<string, unknown>;
};

export type KinetixActivityDayGroup = {
  /** `YYYY-MM-DD`, or `"unknown"` for events with no usable timestamp. */
  key: string;
  label: string;
  relative: "today" | "yesterday" | "other";
  events: KinetixActivityEvent[];
};
