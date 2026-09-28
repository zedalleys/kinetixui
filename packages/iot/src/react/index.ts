/**
 * The React entry point: `@kinetixui/iot/react`.
 *
 * Two layers, kept apart on purpose.
 *
 * **Primitives** render one fact as text: a status, a battery, a signal, a timestamp, a reading.
 * They compose nothing and they are the vocabulary everything else is written in.
 *
 * **Patterns** compose those primitives into the arrangements connected-device products keep
 * rebuilding — a device card, a fleet row, a telemetry card, a connection summary, an alert. They add
 * layout and a small number of rules about what to show when; they never re-derive a primitive's
 * semantics, so a change to what "stale" means happens in one place and reaches all of them.
 *
 * Neither layer talks to a device. There is no transport here — see the package README.
 *
 * Styling is Tailwind utilities on the KinetixUI token contract (`bg-muted`, `text-label-md`, …).
 * This package does not import `@kinetixui/tokens`, so those classes resolve in an app that already
 * has the token stylesheet and this library in its Tailwind `content`. Motion uses Tailwind's own
 * `motion-reduce:` variant, so a reader with `prefers-reduced-motion` gets the static version with
 * no page-level rule and no stylesheet to copy.
 */

/* ------------------------------------------------------------------ primitives */
export { BatteryIndicator, type BatteryIndicatorProps } from "./battery-indicator";
export { DeviceStatusBadge, type DeviceStatusBadgeProps } from "./device-status-badge";
export { LastSync, type LastSyncProps } from "./last-sync";
export { SensorReading, type SensorReadingProps } from "./sensor-reading";
export { SignalStrength, type SignalStrengthProps } from "./signal-strength";

/* ------------------------------------------------------------------ patterns */
export { AlertCard, type AlertCardProps } from "./alert-card";
export { CommandStatus, type CommandStatusProps } from "./command-status";
export { ConnectionHealth, type ConnectionHealthProps } from "./connection-health";
export { DeviceCard, type DeviceCardProps } from "./device-card";
export { DeviceListItem, type DeviceListItemProps } from "./device-list-item";
export { DeviceStateSummary, type DeviceStateSummaryProps } from "./device-state-summary";
export { FirmwareStatus, type FirmwareStatusProps } from "./firmware-status";
export { TelemetryCard, type TelemetryCardProps } from "./telemetry-card";
export { TelemetryTrend, type TelemetryTrendProps } from "./telemetry-trend";
