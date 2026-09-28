---
"@kinetixui/iot": minor
---

Nine reusable React patterns, and the functions behind them.

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
