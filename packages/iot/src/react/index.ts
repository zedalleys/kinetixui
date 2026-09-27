/**
 * The React entry point: `@kinetixui/iot/react`.
 *
 * Five primitives, all of which render their fact as text. None of them animates, so there is nothing
 * for `prefers-reduced-motion` to suppress.
 *
 * Styling is Tailwind utilities on the KinetixUI token contract (`bg-muted`, `text-label-md`, …).
 * This package does not import `@kinetixui/tokens` — see the module README — so those classes resolve
 * in an app that already has the token stylesheet and this library in its Tailwind `content`.
 */
export { BatteryIndicator, type BatteryIndicatorProps } from "./battery-indicator";
export { DeviceStatusBadge, type DeviceStatusBadgeProps } from "./device-status-badge";
export { LastSync, type LastSyncProps } from "./last-sync";
export { SensorReading, type SensorReadingProps } from "./sensor-reading";
export { SignalStrength, type SignalStrengthProps } from "./signal-strength";
