# @kinetixui/iot

## 0.2.0

### Minor Changes

- 772cff8: Nine reusable React patterns, and the functions behind them.
  
  `@kinetixui/iot/react` gains a layer between the five primitives and a product: `DeviceCard`,
  `DeviceListItem`, `DeviceStateSummary`, `TelemetryTrend`, `TelemetryCard`, `ConnectionHealth`,
  `AlertCard`, `CommandStatus` and `FirmwareStatus`. Each composes the existing primitives rather than
  re-deriving their semantics, so what "stale" or "missing" means is decided in one place and every one
  of them agrees.
  
  `@kinetixui/iot/functions` gains `summarizeDevices` and `compareDeviceAttention` for device groups,
  `telemetryExtent` and `sortTelemetryPoints` for series, and `describeTelemetryQuality` to complete the
  `describe*` family. All React-free; the `/functions` closure is still importable from a server route,
  a worker or a CLI with no renderer.
  
  Two rules the patterns add, both drawn from what shipped connected-device products actually do:
  
  - **A device in transition does not show its last value.** `DeviceCard` and `DeviceListItem` show the
    state where the reading would be while a device is `syncing`, `pairing` or `updating`. A number
    rendered beside "Updating" is read as the current number, and it is not.
  - **A dropout is drawn as a dropout.** `TelemetryTrend` breaks the line at any point whose quality is
    `missing` or `error` and never interpolates across it, and excludes those points from the axis
    bounds — so a sensor that stopped answering cannot drag the scale to zero and render as a real
    measurement of nothing. The bounds are printed as text, which makes the chart's textual equivalent
    the thing everyone reads rather than a parallel description that can drift.
  
  Composition over configuration: `DeviceCard` takes an `action` node and positions it, with no
  `onToggle`/`onPower`/`onRun` surface, because a control implies a transport and this module still has
  none. `QuickAction` and `DeviceDetailHeader` were evaluated and deliberately left out — the first
  would duplicate `@kinetixui/ui`'s Button in a package that cannot depend on it, the second is a layout
  arrangement rather than a semantic one.
  
  Motion uses Tailwind's own `motion-reduce:` variant, so reduced-motion behaviour needs no stylesheet
  from the consumer and no page-level rule. No runtime dependency was added; the package still has zero.
  
  Device-supplied strings — alert messages, command errors, firmware versions — render as text, never
  markup, and a pathological version truncates with CSS rather than being sliced, so the whole value
  stays available to assistive technology.
  
  A minor rather than a major: everything here is additive, the five primitives are unchanged, and the
  module remains **Experimental**, so the API may still move before 1.0.

## 0.1.0

### Minor Changes

- 05e15c1: New package: `@kinetixui/iot`, a connected-device module for building products that pair, monitor,
  control, and troubleshoot devices.
  
  Generic by design — the device, telemetry, command, pairing, firmware and alert models carry only
  fields that mean the same thing to a soil probe, an infusion pump, a thermostat, a delivery van
  tracker and a fitness band. Anything narrower belongs in `metadata`.
  
  Three entry points, because the useful half has nothing to do with rendering: `@kinetixui/iot` for
  everything, `@kinetixui/iot/functions` for the models and the pure functions with no React, and
  `@kinetixui/iot/react` for five primitives — `DeviceStatusBadge`, `BatteryIndicator`,
  `SignalStrength`, `LastSync` and `SensorReading`. Each renders its fact as text, so the reading
  survives greyscale, forced-colors and a screen reader; colour is only ever a second encoding of
  something already written down.
  
  The rule running through all of it is that "we do not know" survives. A device that does not report a
  battery is not a device with a flat one, an undated reading is not a fresh one, and a firmware pair
  that cannot be compared is not up to date — each one a place where a convenient default becomes a lie
  the interface tells about someone's hardware.
  
  **Experimental**: the API may change without a major version. It is a separate module rather than part
  of `@kinetixui/ui`, it is not counted in the 98-component core surface, and it has no SwiftUI, Compose
  or Flutter port.
  
  No transport. There is no MQTT, BLE, WebSocket or HTTP client, no vendor adapter, and no code that
  parses or executes a device payload. It also has no runtime dependencies at all, including no
  `@kinetixui/tokens` or `@kinetixui/ui` — the token contract is spent as Tailwind class names and
  documented as a prerequisite rather than declared as a peer.
