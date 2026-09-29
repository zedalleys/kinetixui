/**
 * The pairing model — UI state only.
 *
 * Nothing here talks to Bluetooth, Wi-Fi or a network. These are the states a pairing screen moves
 * through so that the screen can be built, tested and reviewed before any transport exists, and so
 * that whichever transport arrives later does not get to invent its own vocabulary for "connecting".
 */
export type KinetixPairingStatus =
  | "idle"
  | "scanning"
  | "found"
  | "connecting"
  | "authenticating"
  | "paired"
  | "failed"
  | "cancelled";

export type KinetixPairingStepStatus = "pending" | "active" | "complete" | "error";

export type KinetixPairingStep = {
  id: string;
  label: string;
  status: KinetixPairingStepStatus;
};

// ---------------------------------------------------------------------------------------------
// Pairing flow (v2): the stages of adding a device, and what to say when one fails.
// ---------------------------------------------------------------------------------------------
//
// Still UI state only — there is no Bluetooth, Wi-Fi or network in here. The methods are labels for
// how a person is *being asked* to connect, so a screen can pick its copy; the product's transport
// decides what actually happens and reports back with events.

/** The stages a person moves through, in order. `complete` is the resting end, not a step to perform. */
export type KinetixPairingStage = "discover" | "identify" | "authenticate" | "configure" | "assign" | "verify" | "complete";

export const KINETIX_PAIRING_STAGES: readonly KinetixPairingStage[] = [
  "discover",
  "identify",
  "authenticate",
  "configure",
  "assign",
  "verify",
  "complete",
] as const;

/** How the person is asked to start. A UX label, not a transport. */
export type KinetixPairingMethod = "bluetooth" | "network" | "qr" | "manual-code" | "cloud";

export const KINETIX_PAIRING_METHODS: readonly KinetixPairingMethod[] = ["bluetooth", "network", "qr", "manual-code", "cloud"] as const;

export type KinetixPairingFailureCode =
  | "permission-denied"
  | "device-not-found"
  | "timeout"
  | "already-owned"
  | "unsupported-device"
  | "unsupported-firmware"
  | "authentication-failed"
  | "weak-signal"
  | "wrong-network"
  | "connection-lost"
  | "firmware-update-required"
  | "partial-provisioning"
  | "verification-failed";

/** What a recovery action asks the UI to do. The product wires the behaviour; this names the intent. */
export type KinetixPairingRecoveryKind = "retry" | "back" | "cancel" | "settings" | "update" | "contact" | "reset";

export type KinetixPairingRecoveryAction = {
  id: string;
  label: string;
  kind: KinetixPairingRecoveryKind;
};

export type KinetixPairingFailureInfo = {
  code: KinetixPairingFailureCode;
  title: string;
  /** What was observed, in plain words. No invented cause. */
  description: string;
  recovery: readonly KinetixPairingRecoveryAction[];
  /** Whether trying the same step again can help. `false` means the person has to change something first. */
  retryable: boolean;
  /** The stage this failure most commonly belongs to. Informational: a failure can be reported at any stage. */
  stage: KinetixPairingStage;
  /** True when a failure can leave the device half-set-up, so the product should offer to undo it. */
  needsCleanup: boolean;
};

export type KinetixPairingFlowStatus = "idle" | "active" | "failed" | "cancelled" | "complete";

export type KinetixPairingFlowState = {
  status: KinetixPairingFlowStatus;
  stage: KinetixPairingStage;
  method?: KinetixPairingMethod;
  /** Set while `status` is `failed`. */
  failure?: KinetixPairingFailureCode;
  /** True while a failed flow may have left partial state behind. */
  needsCleanup: boolean;
  /** How many times the current stage has been retried. */
  retries: number;
};

export type KinetixPairingEvent =
  | { type: "start"; method: KinetixPairingMethod }
  | { type: "next" }
  | { type: "back" }
  | { type: "cancel" }
  | { type: "fail"; code: KinetixPairingFailureCode }
  | { type: "retry" };

export type KinetixPairingRejection = {
  code: "illegal-transition" | "not-retryable";
  message: string;
};

export type KinetixPairingTransition =
  | { ok: true; state: KinetixPairingFlowState }
  | { ok: false; state: KinetixPairingFlowState; rejection: KinetixPairingRejection };
