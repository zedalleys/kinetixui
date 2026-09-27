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
