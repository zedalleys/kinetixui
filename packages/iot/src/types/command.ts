/**
 * The command model.
 *
 * A command sent to a device is not a function call: it is queued, it may be acknowledged long
 * before it completes, and it can expire without ever failing. The status union keeps those apart so
 * a UI can say "sent, waiting" instead of pretending the device has already done the thing.
 *
 * `payload` is carried, never interpreted. This module does not parse, validate or execute device
 * payloads.
 */
export type KinetixCommandStatus =
  | "queued"
  | "sent"
  | "acknowledged"
  | "completed"
  | "failed"
  | "cancelled"
  | "expired";

export type KinetixDeviceCommand = {
  id: string;
  deviceId: string;
  /** Product-defined command name, e.g. "reboot", "set-target-temperature", "start-irrigation". */
  name: string;
  status: KinetixCommandStatus;
  createdAt: string | Date;
  updatedAt?: string | Date;
  payload?: Record<string, unknown>;
  errorMessage?: string;
};

/**
 * The lifecycle of one user-initiated change, as a state machine.
 *
 * {@link KinetixCommandStatus} tracks a *message*; this tracks whether *the thing the user asked for*
 * has happened, and it carries enough (attempts, timestamps, a reason) for a UI to say so honestly.
 * The one rule it exists to enforce: **a requested value is never the device's state until the device
 * confirms it.** `acknowledged` means the gateway or device has the request, not that the valve moved.
 *
 * The stages, and the sentence a UI would attach to each for a power control:
 *
 * - `idle` — nothing in flight. "Off."
 * - `requested` — sent, no reply yet. "Turning on, not yet confirmed."
 * - `acknowledged` — received, not yet done. Still not confirmed.
 * - `confirmed` — the device reported the requested value. The only stage that changes what is true.
 * - `failed` — the device or the path refused. The confirmed value stands.
 * - `timed-out` — no reply within the caller's deadline. Says nothing about whether it will still run.
 * - `unreachable` — the device cannot be reached at all. A stronger claim than a timeout.
 * - `retrying` — sent again; `attempts` says how many times.
 * - `cancelled` — the user withdrew the request. It does not prove the device did nothing.
 *
 * Nothing here sends anything or owns a clock; the product drives the machine with events and `now`.
 */
export type KinetixCommandLifecycleStage =
  | "idle"
  | "requested"
  | "acknowledged"
  | "confirmed"
  | "failed"
  | "timed-out"
  | "unreachable"
  | "retrying"
  | "cancelled";

/** Every stage, in the order a UI would list them. */
export const KINETIX_COMMAND_LIFECYCLE_STAGES: readonly KinetixCommandLifecycleStage[] = [
  "idle",
  "requested",
  "acknowledged",
  "confirmed",
  "failed",
  "timed-out",
  "unreachable",
  "retrying",
  "cancelled",
] as const;

/** What a product reports to the machine. `sent` is "the request left the app". */
export type KinetixCommandLifecycleEvent =
  | { type: "sent" }
  | { type: "acknowledge" }
  /** `value` is what the device actually reported; omit it to mean "the requested value". */
  | { type: "confirm"; value?: unknown }
  | { type: "fail"; reason?: string }
  | { type: "timeout"; reason?: string }
  | { type: "deviceUnreachable"; reason?: string }
  | { type: "retry" }
  | { type: "cancel"; reason?: string };

export type KinetixCommandLifecycle<T = unknown> = {
  /** What the device last reported. Only a `confirm` event changes it. */
  confirmedValue: T | undefined;
  /** What the user asked for. Never presented as the device's state before confirmation. */
  requestedValue: T | undefined;
  stage: KinetixCommandLifecycleStage;
  /** How many times the request has been sent. 0 until `sent`. */
  attempts: number;
  /** Retries stop being offered once `attempts` reaches this. */
  maxAttempts: number;
  /** ISO time of the most recent send (first send or retry). */
  sentAt?: string;
  ackAt?: string;
  /** ISO time the lifecycle reached a resting stage (confirmed, failed, timed-out, unreachable, cancelled). */
  settledAt?: string;
  reason?: string;
};

/** Why a transition was refused. The state is returned unchanged alongside it. */
export type KinetixLifecycleRejection = {
  code: "illegal-transition" | "max-attempts";
  message: string;
};

export type KinetixLifecycleTransition<T = unknown> =
  | { ok: true; state: KinetixCommandLifecycle<T> }
  | { ok: false; state: KinetixCommandLifecycle<T>; rejection: KinetixLifecycleRejection };
