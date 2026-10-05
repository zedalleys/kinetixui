/**
 * Control-state derivation.
 *
 * One function decides what every control in this package shows, so "what does offline look like"
 * has a single answer across power, level, setpoint and mode. React-free, like everything under
 * `functions/`.
 */

import type { KinetixCommandLifecycle } from "../types/command";
import type {
  KinetixControlAvailability,
  KinetixControlOutcome,
  KinetixControlPhase,
  KinetixControlPresentation,
  KinetixControlState,
  KinetixDeviceMode,
  KinetixPowerState,
  ResolveControlPresentationInput,
  ResolveControlStateInput,
} from "../types/control";
import { isCommandInFlight, isCommandUnsuccessful, isSameDeviceValue, lifecycleToCommandStatus, presentCommandValue, startCommandLifecycle } from "./commands";
import { normalizeDeviceStatus } from "./status";

/**
 * Device statuses that make a control inoperable, and the availability each maps to.
 *
 * `error` is `unavailable` rather than `offline`: the device is talking, so the last value is not
 * "last known before we lost it" — it is a value from a device that is reporting a fault, and
 * presenting it as the current setting would be worse than showing nothing.
 */
const STATUS_AVAILABILITY: Partial<Record<string, KinetixControlAvailability>> = {
  offline: "offline",
  stale: "stale",
  disabled: "unavailable",
  error: "unavailable",
  pairing: "unavailable",
  // `updating` is deliberately `pending`: the device is busy with something it will finish, which is
  // the same shape as a command in flight from the user's point of view — wait, do not retry.
  updating: "pending",
  syncing: "pending",
};

/**
 * Resolve what a control should show and whether it can be operated.
 *
 * Precedence, highest first: an explicit `disabled`, then the device's status, then the command's.
 * Device status wins over command status because a command to an offline device is not "pending",
 * it is "going nowhere" — and a spinner that never resolves is the worst of both.
 */
export function resolveControlState(input: ResolveControlStateInput = {}): KinetixControlState {
  const status = normalizeDeviceStatus(input.deviceStatus);
  const commandStatus =
    typeof input.commandStatus === "string"
      ? input.commandStatus
      : input.lifecycle
        ? (lifecycleToCommandStatus(input.lifecycle) ?? undefined)
        : undefined;

  const inFlight = isCommandInFlight(commandStatus as never);
  const unsuccessful = isCommandUnsuccessful(commandStatus as never);

  const statusAvailability = STATUS_AVAILABILITY[status];

  let availability: KinetixControlAvailability;
  if (input.disabled) availability = "unavailable";
  else if (statusAvailability && statusAvailability !== "pending") availability = statusAvailability;
  else if (inFlight) availability = "pending";
  else if (statusAvailability === "pending") availability = "pending";
  else availability = "ready";

  let phase: KinetixControlPhase = "idle";
  if (inFlight) phase = "requested";
  else if (unsuccessful) phase = "failed";
  else if (commandStatus === "completed") phase = "confirmed";

  // Pending is interactive-false on purpose: a second press while the first is unresolved is how
  // users end up toggling a device twice. Offline and stale differ — stale still accepts input,
  // because sending a command is exactly how you find out whether the device is still there.
  const interactive = !input.disabled && availability !== "offline" && availability !== "unavailable" && availability !== "pending";

  const lastKnown = availability === "offline" || availability === "stale";

  return { availability, phase, interactive, lastKnown, description: describeControlState(availability, phase) };
}

/**
 * A sentence for a control's accessible description.
 *
 * These are read aloud, so they are written as things a person would say. In particular the pending
 * wording never claims the device did anything — "requested" and "not confirmed" are both in it,
 * because a screen-reader user gets no visual pending affordance to disambiguate.
 */
export function describeControlState(availability: KinetixControlAvailability, phase: KinetixControlPhase = "idle"): string {
  if (availability === "pending" || phase === "requested") return "Change requested, not yet confirmed by the device";
  if (availability === "offline") return "Device offline. Showing the last known setting";
  if (availability === "unavailable") return "Control unavailable";
  if (availability === "stale") return "Device data is out of date. Showing the last known setting";
  if (phase === "failed") return "The last change failed. Showing the device's current setting";
  return "Ready";
}

/** Normalise anything into a {@link KinetixPowerState}. Booleans are convenient and common. */
export function normalizePowerState(value: KinetixPowerState | boolean | null | undefined): KinetixPowerState {
  if (value === true || value === "on") return "on";
  if (value === false || value === "off") return "off";
  return "unknown";
}

/**
 * The label for a power control, given what the device reports and what the user asked for.
 *
 * When those differ the requested value leads and the confirmed one is named, because "Turning on"
 * alone leaves the reader without the fact that it is still off.
 */
export function describePowerState(confirmed: KinetixPowerState, requested?: KinetixPowerState): string {
  if (confirmed === "unknown" && !requested) return "Unknown";
  if (requested && requested !== confirmed) {
    return requested === "on" ? "Turning on" : "Turning off";
  }
  return confirmed === "on" ? "On" : confirmed === "off" ? "Off" : "Unknown";
}

/**
 * Clamp a level to its bounds, preserving "not reported".
 *
 * Returns `null` rather than a default for an unreported level, for the reason the battery model
 * gives: a dimmer that has never reported is not a dimmer at 0%.
 */
export function clampLevel(value: number | null | undefined, min = 0, max = 100): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (max <= min) return min;
  return Math.min(max, Math.max(min, value));
}

/** Round a setpoint onto its step, so a control cannot emit a value the device would reject. */
export function snapToStep(value: number, min: number, max: number, step: number): number {
  if (!Number.isFinite(value)) return min;
  if (!Number.isFinite(step) || step <= 0) return Math.min(max, Math.max(min, value));
  const snapped = min + Math.round((value - min) / step) * step;
  // Floating-point steps (0.5, 0.1) accumulate error; round to the step's own precision.
  const decimals = (String(step).split(".")[1] ?? "").length;
  return Number(Math.min(max, Math.max(min, snapped)).toFixed(decimals));
}

/** The mode a control should present as current, preferring a requested one while it is unconfirmed. */
export function resolveActiveMode(
  modes: readonly KinetixDeviceMode[],
  confirmedId: string | null | undefined,
  requestedId?: string | null,
): { active: KinetixDeviceMode | undefined; pendingId: string | null } {
  const pendingId = requestedId && requestedId !== confirmedId ? requestedId : null;
  const active = modes.find((m) => m.id === confirmedId);
  return { active, pendingId };
}

// ---------------------------------------------------------------------------------------------
// Control presentation: one lifecycle, one strategy, one answer for every control.
// ---------------------------------------------------------------------------------------------

const UNSUCCESSFUL_OUTCOMES: readonly KinetixControlOutcome[] = ["failed", "timed-out", "unreachable", "cancelled"];

/**
 * What a control draws, from a lifecycle (or the legacy value props) and a strategy.
 *
 * This is the only place the four controls learn what to show. It wraps {@link presentCommandValue}
 * and adds the request and the outcome, so a control never re-derives "is this pending" or "did this
 * fail" from its own props. The legacy props are turned into a lifecycle first — an open request when
 * `requested` differs from `reported`, otherwise idle — so both paths go through the same rules.
 */
export function resolveControlPresentation<T = unknown>(input: ResolveControlPresentationInput<T> = {}): KinetixControlPresentation<T> {
  const fromLifecycle = !!input.lifecycle;
  const lifecycle: KinetixCommandLifecycle<T> = input.lifecycle ?? legacyLifecycle(input.reported, input.requested);
  const presentation = presentCommandValue(lifecycle, input.strategy);
  const outcome = outcomeOf(lifecycle);
  const unsuccessful =
    UNSUCCESSFUL_OUTCOMES.includes(outcome) &&
    lifecycle.requestedValue !== undefined &&
    !isSameDeviceValue(lifecycle.requestedValue, lifecycle.confirmedValue);
  return { ...presentation, requestedValue: lifecycle.requestedValue, outcome, unsuccessful, fromLifecycle };
}

function legacyLifecycle<T>(reported: T | null | undefined, requested: T | null | undefined): KinetixCommandLifecycle<T> {
  const confirmed = reported === null ? undefined : reported;
  const open = requested !== undefined && requested !== null && !isSameDeviceValue(requested, confirmed);
  const state = startCommandLifecycle<T>({ confirmed, requested: open ? requested : undefined });
  // `requested` is the one in-flight stage; the legacy props carry no more detail than "asked, not confirmed".
  return open ? { ...state, stage: "requested", attempts: 1 } : state;
}

function outcomeOf(lifecycle: Pick<KinetixCommandLifecycle, "stage">): KinetixControlOutcome {
  switch (lifecycle.stage) {
    case "requested":
    case "acknowledged":
    case "retrying":
      return "pending";
    case "confirmed":
      return "confirmed";
    case "failed":
      return "failed";
    case "timed-out":
      return "timed-out";
    case "unreachable":
      return "unreachable";
    case "cancelled":
      return "cancelled";
    case "idle":
      return "idle";
  }
}

export type DescribeControlOutcomeOptions = {
  /** How a value reads in a sentence: `(v) => v === "on" ? "on" : "off"`, `(v) => `${v}%``. Defaults to `String`. */
  formatValue?: (value: unknown) => string;
  /** The in-progress phrase for a request: "Turning on". Defaults to `Changing to <value>`. */
  pendingPhrase?: (requested: unknown) => string;
  /** The unsuccessful phrase for a request: "Could not turn on". Defaults to `Could not change to <value>`. */
  failedPhrase?: (requested: unknown) => string;
};

const capitalise = (text: string) => (text ? text[0]!.toUpperCase() + text.slice(1) : text);

/**
 * The one sentence a control announces for where its change stands, or `""` when there is nothing to
 * announce.
 *
 * Written to be heard once, politely, at the moments that matter: the request going out, the device
 * agreeing, or the request not happening. "Turning on, waiting for the device." then "On." — or
 * "Could not turn on. The device still reports off." Under `optimistic` the pending sentence is
 * withheld, because the strategy chose not to mark the wait; the outcome is still announced, and a
 * rollback always is.
 */
export function describeControlOutcome(presentation: KinetixControlPresentation, options: DescribeControlOutcomeOptions = {}): string {
  const format = (value: unknown) => (value === undefined || value === null ? "unknown" : (options.formatValue ?? String)(value));
  const want = presentation.requestedValue;
  const have = format(presentation.reportedValue);
  const pendingPhrase = options.pendingPhrase ?? ((v: unknown) => `Changing to ${format(v)}`);
  const failedPhrase = options.failedPhrase ?? ((v: unknown) => `Could not change to ${format(v)}`);
  switch (presentation.outcome) {
    case "idle":
      return "";
    case "pending":
      return presentation.indicatePending ? `${pendingPhrase(want)}, waiting for the device.` : "";
    case "confirmed":
      return `${capitalise(have)}.`;
    case "failed":
      return `${failedPhrase(want)}. The device still reports ${have}.`;
    case "timed-out":
      return `${failedPhrase(want)}: the device did not answer. It last reported ${have}.`;
    case "unreachable":
      return `${failedPhrase(want)}: the device is unreachable. It last reported ${have}.`;
    case "cancelled":
      return `Cancelled. The device still reports ${have}.`;
  }
}

