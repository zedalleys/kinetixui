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

/**
 * What a product reports to the machine. `sent` is "the request left the app".
 *
 * **Correlation.** `sent` and `retry` may carry the `commandId` the product used for that send. A
 * response (`acknowledge`, `confirm`, `fail`) carrying a *different* `commandId` answered an earlier,
 * superseded request and is refused with `stale-response`. Leaving ids off on either side keeps the
 * uncorrelated behaviour, so existing callers are unaffected.
 *
 * **Codes.** `code` is a stable, machine-readable reason the product chooses ("jammed",
 * "out-of-range", "gateway-timeout"). `reason` stays the human sentence. This package invents no codes.
 *
 * **Reports.** `report` is reported state that is not necessarily an answer: a device announcing its
 * value on reconnect, a physical switch being flipped, a periodic state push. See
 * `transitionCommandLifecycle` for what it does at each stage.
 */
export type KinetixCommandLifecycleEvent =
  | { type: "sent"; commandId?: string }
  | { type: "acknowledge"; commandId?: string }
  /** `value` is what the device actually reported; omit it to mean "the requested value". */
  | { type: "confirm"; value?: unknown; commandId?: string }
  | { type: "fail"; reason?: string; code?: string; commandId?: string }
  | { type: "timeout"; reason?: string; code?: string }
  | { type: "deviceUnreachable"; reason?: string; code?: string }
  | { type: "retry"; commandId?: string }
  | { type: "cancel"; reason?: string; code?: string }
  /**
   * The device's reported value. `observedAt` is when the device observed it (its own timestamp if it
   * sends one); a report older than the last accepted one is refused with `stale-report`.
   */
  | { type: "report"; value: unknown; observedAt?: string | Date | number };

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
  /** Machine-readable reason from the event that settled the lifecycle. Product-defined. */
  reasonCode?: string;
  /** Correlation id of the most recent send, when the product supplies one. */
  commandId?: string;
  /**
   * Correlation ids of requests this one replaced (see `supersedeCommandLifecycle`). A response tagged
   * with any of them is refused as `stale-response`, whether or not the current request has an id of
   * its own: a reply to a request the user has already replaced cannot settle the one that replaced it.
   * Bounded to the most recent few.
   */
  supersededCommandIds?: string[];
  /** When the device observed `confirmedValue`, from the last accepted `report`. Orders reports. */
  reportedAt?: string;
};

/** Why a transition was refused. The state is returned unchanged alongside it. */
export type KinetixLifecycleRejection = {
  /**
   * - `illegal-transition` — the event is not valid at this stage (this is how duplicates are absorbed)
   * - `max-attempts` — a retry past `maxAttempts`
   * - `stale-response` — a response tagged with a different `commandId` than the current send, or with
   *   the id of a request this one superseded
   * - `stale-report` — a `report` observed before the last accepted one
   */
  code: "illegal-transition" | "max-attempts" | "stale-response" | "stale-report";
  message: string;
};

export type KinetixLifecycleTransition<T = unknown> =
  | { ok: true; state: KinetixCommandLifecycle<T> }
  | { ok: false; state: KinetixCommandLifecycle<T>; rejection: KinetixLifecycleRejection };

/**
 * How a control presents a change while it is unconfirmed. A product choice, made per control.
 *
 * - `confirmed` — show only what the device reported; mark the request as pending. **The default**,
 *   and the behaviour every KinetixUI control has today.
 * - `optimistic` — show the requested value at once and track confirmation internally. If the change
 *   fails, times out or is cancelled, the presentation returns to the reported value and says so.
 *   Suits low-stakes, fast, reversible changes (a lamp's brightness on a local network).
 * - `hybrid` — show the requested value as the *target* the control is moving toward, while the
 *   pending state stays visible and announced. The reported value remains available beside it.
 *
 * Whatever the strategy, the lifecycle underneath is the same: a strategy changes what is drawn,
 * never what is believed. A lock, a valve or a medical device should stay `confirmed`.
 */
export type KinetixCommandStrategy = "confirmed" | "optimistic" | "hybrid";

export const KINETIX_COMMAND_STRATEGIES: readonly KinetixCommandStrategy[] = ["confirmed", "optimistic", "hybrid"] as const;

/** What a control should draw for one lifecycle under one strategy. Returned by `presentCommandValue`. */
export type KinetixCommandPresentation<T = unknown> = {
  strategy: KinetixCommandStrategy;
  /** The value the control positions itself at. */
  value: T | undefined;
  /** Where `value` came from. `requested` is never the device's state. */
  valueSource: "reported" | "requested";
  /** What the device last reported. Always available, whatever is drawn. */
  reportedValue: T | undefined;
  /** What the user asked for, while it is unconfirmed; otherwise undefined. */
  pendingValue: T | undefined;
  /** A request is out and unresolved. */
  pending: boolean;
  /**
   * The UI must visibly and accessibly mark the value as not yet confirmed. False only for
   * `optimistic` while pending, where tracking is internal by choice.
   */
  indicatePending: boolean;
  /**
   * An optimistic or hybrid display of the request was withdrawn because the request did not happen.
   * The UI must say so: a value that silently snaps back reads as the device misbehaving.
   */
  rolledBack: boolean;
  stage: KinetixCommandLifecycleStage;
};
