import type { KinetixCommandStatus, KinetixDeviceCommand } from "../types/command";
import { parseTimestamp } from "./time";

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
