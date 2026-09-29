import type {
  KinetixPairingEvent,
  KinetixPairingFailureCode,
  KinetixPairingFailureInfo,
  KinetixPairingFlowState,
  KinetixPairingMethod,
  KinetixPairingRecoveryAction,
  KinetixPairingStage,
  KinetixPairingStatus,
  KinetixPairingStep,
  KinetixPairingTransition,
} from "../types/pairing";
import { KINETIX_PAIRING_STAGES } from "../types/pairing";

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

// ---------------------------------------------------------------------------------------------
// Pairing flow (v2): a pure state machine and the failure registry. No transport.
// ---------------------------------------------------------------------------------------------

const act = (id: string, label: string, kind: KinetixPairingRecoveryAction["kind"]): KinetixPairingRecoveryAction => ({ id, label, kind });
const CANCEL = /* @__PURE__ */ act("cancel", "Cancel setup", "cancel");

/**
 * Every failure, defined once: what to tell the person, what they can do, whether the same step is
 * worth repeating and whether the device may be left half set up.
 *
 * Descriptions state what was *observed*. They never guess why — "the device was not found" is true,
 * "your Wi-Fi is broken" is a diagnosis this package cannot make. Recovery actions are intents the
 * product wires up; `settings`, `update` and `reset` name an outcome, not an OS or vendor mechanism.
 */
export const KINETIX_PAIRING_FAILURES: Readonly<Record<KinetixPairingFailureCode, KinetixPairingFailureInfo>> = {
  "permission-denied": {
    code: "permission-denied",
    title: "Permission needed",
    description: "The permission needed to start setup was not granted.",
    recovery: [/* @__PURE__ */ act("open-settings", "Open settings", "settings"), /* @__PURE__ */ act("retry", "Try again", "retry"), CANCEL],
    retryable: true,
    stage: "discover",
    needsCleanup: false,
  },
  "device-not-found": {
    code: "device-not-found",
    title: "Device not found",
    description: "No device was found to set up.",
    recovery: [/* @__PURE__ */ act("retry", "Search again", "retry"), CANCEL],
    retryable: true,
    stage: "discover",
    needsCleanup: false,
  },
  timeout: {
    code: "timeout",
    title: "No response",
    description: "The device did not respond in time.",
    recovery: [/* @__PURE__ */ act("retry", "Try again", "retry"), CANCEL],
    retryable: true,
    stage: "identify",
    needsCleanup: false,
  },
  "already-owned": {
    code: "already-owned",
    title: "Already set up",
    description: "This device reports that it is already set up with an owner.",
    recovery: [/* @__PURE__ */ act("reset-device", "Reset the device", "reset"), /* @__PURE__ */ act("contact", "Get help", "contact"), CANCEL],
    retryable: false,
    stage: "identify",
    needsCleanup: false,
  },
  "unsupported-device": {
    code: "unsupported-device",
    title: "Device not supported",
    description: "This device is not supported by this app.",
    recovery: [/* @__PURE__ */ act("contact", "Get help", "contact"), CANCEL],
    retryable: false,
    stage: "identify",
    needsCleanup: false,
  },
  "unsupported-firmware": {
    code: "unsupported-firmware",
    title: "Firmware not supported",
    description: "The version of firmware on this device is not supported.",
    recovery: [/* @__PURE__ */ act("update", "Update firmware", "update"), /* @__PURE__ */ act("contact", "Get help", "contact"), CANCEL],
    retryable: false,
    stage: "identify",
    needsCleanup: false,
  },
  "authentication-failed": {
    code: "authentication-failed",
    title: "Could not verify the device",
    description: "The code or credentials were not accepted.",
    recovery: [/* @__PURE__ */ act("retry", "Try again", "retry"), /* @__PURE__ */ act("back", "Go back", "back"), CANCEL],
    retryable: true,
    stage: "authenticate",
    needsCleanup: false,
  },
  "weak-signal": {
    code: "weak-signal",
    title: "Signal too weak",
    description: "The connection to the device was too weak to continue.",
    recovery: [/* @__PURE__ */ act("retry", "Try again", "retry"), CANCEL],
    retryable: true,
    stage: "identify",
    needsCleanup: false,
  },
  "wrong-network": {
    code: "wrong-network",
    title: "Different network",
    description: "The device and this app are not on the same network.",
    recovery: [/* @__PURE__ */ act("open-settings", "Network settings", "settings"), /* @__PURE__ */ act("back", "Go back", "back"), /* @__PURE__ */ act("retry", "Try again", "retry"), CANCEL],
    retryable: true,
    stage: "configure",
    needsCleanup: false,
  },
  "connection-lost": {
    code: "connection-lost",
    title: "Connection lost",
    description: "The connection to the device dropped during setup.",
    recovery: [/* @__PURE__ */ act("retry", "Try again", "retry"), /* @__PURE__ */ act("reset-device", "Reset the device", "reset"), CANCEL],
    retryable: true,
    stage: "configure",
    needsCleanup: true,
  },
  "firmware-update-required": {
    code: "firmware-update-required",
    title: "Update required",
    description: "This device needs a firmware update before setup can continue.",
    recovery: [/* @__PURE__ */ act("update", "Update firmware", "update"), CANCEL],
    retryable: false,
    stage: "configure",
    needsCleanup: false,
  },
  "partial-provisioning": {
    code: "partial-provisioning",
    title: "Setup only partly finished",
    description: "Some of the setup was applied to the device and some was not.",
    recovery: [/* @__PURE__ */ act("retry", "Try again", "retry"), /* @__PURE__ */ act("reset-device", "Reset the device", "reset"), /* @__PURE__ */ act("contact", "Get help", "contact"), CANCEL],
    retryable: true,
    stage: "assign",
    needsCleanup: true,
  },
  "verification-failed": {
    code: "verification-failed",
    title: "Could not confirm setup",
    description: "The device was set up but did not confirm that it is working.",
    recovery: [/* @__PURE__ */ act("retry", "Check again", "retry"), /* @__PURE__ */ act("back", "Go back", "back"), /* @__PURE__ */ act("contact", "Get help", "contact"), CANCEL],
    retryable: true,
    stage: "verify",
    needsCleanup: true,
  },
};

const UNKNOWN_FAILURE: KinetixPairingFailureInfo = {
  code: "timeout",
  title: "Setup failed",
  description: "Setup did not finish.",
  recovery: [/* @__PURE__ */ act("retry", "Try again", "retry"), CANCEL],
  retryable: true,
  stage: "discover",
  needsCleanup: false,
};

/** The registry entry for a code. An unrecognised code gets a generic, retryable entry rather than `undefined`. */
export function getPairingFailure(code: KinetixPairingFailureCode | string | null | undefined): KinetixPairingFailureInfo {
  if (typeof code === "string" && Object.prototype.hasOwnProperty.call(KINETIX_PAIRING_FAILURES, code)) {
    return KINETIX_PAIRING_FAILURES[code as KinetixPairingFailureCode];
  }
  return UNKNOWN_FAILURE;
}

/** "Title. Description" — one string for an accessible announcement. */
export function describePairingFailure(code: KinetixPairingFailureCode | string | null | undefined): string {
  const info = getPairingFailure(code);
  return `${info.title}. ${info.description}`;
}

/** The recovery actions for a failure, in the order to offer them. */
export function getPairingRecovery(code: KinetixPairingFailureCode | string | null | undefined): readonly KinetixPairingRecoveryAction[] {
  return getPairingFailure(code).recovery;
}

/** A short name for a stage. */
export function describePairingStage(stage: KinetixPairingStage): string {
  switch (stage) {
    case "discover":
      return "Find the device";
    case "identify":
      return "Identify the device";
    case "authenticate":
      return "Verify it is yours";
    case "configure":
      return "Configure";
    case "assign":
      return "Choose a place";
    case "verify":
      return "Check it works";
    case "complete":
      return "Done";
  }
}

/** A short name for an entry method. A label for a screen, not a transport. */
export function describePairingMethod(method: KinetixPairingMethod): string {
  switch (method) {
    case "bluetooth":
      return "Bluetooth";
    case "network":
      return "Same network";
    case "qr":
      return "Scan QR code";
    case "manual-code":
      return "Enter a code";
    case "cloud":
      return "Account";
  }
}

/** A flow that has not started. */
export function startPairingFlow(): KinetixPairingFlowState {
  return { status: "idle", stage: "discover", needsCleanup: false, retries: 0 };
}

const stageIndex = (stage: KinetixPairingStage) => KINETIX_PAIRING_STAGES.indexOf(stage);

function reject(state: KinetixPairingFlowState, event: KinetixPairingEvent, why?: string): KinetixPairingTransition {
  return {
    ok: false,
    state,
    rejection: {
      code: why === "not-retryable" ? "not-retryable" : "illegal-transition",
      message:
        why === "not-retryable"
          ? "This failure cannot be fixed by repeating the step."
          : `A "${String(event?.type)}" event is not valid while pairing is ${state.status} at ${state.stage}.`,
    },
  };
}

/**
 * Apply an event to the flow. Pure: the state is never mutated, and a refused event returns the same
 * state object with a typed rejection, never a throw.
 *
 * - `start` (idle only) begins at `discover`.
 * - `next` moves one stage on; leaving `verify` completes the flow.
 * - `back` moves one stage back — from an active flow, or from a failed one (to the stage before
 *   the failure). It is refused at `discover`.
 * - `fail` records a failure code and whether it may have left partial state (`needsCleanup`).
 * - `retry` re-enters the failed stage, and is refused when the failure is not retryable.
 * - `cancel` ends an active or failed flow. `complete` and `cancelled` are terminal; start a new flow.
 */
export function transitionPairing(state: KinetixPairingFlowState, event: KinetixPairingEvent): KinetixPairingTransition {
  switch (event?.type) {
    case "start":
      if (state.status !== "idle" || !isPairingMethod(event.method)) return reject(state, event);
      return { ok: true, state: { ...state, status: "active", stage: "discover", method: event.method } };
    case "next": {
      if (state.status !== "active" || state.stage === "complete") return reject(state, event);
      const stage = KINETIX_PAIRING_STAGES[stageIndex(state.stage) + 1]!;
      // A stage that advances has moved past whatever a retried failure left behind, so the cleanup flag ends here.
      return { ok: true, state: { ...state, stage, status: stage === "complete" ? "complete" : "active", retries: 0, needsCleanup: false } };
    }
    case "back": {
      if (state.status === "active" && stageIndex(state.stage) > 0) {
        return { ok: true, state: { ...state, stage: KINETIX_PAIRING_STAGES[stageIndex(state.stage) - 1]!, retries: 0 } };
      }
      if (state.status === "failed" && stageIndex(state.stage) > 0) {
        return {
          ok: true,
          state: { ...state, status: "active", stage: KINETIX_PAIRING_STAGES[stageIndex(state.stage) - 1]!, failure: undefined, retries: 0 },
        };
      }
      return reject(state, event);
    }
    case "fail":
      if (state.status !== "active") return reject(state, event);
      return { ok: true, state: { ...state, status: "failed", failure: event.code, needsCleanup: getPairingFailure(event.code).needsCleanup } };
    case "retry":
      if (state.status !== "failed") return reject(state, event);
      if (!getPairingFailure(state.failure).retryable) return reject(state, event, "not-retryable");
      return { ok: true, state: { ...state, status: "active", failure: undefined, retries: state.retries + 1 } };
    case "cancel":
      if (state.status !== "active" && state.status !== "failed") return reject(state, event);
      return { ok: true, state: { ...state, status: "cancelled" } };
    default:
      return reject(state, event);
  }
}

/** {@link transitionPairing} without the result wrapper: a refused event returns the same state. */
export function advancePairing(state: KinetixPairingFlowState, event: KinetixPairingEvent): KinetixPairingFlowState {
  return transitionPairing(state, event).state;
}

function isPairingMethod(value: unknown): value is KinetixPairingMethod {
  return value === "bluetooth" || value === "network" || value === "qr" || value === "manual-code" || value === "cloud";
}

/**
 * The flow as {@link KinetixPairingStep}s, so `getPairingProgress` and any step-list UI work on it
 * unchanged: stages before the current one are `complete`, the current one is `active` (or `error`
 * when failed), the rest `pending`. `complete` is not a step a person performs and is omitted.
 */
export function pairingFlowSteps(state: KinetixPairingFlowState): KinetixPairingStep[] {
  const current = stageIndex(state.stage);
  return KINETIX_PAIRING_STAGES.filter((stage) => stage !== "complete").map((stage, i) => ({
    id: stage,
    label: describePairingStage(stage),
    status:
      state.status === "complete" || i < current
        ? "complete"
        : i === current
          ? state.status === "failed"
            ? "error"
            : state.status === "idle"
              ? "pending"
              : "active"
          : "pending",
  }));
}

/** The closest existing {@link KinetixPairingStatus}, for UI already built on it. */
export function pairingFlowToStatus(state: KinetixPairingFlowState): KinetixPairingStatus {
  switch (state.status) {
    case "idle":
      return "idle";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    case "complete":
      return "paired";
    case "active":
      switch (state.stage) {
        case "discover":
          return "scanning";
        case "identify":
          return "found";
        case "authenticate":
          return "authenticating";
        default:
          return "connecting";
      }
  }
}
