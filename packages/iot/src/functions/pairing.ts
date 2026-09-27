import type { KinetixPairingStatus, KinetixPairingStep } from "../types/pairing";

/**
 * Pairing helpers — local state and local validation only.
 *
 * No Bluetooth, no Wi-Fi, no network. `validatePairingCode` checks a code's *shape* so a form can
 * disable its submit button; it never transmits the code, stores it, or judges whether it is correct,
 * which only the device can do.
 */

export type PairingProgress = {
  /** Steps in `complete` state. */
  completed: number;
  total: number;
  /** `completed / total`, or 0 for an empty list. Never NaN. */
  ratio: number;
  /** The step currently `active`, or `null`. The first one, if a caller supplied several. */
  activeStep: KinetixPairingStep | null;
  /** True if any step is in `error`. */
  hasError: boolean;
};

/**
 * Progress through a pairing sequence.
 *
 * An empty list gives a ratio of 0 rather than a division by zero, because a progress bar renders
 * before the steps are known and `NaN%` is the wrong thing to show at that moment.
 */
export function getPairingProgress(steps: readonly KinetixPairingStep[] | null | undefined): PairingProgress {
  const list = Array.isArray(steps) ? steps : [];
  const total = list.length;
  const completed = list.filter((step) => step?.status === "complete").length;
  return {
    completed,
    total,
    ratio: total === 0 ? 0 : completed / total,
    activeStep: list.find((step) => step?.status === "active") ?? null,
    hasError: list.some((step) => step?.status === "error"),
  };
}

/** Strip the separators people type, and upper-case. `"a1b-2c3"` becomes `"A1B2C3"`. */
export function normalizePairingCode(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.replace(/[\s-]+/g, "").toUpperCase();
}

export type ValidatePairingCodeOptions = {
  /** Expected length after normalisation. Defaults to 6. */
  length?: number;
  /** Restrict to digits. Defaults to false, which allows A–Z and 0–9. */
  digitsOnly?: boolean;
};

/**
 * Whether a code is the right shape to be worth submitting.
 *
 * Shape only — a well-formed code can still be the wrong code, and this function has no way to know
 * that and no business finding out.
 */
export function validatePairingCode(input: unknown, options: ValidatePairingCodeOptions = {}): boolean {
  const length = options.length ?? 6;
  if (!Number.isInteger(length) || length <= 0) return false;
  const code = normalizePairingCode(input);
  if (code.length !== length) return false;
  return options.digitsOnly ? /^[0-9]+$/.test(code) : /^[A-Z0-9]+$/.test(code);
}

/** Whether pairing has finished, successfully or not, so a screen can stop waiting. */
export function isPairingSettled(status: KinetixPairingStatus): boolean {
  return status === "paired" || status === "failed" || status === "cancelled";
}

/** Human-readable pairing status text. */
export function describePairingStatus(status: KinetixPairingStatus): string {
  switch (status) {
    case "idle":
      return "Not started";
    case "scanning":
      return "Scanning for devices";
    case "found":
      return "Device found";
    case "connecting":
      return "Connecting";
    case "authenticating":
      return "Authenticating";
    case "paired":
      return "Paired";
    case "failed":
      return "Pairing failed";
    case "cancelled":
      return "Pairing cancelled";
  }
}
