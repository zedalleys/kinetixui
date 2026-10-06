import type {
  KinetixCommandLifecycle,
  KinetixCommandLifecycleEvent,
  KinetixCommandLifecycleStage,
  KinetixCommandPresentation,
  KinetixCommandStatus,
  KinetixCommandStrategy,
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
  /** Correlation id for the first send. A `sent` event's own `commandId` overrides it. */
  commandId?: string;
};

const DEFAULT_MAX_ATTEMPTS = 3;

/** A fresh lifecycle at `idle`. Nothing has been sent, so nothing is pending. */
export function startCommandLifecycle<T = unknown>(input: StartCommandLifecycleInput<T> = {}): KinetixCommandLifecycle<T> {
  const max = input.maxAttempts;
  const state: KinetixCommandLifecycle<T> = {
    confirmedValue: input.confirmed,
    requestedValue: input.requested,
    stage: "idle",
    attempts: 0,
    maxAttempts: typeof max === "number" && Number.isFinite(max) && max >= 1 ? Math.floor(max) : DEFAULT_MAX_ATTEMPTS,
  };
  if (input.commandId !== undefined) state.commandId = input.commandId;
  return state;
}

/** How many superseded correlation ids a lifecycle remembers. A drag emits a handful, not a history. */
const SUPERSEDED_LIMIT = 8;

export type SupersedeCommandLifecycleOptions = {
  /**
   * Correlation id for the new request's first send. Optional, but a product that gives its requests ids
   * should give this one too: without it the new request has no id of its own, and only the superseded
   * list below can tell a late reply apart from an answer.
   */
  commandId?: string;
  /** Sends allowed for the new request. Defaults to the previous lifecycle's limit. */
  maxAttempts?: number;
};

/**
 * A new request that replaces an open one: a dimmer dragged to 40 and then to 80 before 40 confirmed.
 *
 * The result is a fresh `idle` lifecycle for `requested` that keeps what is still true from the
 * previous one: the device's reported value and when it was observed, so a report older than the
 * last accepted one is still refused. The previous request's correlation id moves to
 * `supersededCommandIds`, so a late reply tagged with it is refused as `stale-response` and can never
 * confirm the newer request — including when the new request is sent without an id of its own. Send it
 * with a `sent` event, as with {@link startCommandLifecycle}.
 */
export function supersedeCommandLifecycle<T = unknown>(
  previous: KinetixCommandLifecycle<T>,
  requested: T,
  options: SupersedeCommandLifecycleOptions = {},
): KinetixCommandLifecycle<T> {
  const next = startCommandLifecycle<T>({
    confirmed: previous.confirmedValue,
    requested,
    maxAttempts: options.maxAttempts ?? previous.maxAttempts,
    ...(options.commandId !== undefined ? { commandId: options.commandId } : {}),
  });
  if (previous.reportedAt !== undefined) next.reportedAt = previous.reportedAt;
  const superseded = [...(previous.supersededCommandIds ?? []), ...(previous.commandId !== undefined ? [previous.commandId] : [])].filter(
    (id) => id !== options.commandId,
  );
  if (superseded.length > 0) next.supersededCommandIds = superseded.slice(-SUPERSEDED_LIMIT);
  return next;
}

/**
 * Structural equality for reported values, so a report of `{ r: 255, g: 0, b: 0 }` matches a request
 * for the same colour. Plain data only (primitives, arrays, plain objects), which is what a device
 * value is on every platform; anything else falls back to identity.
 */
export function isSameDeviceValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const other = b as unknown[];
    return a.length === other.length && a.every((item, i) => isSameDeviceValue(item, other[i]));
  }
  if (Object.getPrototypeOf(a) !== Object.prototype || Object.getPrototypeOf(b) !== Object.prototype) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return (
    ka.length === kb.length &&
    ka.every((key) => Object.prototype.hasOwnProperty.call(b, key) && isSameDeviceValue((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]))
  );
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

const RESPONSES: readonly EventType[] = ["acknowledge", "confirm", "fail"];

/**
 * Apply a `report`: the device's own account of its value, which is not necessarily an answer.
 *
 * It always becomes `confirmedValue` (it is what the device says), and then:
 *
 * - while pending, or after `failed`, `timed-out` or `unreachable`: a report **equal to the request**
 *   settles the lifecycle as `confirmed`, because the thing the user asked for has happened;
 * - after `unreachable`, a report that differs settles it as `failed`: the device is evidently
 *   reachable again and not in the requested state, so "unreachable" would no longer be true;
 * - otherwise the stage is kept. A pending request is not failed by an intermediate report, a
 *   timeout stays a timeout, and `idle`, `confirmed` and `cancelled` simply track the new value.
 *
 * A report whose `observedAt` is older than the last accepted one is refused, so a delayed delivery
 * cannot overwrite a newer reading. A report observed before the current send is recorded as the
 * reported value but never settles the request. Reports without `observedAt` are not ordered.
 */
function applyReport<T>(
  state: KinetixCommandLifecycle<T>,
  event: Extract<KinetixCommandLifecycleEvent, { type: "report" }>,
  at: string,
): KinetixLifecycleTransition<T> {
  const observed = parseTimestamp(event.observedAt ?? null);
  const last = parseTimestamp(state.reportedAt ?? null);
  if (observed && last && observed.getTime() < last.getTime()) {
    return {
      ok: false,
      state,
      rejection: { code: "stale-report", message: `A report observed at ${observed.toISOString()} is older than the last one (${last.toISOString()}).` },
    };
  }
  const draft: KinetixCommandLifecycle<T> = { ...state, confirmedValue: event.value as T };
  if (observed) draft.reportedAt = observed.toISOString();

  // An observation made before the current send cannot be evidence about it, whatever its value.
  // `observedAt` and `sentAt` are compared directly, so a product passing device timestamps must
  // put them on the same clock basis as the `now` it gives this machine.
  const sent = parseTimestamp(state.sentAt ?? null);
  if (observed && sent && observed.getTime() < sent.getTime()) return { ok: true, state: draft };

  const matches = state.requestedValue !== undefined && isSameDeviceValue(event.value, state.requestedValue);
  const open = isLifecyclePending(state) || state.stage === "failed" || state.stage === "timed-out" || state.stage === "unreachable";
  if (open && matches) {
    draft.stage = "confirmed";
    draft.settledAt = at;
    draft.reason = undefined;
    draft.reasonCode = undefined;
  } else if (state.stage === "unreachable") {
    draft.stage = "failed";
    draft.settledAt = at;
  }
  return { ok: true, state: draft };
}

/**
 * Apply an event, returning a typed result. The state is never mutated and this never throws.
 *
 * A refused event returns `ok: false` with the **same state object**, so a caller feeding it from an
 * unreliable source (duplicate deliveries, a late ack after a cancel) can ignore rejections and keep
 * rendering. `retry` past `maxAttempts` is refused with its own code; a response tagged with another
 * send's `commandId` is refused as `stale-response`; an out-of-order `report` as `stale-report`.
 */
export function transitionCommandLifecycle<T = unknown>(
  state: KinetixCommandLifecycle<T>,
  event: KinetixCommandLifecycleEvent,
  now?: string | Date | number | null,
): KinetixLifecycleTransition<T> {
  if (event?.type === "report") return applyReport(state, event, new Date(resolveNow(now)).toISOString());
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

  const responseId = RESPONSES.includes(event.type) && "commandId" in event ? event.commandId : undefined;
  if (responseId !== undefined && state.supersededCommandIds?.includes(responseId)) {
    return {
      ok: false,
      state,
      rejection: {
        code: "stale-response",
        message: `A "${event.type}" for command ${responseId} answers a request that has been superseded.`,
      },
    };
  }
  if (responseId !== undefined && state.commandId !== undefined && responseId !== state.commandId) {
    return {
      ok: false,
      state,
      rejection: {
        code: "stale-response",
        message: `A "${event.type}" for command ${responseId} does not answer the current request (${state.commandId}).`,
      },
    };
  }

  const at = new Date(resolveNow(now)).toISOString();
  const draft: KinetixCommandLifecycle<T> = { ...state, stage: next };
  const reason = "reason" in event ? event.reason : undefined;
  const code = "code" in event ? event.code : undefined;

  switch (event.type) {
    case "sent":
    case "retry":
      draft.attempts = state.attempts + 1;
      draft.sentAt = at;
      draft.ackAt = undefined;
      draft.settledAt = undefined;
      draft.reason = undefined;
      draft.reasonCode = undefined;
      if (event.commandId !== undefined) draft.commandId = event.commandId;
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
      draft.reasonCode = undefined;
      break;
    default:
      draft.settledAt = at;
      draft.reason = reason;
      draft.reasonCode = code;
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

const ROLLBACK_STAGES: readonly KinetixCommandLifecycleStage[] = ["failed", "timed-out", "unreachable", "cancelled"];

/**
 * What a control should draw for a lifecycle under a {@link KinetixCommandStrategy}.
 *
 * The lifecycle is the truth and does not change with the strategy; this only decides which value a
 * control positions itself at and whether it must mark that value as unconfirmed. An unrecognised
 * strategy is treated as `confirmed`, the one that cannot overclaim.
 *
 * | stage            | `confirmed`             | `optimistic`                 | `hybrid`                      |
 * | ---------------- | ----------------------- | ---------------------------- | ----------------------------- |
 * | pending          | reported, mark pending  | requested, tracked silently  | requested as target, mark pending |
 * | confirmed / idle | reported                | reported                     | reported                      |
 * | failed, timed-out, unreachable, cancelled | reported | reported, `rolledBack` | reported, `rolledBack` |
 */
export function presentCommandValue<T = unknown>(
  state: KinetixCommandLifecycle<T>,
  strategy: KinetixCommandStrategy = "confirmed",
): KinetixCommandPresentation<T> {
  const chosen: KinetixCommandStrategy = strategy === "optimistic" || strategy === "hybrid" ? strategy : "confirmed";
  const pending = isLifecyclePending(state);
  const hasRequest = state.requestedValue !== undefined;
  const showRequested = pending && hasRequest && chosen !== "confirmed";
  const rolledBack =
    chosen !== "confirmed" &&
    ROLLBACK_STAGES.includes(state.stage) &&
    hasRequest &&
    !isSameDeviceValue(state.requestedValue, state.confirmedValue);
  return {
    strategy: chosen,
    value: showRequested ? state.requestedValue : state.confirmedValue,
    valueSource: showRequested ? "requested" : "reported",
    reportedValue: state.confirmedValue,
    pendingValue: pending ? state.requestedValue : undefined,
    pending,
    indicatePending: pending && chosen !== "optimistic",
    rolledBack,
    stage: state.stage,
  };
}
