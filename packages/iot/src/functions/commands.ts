import type {
  KinetixCommandLifecycle,
  KinetixCommandLifecycleEvent,
  KinetixCommandLifecycleStage,
  KinetixCommandStatus,
  KinetixDeviceCommand,
  KinetixLifecycleTransition,
} from "../types/command";
import type { KinetixControlPhase } from "../types/control";
import { parseTimestamp, resolveNow } from "./time";

/**
 * Command helpers.
 *
 * A command's lifecycle is the part of device control that UIs get wrong: "sent" is shown as done,
 * and "expired" is shown as failed. These predicates name the distinctions so a screen does not have
 * to re-derive them from a string comparison each time.
 *
 * Nothing here sends anything. `buildDeviceCommand` returns an object; transmitting it is the
 * product's job, and this module has no network client.
 */

/** Terminal states: the device will not tell us anything more about this command. */
const SETTLED: readonly KinetixCommandStatus[] = ["completed", "failed", "cancelled", "expired"] as const;

/** States where the command has left us but has not finished. */
const IN_FLIGHT: readonly KinetixCommandStatus[] = ["queued", "sent", "acknowledged"] as const;

export type BuildDeviceCommandInput = {
  /** Caller-supplied. This module generates no ids — see the note below. */
  id: string;
  deviceId: string;
  name: string;
  payload?: Record<string, unknown>;
  /** Defaults to the real clock. Pass it in tests, and anywhere output must be reproducible. */
  createdAt?: string | Date | number;
};

/**
 * A new command in its initial `queued` state.
 *
 * `id` is required rather than generated. An id generated in here would make the function
 * non-deterministic and untestable, and the product almost always has an id it needs to correlate
 * with — a request id, a row id, a queue key. Inventing one would just be a second identity to
 * reconcile.
 *
 * `createdAt` is normalised to an ISO string so that a command built from a `Date` and one parsed
 * from JSON compare equal.
 */
export function buildDeviceCommand(input: BuildDeviceCommandInput): KinetixDeviceCommand {
  const created = parseTimestamp(input.createdAt ?? null) ?? new Date();
  const command: KinetixDeviceCommand = {
    id: input.id,
    deviceId: input.deviceId,
    name: input.name,
    status: "queued",
    createdAt: created.toISOString(),
  };
  // Carried verbatim and never inspected: this module does not parse or execute device payloads.
  if (input.payload !== undefined) command.payload = input.payload;
  return command;
}

/** Whether the command has reached a terminal state. */
export function isCommandSettled(status: KinetixCommandStatus): boolean {
  return SETTLED.includes(status);
}

/** Whether the command is still on its way. */
export function isCommandInFlight(status: KinetixCommandStatus): boolean {
  return IN_FLIGHT.includes(status);
}

/**
 * Whether the command finished without doing what it was asked.
 *
 * `expired` counts: a command that timed out never ran, whatever the reason. `cancelled` does not —
 * somebody chose that, and presenting a deliberate cancellation as a failure is how a control screen
 * makes a user think their device is broken.
 */
export function isCommandUnsuccessful(status: KinetixCommandStatus): boolean {
  return status === "failed" || status === "expired";
}

/** Human-readable command status text. */
export function describeCommandStatus(status: KinetixCommandStatus): string {
  switch (status) {
    case "queued":
      return "Queued";
    case "sent":
      return "Sent";
    case "acknowledged":
      return "Acknowledged";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    case "expired":
      return "Expired";
  }
}

// ---------------------------------------------------------------------------------------------
// Command lifecycle: one user-initiated change, from "asked" to "confirmed" or an honest failure.
// ---------------------------------------------------------------------------------------------

export type StartCommandLifecycleInput<T = unknown> = {
  /** What the device last reported. */
  confirmed?: T;
  /** What the user is asking for. */
  requested?: T;
  /** Sends allowed before a retry is refused. Defaults to 3; a non-positive or non-finite value falls back to it. */
  maxAttempts?: number;
};

const DEFAULT_MAX_ATTEMPTS = 3;

/** A fresh lifecycle at `idle`. Nothing has been sent, so nothing is pending. */
export function startCommandLifecycle<T = unknown>(input: StartCommandLifecycleInput<T> = {}): KinetixCommandLifecycle<T> {
  const max = input.maxAttempts;
  return {
    confirmedValue: input.confirmed,
    requestedValue: input.requested,
    stage: "idle",
    attempts: 0,
    maxAttempts: typeof max === "number" && Number.isFinite(max) && max >= 1 ? Math.floor(max) : DEFAULT_MAX_ATTEMPTS,
  };
}

type EventType = KinetixCommandLifecycleEvent["type"];

const IN_FLIGHT_STAGES: readonly KinetixCommandLifecycleStage[] = ["requested", "acknowledged", "retrying"];

/**
 * Which events each stage accepts. This table is the whole machine.
 *
 * Two deliberate choices. A `confirm` is accepted after `timed-out` and `unreachable`: a device that
 * answers late has told us the truth, and refusing it would leave the UI insisting on a state the
 * device has already left. And `acknowledge` is refused once a timeout has been declared, because an
 * acknowledgement that arrives afterwards proves nothing the timeout did not already cover.
 * `confirmed` and `cancelled` are terminal — a new change is a new lifecycle.
 */
const TRANSITIONS: Readonly<Record<KinetixCommandLifecycleStage, Partial<Record<EventType, KinetixCommandLifecycleStage>>>> = {
  idle: { sent: "requested" },
  requested: {
    acknowledge: "acknowledged",
    confirm: "confirmed",
    fail: "failed",
    timeout: "timed-out",
    deviceUnreachable: "unreachable",
    cancel: "cancelled",
  },
  acknowledged: {
    confirm: "confirmed",
    fail: "failed",
    timeout: "timed-out",
    deviceUnreachable: "unreachable",
    cancel: "cancelled",
  },
  retrying: {
    acknowledge: "acknowledged",
    confirm: "confirmed",
    fail: "failed",
    timeout: "timed-out",
    deviceUnreachable: "unreachable",
    cancel: "cancelled",
  },
  "timed-out": { deviceUnreachable: "unreachable", retry: "retrying", confirm: "confirmed", cancel: "cancelled" },
  unreachable: { retry: "retrying", confirm: "confirmed", cancel: "cancelled" },
  failed: { retry: "retrying", cancel: "cancelled" },
  confirmed: {},
  cancelled: {},
};

/**
 * Apply an event, returning a typed result. The state is never mutated and this never throws.
 *
 * A refused event returns `ok: false` with the **same state object**, so a caller feeding it from an
 * unreliable source (duplicate deliveries, a late ack after a cancel) can ignore rejections and keep
 * rendering. `retry` past `maxAttempts` is refused with its own code.
 */
export function transitionCommandLifecycle<T = unknown>(
  state: KinetixCommandLifecycle<T>,
  event: KinetixCommandLifecycleEvent,
  now?: string | Date | number | null,
): KinetixLifecycleTransition<T> {
  const next = TRANSITIONS[state.stage]?.[event?.type];
  if (!next) {
    return {
      ok: false,
      state,
      rejection: {
        code: "illegal-transition",
        message: `A "${String(event?.type)}" event is not valid while the change is ${state.stage}.`,
      },
    };
  }
  if (event.type === "retry" && state.attempts >= state.maxAttempts) {
    return {
      ok: false,
      state,
      rejection: { code: "max-attempts", message: `Already tried ${state.attempts} of ${state.maxAttempts} times.` },
    };
  }

  const at = new Date(resolveNow(now)).toISOString();
  const draft: KinetixCommandLifecycle<T> = { ...state, stage: next };
  const reason = "reason" in event ? event.reason : undefined;

  switch (event.type) {
    case "sent":
    case "retry":
      draft.attempts = state.attempts + 1;
      draft.sentAt = at;
      draft.ackAt = undefined;
      draft.settledAt = undefined;
      draft.reason = undefined;
      break;
    case "acknowledge":
      draft.ackAt = at;
      break;
    case "confirm":
      // Only here does the device's state change. A device that reports something other than what was
      // asked (a dimmer that clamped to 80) is believed over the request.
      draft.confirmedValue = "value" in event && event.value !== undefined ? (event.value as T) : state.requestedValue;
      draft.settledAt = at;
      draft.reason = undefined;
      break;
    default:
      draft.settledAt = at;
      draft.reason = reason;
  }
  return { ok: true, state: draft };
}

/** {@link transitionCommandLifecycle} without the result wrapper: a refused event returns the same state. */
export function advanceCommandLifecycle<T = unknown>(
  state: KinetixCommandLifecycle<T>,
  event: KinetixCommandLifecycleEvent,
  now?: string | Date | number | null,
): KinetixCommandLifecycle<T> {
  return transitionCommandLifecycle(state, event, now).state;
}

/** True while a request is out and unresolved: requested, acknowledged or retrying. */
export function isLifecyclePending(state: Pick<KinetixCommandLifecycle, "stage">): boolean {
  return IN_FLIGHT_STAGES.includes(state.stage);
}

/** True at a resting stage: confirmed, failed, timed-out, unreachable or cancelled. */
export function isLifecycleSettled(state: Pick<KinetixCommandLifecycle, "stage">): boolean {
  return state.stage !== "idle" && !isLifecyclePending(state);
}

/** Whether a retry would be accepted right now. */
export function canRetryLifecycle(state: KinetixCommandLifecycle): boolean {
  return TRANSITIONS[state.stage].retry !== undefined && state.attempts < state.maxAttempts;
}

/**
 * Whether the request has timed out: already declared so, or in flight for longer than `timeoutMs`.
 *
 * Time is measured from the most recent send, so a retry gets a fresh window. A non-positive or
 * non-finite `timeoutMs` is `false` — claiming a timeout on the strength of a bad config value would
 * tell a user the device failed when nothing was measured.
 */
export function isLifecycleTimedOut(
  state: KinetixCommandLifecycle,
  now: string | Date | number | null | undefined,
  timeoutMs: number,
): boolean {
  if (state.stage === "timed-out") return true;
  if (!isLifecyclePending(state)) return false;
  if (typeof timeoutMs !== "number" || !Number.isFinite(timeoutMs) || timeoutMs <= 0) return false;
  const sent = parseTimestamp(state.sentAt ?? null);
  if (!sent) return false;
  return resolveNow(now) - sent.getTime() > timeoutMs;
}

/** A short label for a stage. */
export function describeLifecycleStage(stage: KinetixCommandLifecycleStage): string {
  switch (stage) {
    case "idle":
      return "Idle";
    case "requested":
      return "Requested";
    case "acknowledged":
      return "Acknowledged";
    case "confirmed":
      return "Confirmed";
    case "failed":
      return "Failed";
    case "timed-out":
      return "Timed out";
    case "unreachable":
      return "Unreachable";
    case "retrying":
      return "Retrying";
    case "cancelled":
      return "Cancelled";
  }
}

export type DescribeLifecycleOptions = {
  /** How a value reads in a sentence. Defaults to `String`; pass `(v) => (v ? "on" : "off")` and the like. */
  formatValue?: (value: unknown) => string;
};

/**
 * One sentence for the current stage.
 *
 * Every sentence for an unconfirmed stage names both the requested value **as requested** and the
 * confirmed value **as what the device last reported**. None says the device *is* the requested
 * value before a `confirmed` stage, because a screen-reader user has no colour or spinner to correct
 * a sentence that overclaims.
 */
export function describeCommandLifecycle(state: KinetixCommandLifecycle, options: DescribeLifecycleOptions = {}): string {
  const format = (value: unknown) => {
    if (value === undefined || value === null) return "unknown";
    return (options.formatValue ?? String)(value);
  };
  const want = format(state.requestedValue);
  const have = format(state.confirmedValue);
  const tail = state.reason ? ` ${state.reason}` : "";
  switch (state.stage) {
    case "idle":
      return `No change requested. The device reports ${have}.`;
    case "requested":
      return `Requested ${want}. Waiting for the device; not yet confirmed. It last reported ${have}.`;
    case "acknowledged":
      return `The device acknowledged the request for ${want} but has not confirmed it. It last reported ${have}.`;
    case "retrying":
      return `Retrying, attempt ${state.attempts} of ${state.maxAttempts}. ${want} is still not confirmed; the device last reported ${have}.`;
    case "confirmed":
      return `Confirmed: the device reports ${have}.`;
    case "failed":
      return `The change to ${want} failed.${tail} The device still reports ${have}.`;
    case "timed-out":
      return `No confirmation for ${want}: the request timed out.${tail} The device last reported ${have}.`;
    case "unreachable":
      return `The device is unreachable, so ${want} was not confirmed.${tail} It last reported ${have}.`;
    case "cancelled":
      return `Cancelled. ${want} was not confirmed; the device last reported ${have}.`;
  }
}

/**
 * The {@link KinetixCommandStatus} equivalent, so anything built on the command model keeps working.
 *
 * `acknowledged` maps to `acknowledged` (in flight), never to `completed`. `timed-out` is `expired`
 * and `unreachable` is `failed`. `idle` has no command yet, so it is `null`.
 */
export function lifecycleToCommandStatus(state: Pick<KinetixCommandLifecycle, "stage">): KinetixCommandStatus | null {
  switch (state.stage) {
    case "idle":
      return null;
    case "requested":
    case "retrying":
      return "sent";
    case "acknowledged":
      return "acknowledged";
    case "confirmed":
      return "completed";
    case "failed":
    case "unreachable":
      return "failed";
    case "timed-out":
      return "expired";
    case "cancelled":
      return "cancelled";
  }
}

/** The {@link KinetixControlPhase} for a lifecycle. Only `confirmed` reaches `confirmed`. */
export function lifecycleToControlPhase(state: Pick<KinetixCommandLifecycle, "stage">): KinetixControlPhase {
  switch (state.stage) {
    case "requested":
    case "acknowledged":
    case "retrying":
      return "requested";
    case "confirmed":
      return "confirmed";
    case "failed":
    case "timed-out":
    case "unreachable":
      return "failed";
    case "idle":
    case "cancelled":
      return "idle";
  }
}
