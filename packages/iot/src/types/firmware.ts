/**
 * The firmware model.
 *
 * `unknown` is not an error state. A fleet usually contains devices that have not reported a version
 * yet, and "we do not know whether this needs an update" is a true and useful thing to render.
 */
export type KinetixFirmwareStatus = "up-to-date" | "update-available" | "updating" | "failed" | "unknown";

export type KinetixFirmwareInfo = {
  currentVersion?: string;
  availableVersion?: string;
  status: KinetixFirmwareStatus;
};
