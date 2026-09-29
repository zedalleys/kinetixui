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

import type { KinetixCommandLifecycle, KinetixCommandStatus } from "./command";
import type { KinetixDeviceStatus } from "./device";

/**
 * Whether a control can be operated, and if not, why.
 *
 * `offline` and `unavailable` are deliberately different. Offline means the device is unreachable
 * and the value shown is the last one we were told — it is probably still true of the physical
 * thing. Unavailable means the control itself does not apply right now (the device is disabled, or
 * in an error state that makes the command meaningless), and no last-known value should be implied.
 */
export type KinetixControlAvailability =
  /** Device reachable, no command in flight. The control works. */
  | "ready"
  /** A command has been sent and not yet settled. The control shows the requested value as requested. */
  | "pending"
  /** Device unreachable. Last-known value may be shown, clearly labelled as last-known. */
  | "offline"
  /** Reachable, but the value behind the control is old enough not to be trusted as current. */
  | "stale"
  /** The control does not apply: device disabled, or in an error state. No value is implied. */
  | "unavailable";

/** Every availability, in the order a UI would rank them when several could apply. */
export const KINETIX_CONTROL_AVAILABILITIES: readonly KinetixControlAvailability[] = [
  "unavailable",
  "offline",
  "pending",
  "stale",
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
  /** The device's status. The dominant input: an offline device disables every control on it. */
  deviceStatus?: KinetixDeviceStatus | string | null;
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
