# @kinetixui/iot

## 0.3.0

### Minor Changes

- eeff208: Add a device control layer, and make the React entry point tree-shake per component.
  
  `@kinetixui/iot` could display a device but not operate one. Four controls —
  `DevicePowerControl`, `DeviceLevelControl`, `DeviceSetpointControl` and
  `DeviceModeControl` — now cover power, level, setpoint and mode, and they share one rule: what the
  user asked for is drawn, and announced, differently from what the device has confirmed.
  `resolveControlState` derives that from a device status and a command status so controls on one
  screen cannot disagree; pending is non-interactive so a second press cannot queue a duplicate, while
  stale stays operable because sending a command is how you find out whether a quiet device is there.
  
  Also new: `DeviceIcon` and `DeviceIdentity` (twelve device categories), `DeviceControlCard` and
  `DeviceGroupCard` (composition via slots rather than a prop per control), `RoutineCard` for scenes,
  routines and schedules, and React-free helpers for control state, device category and automation
  timing in `@kinetixui/iot/functions`.
  
  Packaging: importing one component used to cost 45.91 KB of a 46.54 KB library, because
  `Component.displayName = "…"` is a top-level assignment a bundler cannot prove is safe to drop.
  Moving it into a `/* @__PURE__ */`-annotated call restores per-component tree-shaking — one control
  now bundles to 4.03 KB, and `DeviceCard` alone to 10.25 KB against 22.01 KB before this release.
  
  No transport is added. Nothing here opens a connection or speaks MQTT, BLE, Matter or WebSockets.

### Patch Changes

- ded4054: Fix five accessibility defects on IoT surfaces: contrast on tinted cards, and duplicate landmark names.
  
  A real-browser axe pass over the IoT stories found nine colour-contrast failures and two duplicated
  navigation landmarks. Both are genuine WCAG failures, not false positives, and both predate the pull
  request that surfaced them.
  
  **Contrast.** `--muted-foreground` is tuned against `--background` and `--muted`, where it clears AA
  at 5.17:1. IoT device, group and activity cards tint their surface to carry state, and a 10% tint
  spends the whole margin: secondary text landed at 4.43:1 on `bg-primary/10` and 4.33:1 on
  `bg-destructive/10`, under the 4.5:1 that WCAG 1.4.3 requires. The token itself is not wrong —
  `neutral.600` is a published Figma value — so the fix is a new semantic token for the surfaces that
  tint, `--semantic-muted-on-container`, exposed as `text-muted-on-container`. This follows
  `--semantic-on-info-container`, which exists for the same reason on `bg-info/10`. It clears AA on
  every tint those cards use, worst case 4.79:1, and stays visibly lighter than `--foreground` so the
  type hierarchy is unchanged. Dark mode needed no new value and reuses `--muted-foreground`: a tint
  lightens a dark surface away from its text rather than toward it, so dark was already at 6.9–8.4:1.
  
  `DeviceControlCard`, `DeviceGroupCard`, `DeviceIdentity` and `ActivityTimeline` now use it for the
  text that sits on those surfaces. Nothing is restyled beyond the colour of that text.
  
  **Landmarks.** `SpaceBreadcrumb` named its `<nav>` "Location" for every instance, so a screen
  listing several places produced several identically-named navigation landmarks — which is no more
  useful than none when picking one from a landmark list. The accessible name now defaults to
  `Location: <current place>`, taken from the last item in `path`, and remains overridable with
  `label`. A breadcrumb rendered without a path still falls back to "Location".
  
  Patch rather than minor: the new token and utility exist only to carry the correction. Nothing is
  removed or renamed, no consumer has to adopt anything, and upgrading changes what was already wrong
  rather than adding capability to take up.
- 83be817: Animate the command lifecycle's stage changes.
  
  `CommandLifecycle` is the component whose entire job is communicating a command moving through
  requested → pending → acknowledged → confirmed, or failing. Every one of those transitions snapped:
  the step row's text colour, the marker's fill, ring and border, and the dimming of a glyph for a
  stage still ahead all changed with no transition on any of them. Measured in a real browser, the
  lifecycle had **zero** elements with a transition.
  
  The four stage-bearing nodes now carry `transition-colors` / `transition-opacity` at `duration-fast`
  with the usual `motion-reduce:transition-none`. Driving a stage change in a browser now catches the
  colour mid-interpolation — `rgb(110,110,110)` → `rgb(63,66,68)` at 40 ms → `rgb(5,11,16)` — where
  before it jumped. Under `prefers-reduced-motion: reduce` the stage still advances and the colour
  arrives immediately, with no animation running.
  
  No new token, no new value: this uses the existing semantic motion scale the rest of the module
  already uses. Nothing else about the component changed.
- eef85f2: Let `DeviceModeControl`'s segmented group fit a narrow viewport at large text.
  
  Each segment is a flex item with `flex-1` and a `truncate` label, but a flex item's `min-width`
  defaults to `auto` — its min-content width — so the `truncate` was inert and a segment could never be
  narrower than its own label. A group of several modes therefore could not fit a narrow viewport at all.
  It is visible at the default text size only on a very small screen; it is unmissable once the reader
  raises their text size, because the labels grow while the viewport does not. Measured in Chromium at
  200% text on a 320px viewport, the climate mode group pushed its page 212px sideways.
  
  The segment now carries `min-w-0`, so the segments share the available width and the label truncates
  as it was always meant to. Nothing changes at the default text size on a screen with room for the
  group: the segments were already `flex-1` and already sized themselves to the container.
  
  Patch rather than minor: no API is added, removed or renamed, nothing new is available to adopt, and
  the change corrects behaviour that was already wrong.
- 38a2802: `DeviceSetpointControl`'s ring now animates to a new target instead of jumping to it.
  
  The filled arc was drawn as a path of exactly the confirmed length and the marker placed at computed
  `cx`/`cy`. Neither is a property a browser can interpolate, so the ring snapped while the numeral beside it
  changed in the same frame — measured in Chromium, `transition-duration` was `0s` with nothing running 45ms
  after the device confirmed. The arc is now one fixed path revealed by `stroke-dashoffset` (`pathLength="1"`,
  so the offset is the fraction itself) and the marker is drawn once and rotated into place, both over
  `duration-base` from the existing scale with `motion-reduce:transition-none`. No new token, no new value, and
  no change to the component's API or to what it draws at rest.

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
