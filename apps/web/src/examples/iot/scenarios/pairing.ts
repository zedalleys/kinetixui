/**
 * Fabricated pairing fixtures for the pairing demo.
 *
 * Nothing scans, connects or provisions. Each method lists devices a person could "find", the happy
 * path is a script of stage delays, and each failure scenario names the stage it strikes at and the
 * failure code from `KINETIX_PAIRING_FAILURES`. What the person should be offered next is read from
 * that registry (`recovery`), so this file states expectations only — it does not restate copy.
 */
import type { KinetixPairingFailureCode, KinetixPairingMethod, KinetixPairingStage } from "@kinetixui/iot/functions";

export type DiscoverableDevice = {
  id: string;
  name: string;
  /** Category for `DeviceIcon`. */
  type: string;
  method: KinetixPairingMethod;
  /** What a person would be shown to confirm it is the right one: a code on the label, a serial tail. */
  hint: string;
  /** Normalised signal 0–100, for the "found" list. */
  signal?: number;
  /** For `qr` and `manual-code`: the code that is "accepted" in the demo. */
  code?: string;
  /** Where the device would be placed by default. */
  suggestedRoom?: string;
};

export const pairingDevices: Record<KinetixPairingMethod, DiscoverableDevice[]> = {
  bluetooth: [
    { id: "found-lamp", name: "Lamp (nearby)", type: "light", method: "bluetooth", hint: "Serial ends 4F2A", signal: 84, suggestedRoom: "Living room" },
    { id: "found-lock", name: "Door lock (nearby)", type: "lock", method: "bluetooth", hint: "Serial ends 91C0", signal: 41, suggestedRoom: "Hallway" },
  ],
  network: [
    { id: "found-thermostat", name: "Thermostat on this network", type: "thermostat", method: "network", hint: "Address ends .42", signal: 90, suggestedRoom: "Hallway" },
    { id: "found-plug", name: "Plug on this network", type: "plug", method: "network", hint: "Address ends .57", signal: 76, suggestedRoom: "Kitchen" },
  ],
  qr: [{ id: "found-camera", name: "Camera (from QR label)", type: "camera", method: "qr", hint: "Label on the back", code: "KX-DEMO-QR-1", suggestedRoom: "Hallway" }],
  "manual-code": [{ id: "found-sensor", name: "Air sensor (from code)", type: "air-quality", method: "manual-code", hint: "8 characters, printed inside the lid", code: "KXDM7Q2A", suggestedRoom: "Living room" }],
  cloud: [
    { id: "found-valve", name: "Valve from your account", type: "valve", method: "cloud", hint: "Listed in the demo account", suggestedRoom: "Zone 2" },
    { id: "found-weather", name: "Weather station from your account", type: "weather-station", method: "cloud", hint: "Listed in the demo account", suggestedRoom: "Utility yard" },
  ],
};

export type PairingScriptStep = { stage: KinetixPairingStage; label: string; durationMs: number };

/** The happy path: how long each stage "takes". `complete` is the resting end and has no duration. */
export const pairingHappyPath: PairingScriptStep[] = [
  { stage: "discover", label: "Looking for devices", durationMs: 1200 },
  { stage: "identify", label: "Identifying the device", durationMs: 900 },
  { stage: "authenticate", label: "Checking the code", durationMs: 1000 },
  { stage: "configure", label: "Applying settings", durationMs: 1400 },
  { stage: "assign", label: "Placing it in a room", durationMs: 700 },
  { stage: "verify", label: "Checking that it responds", durationMs: 1100 },
];

export type PairingFailureScenario = {
  id: string;
  title: string;
  method: KinetixPairingMethod;
  /** The stage the failure strikes at in this script. */
  stage: KinetixPairingStage;
  code: KinetixPairingFailureCode;
  /** What the pairing UI must be able to do after this failure, by recovery `kind`. */
  expectRecovery: readonly ("retry" | "back" | "cancel" | "settings" | "update" | "contact" | "reset")[];
  /** Whether the same step can be repeated without the person changing anything. */
  expectRetryable: boolean;
  /** Whether the UI should offer to undo half-applied setup. */
  expectCleanup: boolean;
  /** What the demo should do once the person takes the recovery path (a description, not copy). */
  recoveryOutcome: string;
};

export const pairingFailureScenarios: PairingFailureScenario[] = [
  { id: "not-found", title: "Nothing to find", method: "bluetooth", stage: "discover", code: "device-not-found", expectRecovery: ["retry", "cancel"], expectRetryable: true, expectCleanup: false, recoveryOutcome: "Searching again finds the lamp." },
  { id: "already-owned", title: "Already set up elsewhere", method: "qr", stage: "identify", code: "already-owned", expectRecovery: ["reset", "contact", "cancel"], expectRetryable: false, expectCleanup: false, recoveryOutcome: "Resetting the device lets setup continue from the start." },
  { id: "weak-signal", title: "Too far away", method: "bluetooth", stage: "identify", code: "weak-signal", expectRecovery: ["retry", "cancel"], expectRetryable: true, expectCleanup: false, recoveryOutcome: "A second attempt succeeds." },
  { id: "firmware-update", title: "Needs an update first", method: "network", stage: "configure", code: "firmware-update-required", expectRecovery: ["update", "cancel"], expectRetryable: false, expectCleanup: false, recoveryOutcome: "After the update the flow restarts at the configure stage." },
  { id: "partial", title: "Half set up", method: "cloud", stage: "assign", code: "partial-provisioning", expectRecovery: ["retry", "reset", "contact", "cancel"], expectRetryable: true, expectCleanup: true, recoveryOutcome: "Trying again completes the assignment; resetting removes what was applied." },
  { id: "wrong-code", title: "Code not accepted", method: "manual-code", stage: "authenticate", code: "authentication-failed", expectRecovery: ["retry", "back", "cancel"], expectRetryable: true, expectCleanup: false, recoveryOutcome: "Entering the code shown in the fixture succeeds." },
];

/** The scenario the demo should run after a failure is recovered from. */
export const pairingRecoveredPath = pairingHappyPath;
