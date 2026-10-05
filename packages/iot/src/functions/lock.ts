import type { KinetixCommandStrategy } from "../types/command";
import type { KinetixControlPresentation, KinetixLockRequest, KinetixLockState, KinetixLockStrategy } from "../types/control";
import { describeControlOutcome, type DescribeControlOutcomeOptions } from "./control";

/**
 * Lock helpers. A lock is the control where an early claim does the most harm: a person told "Locked"
 * walks away. Everything here keeps "the device says locked" apart from "you asked it to lock".
 */

/** Normalise anything into a {@link KinetixLockState}. `true` is locked; anything unrecognised is `unknown`. */
export function normalizeLockState(value: unknown): KinetixLockState {
  if (value === true) return "locked";
  if (value === false) return "unlocked";
  if (typeof value !== "string") return "unknown";
  const key = value.trim().toLowerCase();
  if (key === "locked" || key === "unlocked" || key === "jammed") return key;
  return "unknown";
}

/**
 * The strategy a lock control actually uses. `confirmed` and `hybrid` pass through; `optimistic` — and
 * anything unrecognised — becomes `confirmed`. Hybrid is allowed because the lock control draws its
 * request as a direction ("Locking"), never as the secure state; optimistic would draw "Locked".
 */
export function resolveLockStrategy(strategy: KinetixCommandStrategy | string | null | undefined): KinetixLockStrategy {
  return strategy === "hybrid" ? "hybrid" : "confirmed";
}

/**
 * The lock's headline word. "Locked" only when the device reports locked; while a request is open the
 * word is its direction ("Locking", "Unlocking"), whatever the strategy.
 */
export function describeLockState(reported: KinetixLockState, requested?: KinetixLockRequest | null): string {
  if (requested && requested !== reported) return requested === "locked" ? "Locking" : "Unlocking";
  switch (reported) {
    case "locked":
      return "Locked";
    case "unlocked":
      return "Unlocked";
    case "jammed":
      return "Jammed";
    case "unknown":
      return "Lock state unknown";
  }
}

/** Which requests to offer: the opposite of a known state, or both when the state is jammed or unknown. */
export function lockActions(reported: KinetixLockState): KinetixLockRequest[] {
  if (reported === "locked") return ["unlocked"];
  if (reported === "unlocked") return ["locked"];
  return ["locked", "unlocked"];
}

/** The sentence options a lock uses with `describeControlOutcome`. */
export const LOCK_SENTENCE: DescribeControlOutcomeOptions = {
  formatValue: (value) => normalizeLockState(value),
  pendingPhrase: (value) => (normalizeLockState(value) === "locked" ? "Locking" : "Unlocking"),
  failedPhrase: (value) => (normalizeLockState(value) === "locked" ? "Could not lock" : "Could not unlock"),
};

/**
 * The one sentence a lock announces: "Locking, waiting for the device." → "Locked." or
 * "Could not lock. The device still reports unlocked."
 */
export function describeLockOutcome(presentation: KinetixControlPresentation): string {
  return describeControlOutcome(presentation, LOCK_SENTENCE);
}
