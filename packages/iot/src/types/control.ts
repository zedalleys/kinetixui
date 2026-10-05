/**
 * The control model.
 *
 * Everything in this file exists to keep two things apart that device UIs routinely merge:
 *
 *   **what the user asked for**   and   **what the device has confirmed**
 *
 * A toggle that flips the instant it is pressed is claiming the second while it only knows the
 * first. On a fast local network the lie is invisible; on a sleepy battery sensor behind a gateway
 * it is a bulb that stays off while the UI says on, and the user presses it again. Every control in
 * this package renders the confirmed value and marks the requested one as requested until the
 * device says otherwise.
 *
 * There is no transport here. These are presentation states derived from a device's status and, if
 * the product supplies one, the status of the command it sent. This package never sends anything.
 */

import type { KinetixCommandLifecycle, KinetixCommandPresentation, KinetixCommandStatus, KinetixCommandStrategy } from "./command";
import type { KinetixDeviceStatus } from "./device";
import type { KinetixConnectivityState, KinetixDeviceConnectivity } from "./device-state";

/**
 * Whether a control can be operated, and if not, why.
 *
 * `offline` and `unavailable` are deliberately different. Offline means the device is unreachable
 * and the value shown is the last one we were told — it is probably still true of the physical
 * thing. Unavailable means the control itself does not apply right now (the device is disabled, or
 * in an error state that makes the command meaningless), and no last-known value should be implied.
 *
 * `unknown` is neither (M2B, audit G12): nobody told us anything about the device, so the control
 * claims nothing about it. "We were not told" is not "it is gone". `unreachable` and `connecting`
 * keep the connectivity layer's words rather than collapsing into `offline`.
 */
export type KinetixControlAvailability =
  /** Device reachable, no command in flight. The control works. */
  | "ready"
  /** A command has been sent and not yet settled. The control shows the requested value as requested. */
  | "pending"
  /** Affirmative evidence the device is gone. Last-known value may be shown, clearly labelled as last-known. */
  | "offline"
  /** An attempt to reach the device was made and failed. Last-known value, labelled as such. */
  | "unreachable"
  /** A connection is being established. Not operable yet; the value shown is the last one reported. */
  | "connecting"
  /** Reachable, but the value behind the control is old enough not to be trusted as current. */
  | "stale"
  /** No device status or connectivity was supplied, or it could not be read. Nothing is claimed. */
  | "unknown"
  /** The control does not apply: device disabled, or in an error state. No value is implied. */
  | "unavailable";

/** Every availability, in the order a UI would rank them when several could apply. */
export const KINETIX_CONTROL_AVAILABILITIES: readonly KinetixControlAvailability[] = [
  "unavailable",
  "unreachable",
  "offline",
  "connecting",
  "pending",
  "stale",
  "unknown",
  "ready",
] as const;

/**
 * The lifecycle of one user-initiated change, from the control's point of view.
 *
 * This is narrower than {@link KinetixCommandStatus} on purpose. The command model tracks a message;
 * this tracks whether the *thing the user asked for* has happened. A command can be `acknowledged`
 * — the gateway has it — while the valve has not moved, and a control that renders acknowledgement
 * as completion is the exact mistake this type exists to prevent.
 */
export type KinetixControlPhase =
  /** Nothing requested. The displayed value is the device's own. */
  | "idle"
  /** The user asked for a change and it has not been confirmed. Show both values. */
  | "requested"
  /** The device reported the requested value. The request is over. */
  | "confirmed"
  /** The request will not happen. The displayed value is still the device's own. */
  | "failed";

/**
 * A control's resolved state: what to show, whether it can be touched, and how to say why.
 *
 * Returned by `resolveControlState` rather than assembled by each component, so "what does pending
 * look like" is answered once for the power control, the level, the setpoint and the mode.
 */
export type KinetixControlState = {
  availability: KinetixControlAvailability;
  phase: KinetixControlPhase;
  /** False when the control must not accept input. Components map this to `disabled`. */
  interactive: boolean;
  /**
   * True when the displayed value is the last one the device reported before it became unreachable
   * or went stale. A UI showing this must say so — see `describeControlState`.
   */
  lastKnown: boolean;
  /** A short, human sentence for the control's accessible description. Never a status code. */
  description: string;
};

/** A device's on/off-style power state. `unknown` is reported-nothing, not off. */
export type KinetixPowerState = "on" | "off" | "unknown";

/**
 * One selectable operating mode.
 *
 * `id` is the product's own string — this package hard-codes no mode vocabulary, because "Eco" means
 * something to a thermostat and nothing to a valve. `unavailable` lets a product show a mode that
 * exists but cannot be selected now (a heat pump's Cool mode in a system with no cooling stage)
 * rather than hiding it and leaving the user wondering where it went.
 */
export type KinetixDeviceMode = {
  id: string;
  label: string;
  description?: string;
  unavailable?: boolean;
};

/** Inputs to {@link KinetixControlState} resolution. */
export type ResolveControlStateInput = {
  /**
   * The device's status. The dominant input: an offline device disables every control on it. A missing
   * or unrecognised status resolves to `unknown`, never to `offline` (audit G12).
   */
  deviceStatus?: KinetixDeviceStatus | string | null;
  /**
   * The link, from `deriveDeviceConnectivity` or the product's own transport layer. When it says
   * `offline`, `unreachable`, `connecting` or `stale` it wins over `deviceStatus`, because it is the
   * fresher, more specific claim; `online` counts as evidence of reachability when no status is given;
   * `unknown` adds nothing.
   */
  connectivity?: KinetixConnectivityState | Pick<KinetixDeviceConnectivity, "state"> | null;
  /** The status of the command this control sent, if the product is tracking one. */
  commandStatus?: KinetixCommandStatus | string | null;
  /**
   * The lifecycle of the change, as an alternative to `commandStatus`. An explicit `commandStatus`
   * wins. Acknowledged maps to in-flight, never to confirmed.
   */
  lifecycle?: Pick<KinetixCommandLifecycle, "stage"> | null;
  /**
   * Force the control off regardless of device state — a permission boundary, a read-only view, a
   * parent form's disabled state. Kept separate from device availability so the reason stays true.
   */
  disabled?: boolean;
};

/**
 * Where a control's change stands, as a person would read it. `idle` means there is nothing to say;
 * the three unsuccessful endings are kept apart because each one asks for a different next step.
 */
export type KinetixControlOutcome = "idle" | "pending" | "confirmed" | "failed" | "timed-out" | "unreachable" | "cancelled";

/** Inputs to {@link KinetixControlPresentation} resolution: a lifecycle, or the legacy pair of values. */
export type ResolveControlPresentationInput<T = unknown> = {
  /** The change's lifecycle. When given it is the only source of truth and the value props are ignored. */
  lifecycle?: KinetixCommandLifecycle<T> | null;
  /** How the value is drawn while a change is open. Defaults to `confirmed`. Never changes the lifecycle. */
  strategy?: KinetixCommandStrategy;
  /** Legacy: what the device last reported. Used only without a lifecycle. */
  reported?: T | null;
  /** Legacy: what the user asked for, while unconfirmed. Used only without a lifecycle. */
  requested?: T | null;
};

/**
 * What a control draws, derived from one lifecycle by one strategy.
 *
 * Every field of {@link KinetixCommandPresentation}, plus the request itself (kept after it settles,
 * so a failure can name what did not happen) and the outcome. No control decides any of this itself.
 */
export type KinetixControlPresentation<T = unknown> = KinetixCommandPresentation<T> & {
  /** What was asked for, open or settled. `undefined` when nothing was. */
  requestedValue: T | undefined;
  outcome: KinetixControlOutcome;
  /**
   * The request ended without happening and the device reports something else. The UI must say so
   * in words, under every strategy: under `confirmed` nothing moved back, but the user still asked.
   */
  unsuccessful: boolean;
  /** True when a lifecycle was supplied; false on the legacy value props, which carry no outcome. */
  fromLifecycle: boolean;
};


// ---------------------------------------------------------------------------------------------
// M2B: colour, lock and media values. Plain data, so every platform can carry them.
// ---------------------------------------------------------------------------------------------

/**
 * A colour a device reports or is asked for.
 *
 * This is **device data, not a design token**: the product's lamp may be any colour, and KinetixUI
 * renders it as data (a swatch fill) while everything around it — borders, focus, labels, state —
 * stays on the token contract. Two shapes, because those are the two that devices across domains
 * agree on: an sRGB triple and a white-point temperature. A product whose devices speak HSV, CIE xy or
 * a vendor scale converts at its boundary, as it does for every other payload.
 *
 * Compare with `isSameDeviceValue`, never with `===`: a reported colour is a new object.
 */
export type KinetixDeviceColor =
  /** sRGB, 0–255 per channel. */
  | { mode: "rgb"; r: number; g: number; b: number }
  /** A white point, in kelvin (a warm 2700, a daylight 6500). */
  | { mode: "temperature"; kelvin: number };

/**
 * A lock as the device reports it. `jammed` is a reported fact (the bolt did not travel), not a
 * request; `unknown` is reported-nothing, never "unlocked".
 */
export type KinetixLockState = "locked" | "unlocked" | "jammed" | "unknown";

/** What a person can ask a lock to do. */
export type KinetixLockRequest = "locked" | "unlocked";

/**
 * The strategies a lock accepts. `optimistic` is excluded by type, and coerced to `confirmed` at
 * runtime by `resolveLockStrategy`, because drawing "locked" before the device says so is the one
 * claim a lock control must never make.
 */
export type KinetixLockStrategy = Exclude<KinetixCommandStrategy, "optimistic">;

/**
 * A media endpoint's playback, as it reports it. `buffering` is the device trying to play;
 * `unknown` is reported-nothing, never "paused".
 */
export type KinetixMediaPlaybackState = "playing" | "paused" | "stopped" | "buffering" | "unknown";

/** What a person can ask a media endpoint to do with playback. */
export type KinetixMediaPlaybackRequest = "playing" | "paused";
