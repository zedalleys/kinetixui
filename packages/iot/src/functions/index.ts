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

export { describeActivityEvent, groupActivityByDay, sortActivity, type DescribeActivityOptions, type GroupActivityOptions } from "./activity";
export {
  acknowledgeAlert,
  activeAlerts,
  countAlertsBySeverity,
  describeAlertSeverity,
  groupAlertsByDevice,
  highestAlertSeverity,
  sortAlerts,
  summarizeAlerts,
  type AlertFilterOptions,
  type CountAlertsOptions,
  type KinetixAlertSummary,
  type KinetixDeviceAlertGroup,
} from "./alerts";
export {
  addAction,
  addCondition,
  canRunAutomation,
  compareAutomationAttention,
  describeAutomationStatus,
  describeOperator,
  describeRelativeTime,
  formatRelativeTime,
  isAutomationRuleValid,
  millisecondsUntil,
  moveItem,
  removeAction,
  removeCondition,
  summarizeAutomationRule,
  validateAutomationRule,
  type RelativeTimeOptions,
  type SummarizeAutomationOptions,
} from "./automation";
export {
  clampBatteryLevel,
  classifyBatteryLevel,
  describeBattery,
  describeBatteryLevel,
  formatBatteryPercent,
  resolveBatteryState,
} from "./battery";
export { findCapabilitiesByRole, resolveCapabilitySupport } from "./capabilities";
export {
  advanceCommandLifecycle,
  buildDeviceCommand,
  canRetryLifecycle,
  describeCommandLifecycle,
  describeCommandStatus,
  describeLifecycleStage,
  isCommandInFlight,
  isCommandSettled,
  isCommandUnsuccessful,
  isLifecyclePending,
  isLifecycleSettled,
  isLifecycleTimedOut,
  isSameDeviceValue,
  lifecycleToCommandStatus,
  lifecycleToControlPhase,
  presentCommandValue,
  startCommandLifecycle,
  supersedeCommandLifecycle,
  transitionCommandLifecycle,
  type BuildDeviceCommandInput,
  type DescribeLifecycleOptions,
  type StartCommandLifecycleInput,
  type SupersedeCommandLifecycleOptions,
} from "./commands";
export {
  clampLevel,
  describeControlOutcome,
  describeControlState,
  describePowerState,
  normalizePowerState,
  resolveActiveMode,
  resolveControlPresentation,
  resolveControlState,
  snapToStep,
  type DescribeControlOutcomeOptions,
} from "./control";
export {
  assessDevices,
  deriveDeviceConnectivity,
  deriveDeviceHealth,
  describeConnectivity,
  describeDeviceHealth,
  healthRank,
  summarizeDeviceState,
  summarizeFleetHealth,
  worseHealth,
  type AssessDevicesOptions,
  type DeriveConnectivityOptions,
  type DeriveDeviceHealthInput,
  type KinetixFleetHealthEntry,
  type KinetixFleetHealthSummary,
} from "./device-state";
export { energyTrend, summarizeEnergy, type EnergyTrendOptions, type SummarizeEnergyOptions } from "./energy";
export {
  compareFirmwareVersions,
  describeFirmwareStatus,
  isFirmwareOutdated,
  normalizeFirmwareVersion,
  resolveFirmwareStatus,
} from "./firmware";
export { compareDeviceAttention, summarizeDevices, type KinetixDeviceSummary } from "./group";
export {
  buildSpaceTree,
  descendantDeviceIds,
  describeSpaceRollup,
  findSpace,
  rollupSpaceHealth,
  spacePath,
} from "./hierarchy";
export {
  categoryAffordances,
  categoryDomain,
  describeDeviceCategory,
  describeDeviceDomain,
  filterDevicesByDomain,
  groupDevicesByDomain,
  isKnownDeviceCategory,
  resolveDeviceCategory,
  resolveDeviceDomain,
  type KinetixDomainGroup,
} from "./identity";
export { describeLastSeen, formatLastSeen, millisecondsSince, type FormatLastSeenOptions } from "./last-seen";
export {
  KINETIX_METRIC_IDS,
  KINETIX_METRIC_REGISTRY,
  describeMetric,
  getMetricDefinition,
  resolveMetricThresholds,
} from "./metrics";
export {
  KINETIX_PAIRING_FAILURES,
  advancePairing,
  describePairingFailure,
  describePairingMethod,
  describePairingStage,
  describePairingStatus,
  getPairingFailure,
  getPairingProgress,
  getPairingRecovery,
  isPairingSettled,
  normalizePairingCode,
  pairingFlowSteps,
  pairingFlowToStatus,
  startPairingFlow,
  transitionPairing,
  validatePairingCode,
  type PairingProgress,
  type ValidatePairingCodeOptions,
} from "./pairing";
export { clampSignalStrength, classifySignalStrength, describeSignal, formatSignalPercent, signalBars } from "./signal";
export { describeDeviceStatus, isKnownDeviceStatus, needsAttention, normalizeDeviceStatus } from "./status";
export {
  classifyAgainstThresholds,
  classifyTelemetryQuality,
  describeReadingState,
  describeSeriesForAssistiveTech,
  describeTelemetryQuality,
  detectSeriesGaps,
  detectStaleReading,
  evaluateReading,
  formatTelemetryValue,
  latestPoint,
  readingStateGlyph,
  sortTelemetryPoints,
  summarizeSeries,
  telemetryExtent,
  thresholdCrossings,
  type DescribeSeriesOptions,
  type DetectSeriesGapsOptions,
  type EvaluateReadingInput,
  type FormatTelemetryOptions,
  type KinetixBreachSide,
  type KinetixReadingEvaluation,
  type KinetixSeriesGap,
  type KinetixSeriesSummary,
  type KinetixSeriesTrend,
  type KinetixTelemetryExtent,
  type KinetixThresholdCrossing,
  type SummarizeSeriesOptions,
} from "./telemetry";
export { parseTimestamp, resolveNow } from "./time";
