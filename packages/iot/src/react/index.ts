/**
 * The React entry point: `@kinetixui/iot/react`.
 *
 * Three layers, kept apart on purpose.
 *
 * **Primitives** render one fact: a status, a battery, a signal, a timestamp, a reading, a device's
 * identity. They compose nothing and they are the vocabulary everything else is written in.
 *
 * **Controls** operate a device: power, level, setpoint, mode. They are the layer that makes this a
 * connected-device system rather than a dashboard, and they all share one rule — **a request the user
 * has made looks different from a state the device has confirmed.** A control that fills in the
 * instant you touch it is lying until the device agrees, and on a lock or a valve that lie matters.
 * Every control here takes a `KinetixControlState` from `resolveControlState`, so "pending",
 * "offline" and "stale" mean the same thing in all of them.
 *
 * **Patterns** compose primitives and controls into the arrangements connected-device products keep
 * rebuilding — a device card, a group, a routine, a fleet row, a telemetry card, an alert. They add
 * layout and a small number of rules about what to show when; they never re-derive a primitive's
 * semantics, so a change to what "stale" means happens in one place and reaches all of them.
 *
 * Since 0.3 the patterns also cover the moments a connected product is mostly *about*: a command
 * settling (`CommandLifecycle`), a reading whose trust is in question (`TelemetryMetric`,
 * `MetricStatus`), fleet and space health (`DeviceHealthSummary`, `SpaceRollup`, `SpaceBreadcrumb`),
 * alerts and activity, a structured automation editor, the pieces of a pairing flow, a camera that is
 * never shown as live, and energy. They keep the rules above: status is a glyph and a word, and a
 * requested value is never presented as a confirmed one.
 *
 * Patterns take **slots**, not exhaustive props: `DeviceControlCard` accepts a `primaryControl` node
 * rather than growing `onToggle`/`level`/`mode`/`setpoint` props, because the fourth product to turn
 * up always has a control nobody predicted.
 *
 * None of these layers talks to a device. There is no transport here — no MQTT, no BLE, no Matter, no
 * WebSocket, no discovery. These components render state a product gives them and report intent back
 * through callbacks; see the package README.
 *
 * Styling is Tailwind utilities on the KinetixUI token contract (`bg-muted`, `text-label-md`, …).
 * This package does not import `@kinetixui/tokens`, so those classes resolve in an app that already
 * has the token stylesheet and this library in its Tailwind `content`. Motion uses Tailwind's own
 * `motion-reduce:` variant and only core Tailwind animations — the package ships no CSS, so a custom
 * `@keyframes` would silently do nothing in a consumer's build.
 */

/* ------------------------------------------------------------------ primitives */
export { BatteryIndicator, type BatteryIndicatorProps } from "./battery-indicator";
export { DeviceIcon, type DeviceIconProps } from "./device-icon";
export { DeviceIdentity, type DeviceIdentityProps } from "./device-identity";
export { DeviceStatusBadge, type DeviceStatusBadgeProps } from "./device-status-badge";
export { LastSync, type LastSyncProps } from "./last-sync";
export { MetricStatus, type MetricStatusProps } from "./metric-status";
export { SensorReading, type SensorReadingProps } from "./sensor-reading";
export { SignalStrength, type SignalStrengthProps } from "./signal-strength";

/* ------------------------------------------------------------------ controls */
export { DeviceLevelControl, type DeviceLevelControlProps } from "./device-level-control";
export { DeviceModeControl, type DeviceModeControlProps, type DeviceModeOption } from "./device-mode-control";
export { DevicePowerControl, type DevicePowerControlProps } from "./device-power-control";
export { DeviceSetpointControl, type DeviceSetpointControlProps } from "./device-setpoint-control";

/* ------------------------------------------------------------------ patterns */
export { ActivityTimeline, type ActivityTimelineProps } from "./activity-timeline";
export { AlertCard, type AlertCardProps } from "./alert-card";
export { AlertList, type AlertListProps } from "./alert-list";
export { AutomationBuilder, type AutomationBuilderProps, type KinetixBuilderSubject, type KinetixBuilderTarget } from "./automation-builder";
export { AutomationRuleView, type AutomationRuleViewProps } from "./automation-rule-view";
export { CameraDeviceCard, type CameraDeviceCardProps } from "./camera-device-card";
export { CommandLifecycle, type CommandLifecycleProps } from "./command-lifecycle";
export { CommandStatus, type CommandStatusProps } from "./command-status";
export { ConnectionHealth, type ConnectionHealthProps } from "./connection-health";
export { DeviceCard, type DeviceCardProps } from "./device-card";
export { DeviceControlCard, type DeviceControlCardProps } from "./device-control-card";
export { DeviceGroupCard, type DeviceGroupCardProps } from "./device-group-card";
export { DeviceHealthSummary, type DeviceHealthSummaryProps } from "./device-health-summary";
export { DeviceListItem, type DeviceListItemProps } from "./device-list-item";
export { DeviceStateSummary, type DeviceStateSummaryProps } from "./device-state-summary";
export { EnergySummary, type EnergySummaryProps } from "./energy-summary";
export { FirmwareStatus, type FirmwareStatusProps } from "./firmware-status";
export { PairingFailure, type PairingFailureProps } from "./pairing-failure";
export { PairingMethodPicker, type PairingMethodOption, type PairingMethodPickerProps } from "./pairing-method-picker";
export { PairingStepper, type PairingStepperProps } from "./pairing-stepper";
export { RoutineCard, type RoutineCardProps } from "./routine-card";
export { SpaceBreadcrumb, type SpaceBreadcrumbProps } from "./space-breadcrumb";
export { SpaceRollup, type SpaceRollupProps } from "./space-rollup";
export { TelemetryCard, type TelemetryCardProps } from "./telemetry-card";
export { TelemetryGrid, type TelemetryGridProps } from "./telemetry-grid";
export { TelemetryMetric, type TelemetryMetricProps } from "./telemetry-metric";
export { TelemetryTrend, type TelemetryTrendProps } from "./telemetry-trend";
