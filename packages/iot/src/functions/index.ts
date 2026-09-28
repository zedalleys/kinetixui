/**
 * The React-free entry point: `@kinetixui/iot/functions`.
 *
 * Nothing reachable from here imports React or touches the DOM, so this is importable from a server
 * route, a worker, a CLI or a test with no renderer. That is a guarantee rather than a coincidence —
 * `src/functions/react-free.test.ts` asserts it against the source.
 *
 * The models come with it, so this subpath is usable on its own.
 */
export * from "../types";

export { activeAlerts, describeAlertSeverity, highestAlertSeverity, type AlertFilterOptions } from "./alerts";
export { clampBatteryLevel, classifyBatteryLevel, describeBattery, describeBatteryLevel, formatBatteryPercent } from "./battery";
export {
  buildDeviceCommand,
  describeCommandStatus,
  isCommandInFlight,
  isCommandSettled,
  isCommandUnsuccessful,
  type BuildDeviceCommandInput,
} from "./commands";
export {
  compareFirmwareVersions,
  describeFirmwareStatus,
  isFirmwareOutdated,
  normalizeFirmwareVersion,
  resolveFirmwareStatus,
} from "./firmware";
export { compareDeviceAttention, summarizeDevices, type KinetixDeviceSummary } from "./group";
export { describeLastSeen, formatLastSeen, millisecondsSince, type FormatLastSeenOptions } from "./last-seen";
export {
  describePairingStatus,
  getPairingProgress,
  isPairingSettled,
  normalizePairingCode,
  validatePairingCode,
  type PairingProgress,
  type ValidatePairingCodeOptions,
} from "./pairing";
export { clampSignalStrength, classifySignalStrength, describeSignal, formatSignalPercent, signalBars } from "./signal";
export { describeDeviceStatus, isKnownDeviceStatus, needsAttention, normalizeDeviceStatus } from "./status";
export {
  classifyTelemetryQuality,
  describeTelemetryQuality,
  detectStaleReading,
  formatTelemetryValue,
  latestPoint,
  sortTelemetryPoints,
  telemetryExtent,
  type FormatTelemetryOptions,
  type KinetixTelemetryExtent,
} from "./telemetry";
export { parseTimestamp, resolveNow } from "./time";
