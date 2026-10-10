# @kinetixui/iot

## 0.6.0

### Minor Changes

- ade2eb4: Connect a real device provider without KinetixUI owning the connection (M4B). All additive; nothing existing changes.
  
  - **Device ledger.** `createDeviceLedger`, `requestDeviceChange`, `applyDeviceSignals` and `expireDeviceCommands` are pure functions over a plain value the application stores wherever it keeps state. Each registered capability has one command lifecycle, so the M1–M4A rules (correlation, supersession, report ordering, two clocks, adjusted confirmations) apply to provider traffic unchanged. Every call returns `{ ledger, transitions }`, structured records an application can log or audit; nothing is thrown, sent, scheduled or stored.
  - **Normalized signals and intent.** `KinetixDeviceSignal` (`report`, `snapshot`, `acknowledgement`, `result`, `connectivity`) is what an adapter emits; `KinetixCommandIntent` is what `requestDeviceChange` returns for the application to send. Neither carries a provider name, entity id, topic, URL or credential.
  - **Truth kept.** An acknowledgement never confirms. A lost link never fails, refuses or times out a request, and a returned link confirms nothing until the device reports. A timeout reads "may still apply", never refused. Late replies to a replaced request are refused in any order. Signals for devices or capabilities the application did not register are refused rather than added.
  - **Selectors.** `selectCapabilityLifecycle` feeds a control's `lifecycle` prop and keeps its identity until that capability changes; `selectDeviceConnectivity` feeds `resolveControlState`; `toDeviceState` derives a `KinetixDeviceState` for `summarizeDeviceState` and the device cards.
  
  A Home Assistant reference adapter (binary power, synthetic fixtures) lives in the repository's `packages/iot/reference/` and is not published. No provider adapter is included in the package, and the ledger has not yet been run against a live provider or a physical device.
- bd29090: Harden the command lifecycle for real devices (M4A). All additive; existing callers see no change unless they use the new fields.
  
  - **Device clocks.** A `report` event takes an optional `receivedAt`: when the application received it, on the same clock as `now`. When given, it decides whether a report can settle the current request, so a device whose clock runs behind the application's no longer leaves a request it carried out pending until it times out. Reports are still ordered against each other by `observedAt`, so stale-report protection is unchanged.
  - **Timeouts belong to a request.** A `timeout` event takes an optional `commandId`. A timeout for a superseded request, or for another request than the current one, is refused as `stale-response`, as a late reply already was, so a timer left over from a replaced request cannot time out the one that replaced it.
  - **Adjusted confirmations.** New `isLifecycleAdjusted(lifecycle)` and the lifecycle's `adjustedValue`: true when the device confirmed the request with a different value (a setpoint rounded to the hardware's step, a clamped level). Set only by a `confirm` that carries a different value, never by a `report`. No new stage, and nothing a control draws or says changes.
  - **Fix:** `summarizeDeviceState` compared requested and reported values by reference, so a requested colour equal to the reported one (a new object on every snapshot) was counted as unconfirmed. It now compares by content with `isSameDeviceValue`, as the rest of the package does.

### Patch Changes

- dfe0678: Say what an open request means once the device's link is gone, and stop calling a timeout a failure.
  
  - **`describeControlState(availability, "requested")`** now names the link first when the device is `offline` or `unreachable` ("Device offline. The requested change is not confirmed. Showing the last known setting") instead of "Change requested, not yet confirmed by the device", which promised progress the request was not making and never said the device was gone. `connecting` says "Connecting to the device. The requested change is not yet confirmed…", and `stale` adds "Device data is out of date". Online, acknowledged and unknown-link requests are unchanged. No availability or phase was added, and `resolveControlState`'s availability, phase and `interactive` are unchanged.
  - **A control's status region** says "Device offline. The requested change is not confirmed." (or "unreachable") when its open request loses the link, instead of keeping "Turning on, waiting for the device.", under every strategy. `connecting` and an unreported link keep the request's own sentence.
  - **The `failed` phase** reads "The last change was not confirmed. Showing the setting the device reports" (was "The last change failed…"): that phase also covers a timeout and an unreachable device, and neither proves the device refused.
  - **`describeControlOutcome` for `timed-out`** reads "No confirmation for on: the device did not confirm in time, so the change may still apply. It last reported off." (was "Could not turn on: the device did not answer…"), matching `CommandFeedback`'s "Timed out, may still apply". `failedPhrase` is no longer used for a timeout. Every control's outcome note and announcement follow.
  - **`summarizeDeviceState`** says "1 command not confirmed" instead of "1 command in progress" when the device is `offline` or `unreachable`.
  - The README's links to the device contract are absolute, so they work on npmjs.com and in `node_modules`.
  
  Migration: code that matched these sentences should match the new wording, or read `availability`, `phase` and `outcome` instead.
- ca5b53f: A "requested, not yet confirmed" chip on `DeviceLevelControl`, `DeviceSetpointControl`, `DeviceColorControl`, `DeviceLockControl` and `DeviceMediaControl` no longer pulses while the device is offline or unreachable. A request to a device whose link is gone is not progressing, and the pulse said it was. The chip keeps its dashed outline and words, which is how it already looks under reduced motion. No API change.

## 0.5.0

### Minor Changes

- 0b3ea71: Add monitoring and feedback primitives (M3): `DeviceBattery`, `DeviceConnection`, `CommandFeedback` and `DeviceActivity`, a shared data-freshness contract, and generic readings in `TelemetryMetric` and `EnergySummary`.
  
  - **Freshness.** `resolveFreshness({ observedAt, staleAfterMs, now, freshness })` → `fresh` / `stale` / `unknown` (`KinetixFreshness`). No default timeout: without a policy, or without a timestamp, freshness is `unknown`. Independent of connectivity.
  - **`DeviceBattery`.** Level, charging (`true` / `false` / `null` = the device cannot tell), freshness, product `thresholds` and capability `support`. Unknown is never 0 %, 100 % never implies charging, stale never says offline, `unsupported` says "No battery". One accessible sentence (`describeDeviceBattery`). `classifyBatteryLevel` and `resolveBatteryState` take optional thresholds (`KinetixBatteryThresholds`, `resolveBatteryThresholds`); defaults unchanged.
  - **`DeviceConnection`.** The six `KinetixConnectivityState`s as six shapes and words, last seen where meaningful, product transport text, optional signal; no animation. `describeDeviceConnection`, `normalizeConnectivityState` (missing → `unknown`), `connectionShowsLastSeen`.
  - **`CommandFeedback`.** An inline line or small panel over an existing `KinetixCommandLifecycle`: acknowledged is not confirmed, a timeout "may still apply", unreachable is not "failed", cancelled claims no rollback; Retry only when allowed; one polite status region only with `announce`. `describeCommandFeedback` (`KinetixCommandFeedback`, `KinetixCommandFeedbackTone`).
  - **`DeviceActivity`.** One device's history with a required `order` and an explicit origin. `KinetixActivityEvent` gains optional `origin` (`KinetixActivityOrigin`: user, device, automation, system, unknown; `KINETIX_ACTIVITY_ORIGINS`) and `commandId`; `resolveActivityOrigin` never infers a missing origin; `describeActivityOrigin`.
  - **`TelemetryMetric`.** `metric` is now optional; new `formatValue`, `unitLabel`, `previous` / `previousLabel` (a delta only with a real comparison, `resolveReadingDelta`), `range` (printed, never judged), `severity`, `statusLabel`, `freshness`, `support` and `unavailable`. Screen readers get one phrase (`describeTelemetryReading`, `describeReadingAge`). **Visible change:** a reading with no value and no `quality` now says "Unknown" (`data-value-state="unknown"`) instead of "Unavailable"; `quality` `missing`/`error` still says "Unavailable". `data-reading-state` is unchanged.
  - **`EnergySummary`.** `summary` is now optional. Without it, the metrics form composes `TelemetryMetric`s — `power`, `energy`, `cost`, `metrics` over a product-named `period` (`EnergyReading`) — assuming no unit, currency or period. The breakdown form is unchanged.
  
  No capability kind or role was added. Migration: none required. Code that looked for the word "Unavailable" on an empty `TelemetryMetric` should read `data-value-state` instead.

## 0.4.0

### Minor Changes

- 9407bc5: Add colour, lock and media controls, and stop reading a missing device status as offline (M2B).
  
  - **Unknown is not offline (G12).** `resolveControlState()` with no device status, or one it cannot read, now resolves to availability `unknown` ("Device status unknown") instead of `offline` ("Device offline. Showing the last known setting"). It still refuses input, as before. `KinetixControlAvailability` gains `unknown`, `unreachable` and `connecting`; the status spelling `unreachable` keeps its word, and a new optional `connectivity` input (a `KinetixConnectivityState` or `{ state }`) lets a control take the link's own claim. `DeviceControlCard` says "Status unknown", "Unreachable" or "Connecting" rather than "Offline".
  - **`DeviceColorControl`.** The colours a product offers (RGB or a white point, `KinetixDeviceColor`) as a named radiogroup with a preview, on `lifecycle` / `strategy` / `announce`. Colours are compared by value. New functions: `normalizeDeviceColor`, `describeDeviceColor`, `formatDeviceColorHex`, `previewDeviceColor`, `findDeviceColorOption`.
  - **`DeviceLockControl`.** Never shows "Locked" before the device reports it. Accepts `confirmed` (default) and `hybrid` only (`KinetixLockStrategy`); `optimistic` from untyped code is drawn as `confirmed`. New functions: `normalizeLockState`, `resolveLockStrategy`, `describeLockState`, `describeLockOutcome`, `lockActions`, `LOCK_SENTENCE`.
  - **`DeviceMediaControl`.** Play/pause, previous/next, a scrubber, volume and mute for any playback endpoint, with a lifecycle per command. Every action is a callback; the package plays nothing. Seek and volume reuse `DeviceLevelControl`. New functions: `normalizeMediaPlaybackState`, `describePlaybackState`, `describePlaybackOutcome`, `nextPlaybackRequest`, `formatMediaTime`, `describeMediaTime`, and the `PLAYBACK_SENTENCE`, `SEEK_SENTENCE` and `MUTE_SENTENCE` options.
  
  Migration: an exhaustive `switch` over `KinetixControlAvailability` needs `unknown`, `unreachable` and `connecting` arms. A control whose device status was missing now says "Device status unknown" where it said "Device offline"; pass `deviceStatus: "offline"` (or `connectivity: "offline"`) when you do know the device is offline.

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
- f512e62: Mature the existing device controls (M2A).
  
  - **Connectivity truth.** `KinetixConnectivityState` gains `connecting` and `unknown`. Missing connectivity now summarises as `unknown` instead of `offline`; a missing or unrecognised device status derives `unknown` connectivity and no longer adds an "offline" health reason; a backend status of `unreachable` stays `unreachable`. `describeConnectivity` says "Connecting" and "Connection unknown". `normalizeDeviceStatus` is unchanged.
  - **Controls on the lifecycle.** `DevicePowerControl`, `DeviceLevelControl`, `DeviceSetpointControl` and `DeviceModeControl` accept optional `lifecycle`, `strategy` (`confirmed` default, `optimistic`, `hybrid`) and `announce` props. With a lifecycle they announce each stage once in a polite `role="status"` region, set `aria-busy` while a request is open, and say in words when a request did not happen (rolling back under `optimistic`/`hybrid`).
  - **New functions:** `resolveControlPresentation`, `describeControlOutcome` and `supersedeCommandLifecycle`. Superseding a request records the one it replaced in `supersededCommandIds`, so a late reply to it is refused as `stale-response` even when the new request carries no id of its own.
  
  Migration: nothing is required, and the value props still work (they are now optional). Two things to know: an exhaustive `switch` over `KinetixConnectivityState` needs `connecting` and `unknown` arms; and `DevicePowerControl` with `requested` now keeps its knob at the reported state by default (`confirmed`). Pass `strategy="hybrid"` for the previous moving-track drawing.
- 20f725d: Device interaction contract (M1), all in `@kinetixui/iot/functions` and additive:
  
  - Command lifecycle: optional `commandId` correlation (a reply to a superseded request is refused as `stale-response`), a `report` event for reported state that is not an answer (reconnects, physical switches; out-of-order reports with `observedAt` are refused as `stale-report`), and a machine-readable `reasonCode` from `code` on `fail`/`timeout`/`deviceUnreachable`/`cancel`.
  - Interaction strategies: `KinetixCommandStrategy` (`confirmed` default, `optimistic`, `hybrid`) and `presentCommandValue`, which decides what a control draws without changing the lifecycle.
  - Capabilities: kinds `color` and `media`, an optional open-vocabulary `role`, `resolveCapabilitySupport` (`supported` / `read-only` / `unsupported`) and `findCapabilitiesByRole`.
  - `resolveBatteryState` (level, availability, charging), `isSameDeviceValue`, and optional `metadata` on activity events.
  
  Type-level note: `KinetixCommandLifecycleEvent`, `KinetixLifecycleRejection["code"]` and `KinetixDeviceCapabilityKind` gain members, so an exhaustive `switch` over them in consumer code needs a new arm. No runtime behaviour changes for existing callers.
- e289c14: Add the Connected Product System patterns, which reached 0.3.0 without a changeset of their own.
  
  Thirteen React components, with the React-free models and functions behind them in `@kinetixui/iot/functions`:
  
  - **Alerts:** `AlertList`.
  - **Automations:** `AutomationBuilder` and `AutomationRuleView`.
  - **Cameras:** `CameraDeviceCard`.
  - **Energy:** `EnergySummary`.
  - **Health and spaces:** `DeviceHealthSummary` and `SpaceRollup`.
  - **Pairing:** `PairingMethodPicker`, `PairingStepper` and `PairingFailure`.
  - **Telemetry:** `TelemetryGrid`, `TelemetryMetric` and `MetricStatus`.
  
  The functions cover the logic behind them — alert grouping and acknowledgement, automation rule editing and
  validation, pairing flow and recovery, device health assessment, space trees and rollups, and metric thresholds
  and series gaps — so the same behaviour can be used without React. All additive; nothing earlier changed.

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
- cd2893f: `DeviceSetpointControl`'s `ring` presentation keeps its ± buttons clear of the gauge. They were pinned to the ring's
  bottom corners with fixed insets, directly under the arc's two ends: measured in Chromium, 6.6–16.7px into the end
  markers at every width. They now sit in a row pulled into the empty band below the arc's ends by a margin derived from
  the arc's own geometry, so the gap holds at any size (19–28px). The ring is a size container: narrower than 12rem
  (a phone at 200% text, browser zoom) the decoration steps aside and the numeral and buttons stack, where before the
  numeral overflowed the ring and the 88px buttons covered it. The current reading wraps instead of truncating.
  Buttons keep their 44px targets, labels and order.
  
  `BatteryIndicator`'s `pill` presentation wraps inside its container instead of overflowing it at 200% text.
  
  Verified by the new `check:iot-state-spatial` browser gate.
- 38a2802: `DeviceSetpointControl`'s ring now animates to a new target instead of jumping to it.
  
  The filled arc was drawn as a path of exactly the confirmed length and the marker placed at computed
  `cx`/`cy`. Neither is a property a browser can interpolate, so the ring snapped while the numeral beside it
  changed in the same frame — measured in Chromium, `transition-duration` was `0s` with nothing running 45ms
  after the device confirmed. The arc is now one fixed path revealed by `stroke-dashoffset` (`pathLength="1"`,
  so the offset is the fraction itself) and the marker is drawn once and rotated into place, both over
  `duration-base` from the existing scale with `motion-reduce:transition-none`. No new token, no new value, and
  no change to the component's API or to what it draws at rest.
- 6b1be4e: Motion correctness. `Spinner` and the `FileUpload` loader now rest as a static ring under `prefers-reduced-motion` instead of carrying a "slow to three seconds" class the reduced-motion floor made dead; the ring keeps its `role="status"` name and survives forced colours (the open side is `Canvas`, since forced colours closes a transparent border). `InputOTP`'s caret states its reduced form explicitly. `@kinetixui/iot` swaps CSS-default `ease-out` for the `ease-enter` token (the identical curve) and `pairing-method-picker`'s `transition-all` for the three properties that change.

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
