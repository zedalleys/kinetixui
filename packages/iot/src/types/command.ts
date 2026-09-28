/**
 * The command model.
 *
 * A command sent to a device is not a function call: it is queued, it may be acknowledged long
 * before it completes, and it can expire without ever failing. The status union keeps those apart so
 * a UI can say "sent, waiting" instead of pretending the device has already done the thing.
 *
 * `payload` is carried, never interpreted. This module does not parse, validate or execute device
 * payloads.
 */
export type KinetixCommandStatus =
  | "queued"
  | "sent"
  | "acknowledged"
  | "completed"
  | "failed"
  | "cancelled"
  | "expired";

export type KinetixDeviceCommand = {
  id: string;
  deviceId: string;
  /** Product-defined command name, e.g. "reboot", "set-target-temperature", "start-irrigation". */
  name: string;
  status: KinetixCommandStatus;
  createdAt: string | Date;
  updatedAt?: string | Date;
  payload?: Record<string, unknown>;
  errorMessage?: string;
};
