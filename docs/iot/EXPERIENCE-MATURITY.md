# `@kinetixui/iot` — experience maturity pass

What changed, what was measured, and what was deliberately left for later.

This document has two parts. §1–§8 are the **0.2 control-layer pass**, kept as the record it was. **§9 is
"0.3 — Connected Product System"**, which builds on it. Where the two differ on a count or a status, §9 and the
current source win, and the older sections say so where it matters.

The brief was to move the IoT module from *enterprise cards displaying device data* toward *a modern
connected-device UI system*. SmartThings, IKEA Home smart and Homie were reference points for **how
connected-device UIs behave** — not for how they look. Nothing here reproduces their visual design,
layout, components, branding or trade dress.

---

## 1. The audit

Before this pass the module had **fourteen public React components**: five primitives and nine
patterns, ~5,465 lines, six examples on the website.

Every one of them rendered state. None of them changed it.

| Question a device product must answer | Covered before? |
| --- | --- |
| What is this device? | Partly — a name and a type string, no visual identity |
| What is it doing? | Yes — status, battery, signal, telemetry, alerts |
| Is it reachable? | Yes — `ConnectionHealth`, `LastSync`, staleness |
| **Can I turn it on?** | **No** |
| **Can I dim it, set it, switch its mode?** | **No** |
| **Did my command actually land?** | Partly — `CommandStatus` reported a command, but no control ever produced one |
| How is this room / zone / site doing? | No |
| What automations exist and are they running? | No |

So the gap was not "more cards". It was that the module had no **control layer** at all, and a
connected-device system is defined by the moment a user changes something and waits to find out
whether it worked.

### The defect that matters most

A device UI's hardest honest moment is the gap between *asked* and *confirmed*. Almost every product
fills it with an optimistic update: the switch slides over, the light icon turns yellow, and the UI
asserts a state the device has not reported. On a lamp that is harmless. On a door lock, an
irrigation valve or a pump it is a lie the user discovers minutes later, and it is the single
behaviour most worth designing correctly.

---

## 2. Principles adopted

1. **A request is not a state.** Every control draws what the user asked for differently from what
   the device confirmed, visually *and* in assistive technology. `aria-checked` reports the confirmed
   state while a request is open.
2. **One place decides what "pending" means.** `resolveControlState` takes a device status and a
   command status and returns one answer, so five controls on a screen cannot disagree.
3. **Pending is not interactive; stale is.** A second press while the first command is unresolved is
   how users toggle a device twice. But a stale device stays operable, because sending a command is
   exactly how you find out whether it is still there.
4. **Compose the platform, do not reimplement it.** The level control is a real
   `input[type="range"]` made transparent over a drawn track, so keyboard, pointer and assistive
   technology behave as the platform does.
5. **Slots, not thirty props.** Cards take nodes, because the fourth product always arrives with a
   control nobody predicted.
6. **The library owns no domain vocabulary.** Mode labels, group nouns and unit strings come from the
   product. A library that ships `"heat" | "cool" | "auto"` is wrong for the farm and the factory.
7. **Never colour alone.** Attention states carry a number or a word; offline is a dashed edge as
   well as a muted one.
8. **Motion is core Tailwind only.** The package ships no CSS, so a custom `@keyframes` would
   silently do nothing in a consumer's build — a mistake made and caught during this pass.

---

## 3. The component model

Four levels. Three are published API; the fourth is source to copy.

| Level | Count | What it is |
| --- | --- | --- |
| **Primitives** | 7 | One fact, rendered |
| **Controls** | 4 | One thing a user can change |
| **Patterns** | 12 | A composition of the above, plus a rule or two |
| **Examples** | — | Whole screens on the website, copied rather than installed |

These counts are **derived, not asserted**: `packages/iot/src/react/catalogue.test.ts` reads the
export barrel and fails if the README's numbers drift from it.

The table above is the state at the end of the 0.2 pass (7 primitives, 4 controls, 12 patterns). The current
barrel has 8 primitives, 4 controls and 27 patterns; see §9.

### Added in this pass

Headless (`@kinetixui/iot/functions`, React-free and asserted so):

- `types/control.ts`, `functions/control.ts` — availability, phase, level clamping, step snapping
- `types/identity.ts`, `functions/identity.ts` — device category inference and affordances
- `types/automation.ts`, `functions/automation.ts` — automation state, two-directional relative time

React:

- `DeviceIcon`, `DeviceIdentity` — twelve categories, state carried on the icon tile
- `DevicePowerControl`, `DeviceLevelControl`, `DeviceSetpointControl`, `DeviceModeControl`
- `DeviceControlCard`, `DeviceGroupCard`, `RoutineCard`

---

## 4. Defects found and fixed during the pass

Six were found before they shipped: four by writing the tests, one by measuring, one by looking.

| Defect | Why it mattered |
| --- | --- |
| `DeviceLevelControl` committed the **old** value | The input is controlled, so React rewrote its value back to the prop and the release handler read the stale number. A product wiring only `onCommit` would command 20 every time the user dragged to 80 |
| `DeviceSetpointControl` announced every change twice | The visible number carried `aria-live` as well as the sr-only sentence written to replace it |
| `DeviceModeControl` moved selection but not focus | In a roving-tabindex radiogroup the tabbable radio is the selected one, so focus was left on a radio that was no longer the group's tab stop |
| `RoutineCard` rendered a future run as "Last seen just now" | `formatLastSeen` floors elapsed time at zero by design, so it cannot express a *next* run |

A fifth was a packaging defect, measured rather than guessed — see §5.

A sixth was found only by *looking*. Automated checks reported zero page overflow across all twelve
viewport/theme/direction combinations, and zero elements whose `scrollWidth` exceeded their
`clientWidth`. A screenshot of the dashboard's side panel showed its content plainly cut off anyway.
The cause: `<fieldset>` defaults to `min-inline-size: min-content` and will not shrink below its
widest child, so the panel laid out at **370px inside a 320px column** — and the first scan missed it
because it ran against the settled layout, while the overflow only exists while a command is pending
and the longer "not yet confirmed" descriptions are on screen. `min-w-0` on the fieldset fixed it;
re-measured in the pending state, the spill went from +67px across ten elements to zero.

### And one in the project's own showcase

`/iot`'s flagship `device-dashboard` example hand-rolled a switch, a range input and a ± setpoint,
because no control existed to use. All three updated **optimistically** — `setPowered(!powered)` on
click, with no pending state anywhere — so the page demonstrating the module was demonstrating the
exact defect the control layer exists to prevent. It now composes the real controls, and holds each
command for 1.1s before confirming it, so the gap is visible rather than described.

A new `connected-space` example covers the composition layer: zones via `DeviceGroupCard`, devices
via `DeviceControlCard` with controls in slots, and automations via `RoutineCard`. Both previews and
their copyable source come from one file through `gen:iot-examples`, so they cannot drift.

---

## 5. Measurements

### Per-component cost, esbuild `--bundle --minify`, React external

Importing one component from `@kinetixui/iot/react` cost almost exactly what importing all of them
cost — the same defect `marketing/audits/TREE-SHAKING.md` documents for `@kinetixui/ui`, in the
package that audit holds up as the counter-example.

| Import | Before this pass | After the control layer | **After the fix** |
| --- | --- | --- | --- |
| one control | — | 45.91 KB | **4.03 KB** |
| `DeviceCard` alone | 22.01 KB | 45.91 KB | **10.25 KB** |
| five controls | — | 45.92 KB | **19.10 KB** |
| all components | 22.42 KB | 46.54 KB | 46.23 KB |

The cause was `Component.displayName = "Component"` — a top-level property assignment a bundler
cannot prove is safe to drop, so it kept every component reachable from the barrel. Isolated by
stripping the assignments from built output and re-measuring: 45.91 KB fell to 3.97 KB.

`withDisplayName()` moves the assignment inside a `/* @__PURE__ */`-annotated call. **Both**
annotations are load-bearing: esbuild drops a pure call only when its arguments are also
side-effect-free, so annotating the outer call alone measured 45.60 KB against 45.91 KB — no
meaningful change.

Net effect: an existing consumer importing only `DeviceCard` now pays **10.25 KB where they used to
pay 22.01 KB**, despite the package gaining nine components.

`packages/iot/src/react/tree-shaking.test.ts` guards this at the source. It was mutation-tested three
ways — reverting a component to the bare assignment, dropping only the inner annotation, and emptying
the scanned file list — and fails on each.

### Package

| | Before | After |
| --- | --- | --- |
| dist JS total | 53.2 KB | 103.0 KB |
| React-free `functions` closure | holds | holds |
| Runtime dependencies | 0 | 0 |

Total JS grows because the package genuinely contains more. Per-import cost is the number a consumer
pays, and it fell.

### Website

| Route | Before | After |
| --- | --- | --- |
| `/iot` | 14.7 kB / 441 kB First Load | 21 kB / 447 kB First Load |
| `/docs/iot` | 155 B / 501 kB | 155 B / 501 kB |

`/iot` carries one more interactive showcase and a dashboard rebuilt on the control layer.

---

## 6. What this module still is not

Unchanged by the 0.2 pass and by 0.3, and stated because a control layer is exactly what invites the assumption:

- **No transport.** No MQTT, BLE, Matter, Zigbee, LoRaWAN, WebSocket, HTTP polling or discovery.
  Controls report intent through callbacks; what happens next is the product's. Pairing components are screen
  state and discover nothing.
- **No automation engine.** `RoutineCard` renders a scene, routine or schedule that a product's own engine
  populates, and (since 0.3) `AutomationBuilder` edits a structured rule. Nothing evaluates a trigger or
  schedules a run.
- **No calendar product.** Scheduling is shown, not edited.
- **No video.** Nothing streams, decodes or displays a camera feed; `CameraDeviceCard` is a poster and a state.
- **No cross-platform parity.** The module is React. There is no SwiftUI, Compose or Flutter equivalent, and
  none is implied.
- **Simulation is demo state.** The deterministic simulation that drives the website's demos lives in the
  website, is not published, and is not a test double for a transport.
- **Release state is not stated here.** The published version and what it contains are read from
  `packages/iot/package.json` and the release process, never from this document. The package remains
  experimental and its API may change without a major bump.

---

## 7. Deferred — P1

Explicitly not done in the 0.2 pass, so that the P0 there was coherent rather than thin in nine places. Status
as of 0.3:

| Deferred | Status | Where it landed, or why it still waits |
| --- | --- | --- |
| Agritech and operations domain showcases | **Done in 0.3** | `agritech-environment` and `operations-environment`, beside `smart-space-environment`, on `/iot` (§9.4) |
| Redesigned `/iot` device-detail screen | **Done in 0.3** | `device-detail` is now the flagship pump-station screen with Overview, Controls, Telemetry, Automations, Activity and Settings tabs |
| Pairing flow composed from the new controls | **Done in 0.3** | `pairing-flow`, driven by the pairing state machine, with real failure and recovery states |
| A pattern gallery in `/docs/iot` | **Done in 0.3** | The patterns are documented by the moment they answer in `/docs/iot`, with a runnable example per moment on `/iot` |
| A grouped/scheduled command queue | Deferred | Genuinely useful, genuinely a product concern; modelling it here risks becoming the engine this module refuses to be. Blocked on a real product's requirements |
| Optimistic-with-rollback as an opt-in | Deferred | Some products legitimately want it for low-stakes devices. It needs a rollback story before it is safe to offer. Blocked on design |

---

## 8. Verification (0.2 pass)

This is the record for the 0.2 pass. The 0.3 run is §9.7.

```
pnpm --filter @kinetixui/iot typecheck   # clean
pnpm --filter @kinetixui/iot lint        # clean
pnpm --filter @kinetixui/iot test        # 9 files, 304 tests
pnpm build:iot && pnpm check:iot-dist    # React-free closure holds, 4 export paths resolve
pnpm --filter @kinetixui/web test        # 39 files, 1097 tests
pnpm check:content && pnpm check:iot-examples
```

### Real-browser pass

Chromium, against the production build of `/iot`:

- 390 / 768 / 1440, each in light and dark, each in LTR and RTL — **12 combinations, zero horizontal
  overflow, zero axe violations** (only the `region` rule disabled; colour contrast was checked).
- The central claim, asserted in a real browser rather than in jsdom: clicking the power switch
  leaves `aria-checked` **unchanged** while the command is in flight, disables the control so a
  second press cannot queue a duplicate, and flips only once the simulated device confirms.

Passing tests are not the whole bar. The three control defects in §4 were found by writing tests that
failed, and the packaging defect in §5 was found by measuring rather than by any test — a suite that
only ever goes green is measuring the author's assumptions.

---

## 9. 0.3 — Connected Product System

The 0.2 pass gave the module a control layer. 0.3 asks the next question: can a product be built on it whose
*whole* behaviour is honest — not only the switch, but the command that follows it, the reading that arrives
late, the alert someone owns, the rule being edited, the device being added and the place it lives in?

The answer was a headless state model (types and pure functions), a set of React patterns over it, a
deterministic simulation and three reference environments for the website, a redesigned `/iot` "Connected
Product Lab" page, and documentation that treats state honesty as a first-class principle rather than a detail
of one component. It stays React only, stays experimental, and adds no transport, no automation engine and no
video.

### 9.1 Baseline: what existed, at `5927117bbb85faa3a7a616a292b50940df48e89f`

Read from that commit's source, not from memory. "Exists" means present and used; "Partial" means the piece is
there but the moment it belongs to is not covered; "Missing" means nothing.

| Capability | Exists | Partial | Missing | Evidence at the baseline commit |
| --- | :---: | :---: | :---: | --- |
| Device controls (power, level, setpoint, mode) with requested vs confirmed | ✓ | | | `react/index.ts` exports four controls; §2 principle 1 |
| One place that resolves control availability | ✓ | | | `resolveControlState` in `functions/control.ts` |
| Command lifecycle (requested, acknowledged, confirmed, timed out, unreachable, retry) | | ✓ | | `types/command.ts` has `queued … expired` and `CommandStatus` renders one; no machine, no `acknowledged ≠ confirmed` rule, no retry, no timeout stage |
| Device categories and affordances | | ✓ | | `types/identity.ts`: 12 categories, affordances by category; no domain registry, no agriculture or industrial shapes |
| Metric registry and thresholds | | | ✓ | `types/telemetry.ts` has points, series and `quality` only |
| Reading trust (stale, unavailable, threshold states) | | ✓ | | Staleness and `quality` existed; `TelemetryTrend` broke lines at dropouts. No reading *state*, no thresholds, no `MetricStatus` |
| Accessible chart summary and data table | | ✓ | | Bounds printed under the plot; no summary sentence, no table |
| Alerts | | ✓ | | `KinetixDeviceAlert` (id, severity, message, raised, acknowledged) and `AlertCard`; no list, no kind, source, action or resolved |
| Activity history | | | ✓ | No type, function or component |
| Automation | | ✓ | | `KinetixAutomation` display model and `RoutineCard`; no rule model, validation or builder |
| Pairing | | ✓ | | `KinetixPairingStatus`, steps and code validation in `functions/pairing.ts`; no stages, methods, failure registry, flow machine or components |
| Places, hierarchy and rollup | | ✓ | | `DeviceGroupCard` and `summarizeDevices`; no tree, path or rollup |
| Health as distinct from status | | | ✓ | `DeviceStateSummary` counts by status only |
| Energy | | | ✓ | No type, function or component |
| Camera | | | ✓ | `camera` was a category only; no card |
| Deterministic simulation | | | ✓ | Demos used local `useState` and fixed timers |
| Reference environments | | ✓ | | One composition, `connected-space`, and a dashboard on the fleet demo data |
| Device detail screen | | ✓ | | Layout only; no tabs, no controls, no history |
| Per-import cost floor | ✓ | | | §5: `withDisplayName` fix; guarded by `react/tree-shaking.test.ts` |
| Docs covering the lifecycle, registries, hierarchy, simulation and RTL | | ✓ | | `/docs/iot` covered primitives, controls, a dozen patterns and pairing status |

At that commit the barrel was 7 primitives, 4 controls and 12 patterns, and the website carried seven
compositions (`device-fleet`, `device-detail`, `telemetry-board`, `connection-troubleshooting`, `alert-inbox`,
`device-dashboard`, `connected-space`).

### 9.2 Architecture decisions

1. **Headless first.** The state model is types and pure functions in `@kinetixui/iot/functions`, asserted
   React-free, and the React patterns are written over it. A product with its own components gets the same
   semantics, and a server route or worker can use the model with no renderer.
2. **Application adapter, not transport.** The module starts above the transport. A product writes one adapter
   that turns provider data into `KinetixDevice`, telemetry and lifecycle events, and carries a control's callback
   back the other way. The website draws this boundary as an accessible figure and `/docs/iot#transport-boundary`
   documents it.
3. **The lifecycle is a machine, and only `confirm` changes truth.** Nine stages, two values kept side by side
   (`requestedValue`, `confirmedValue`), transitions that return `ok: false` instead of throwing, and a late
   `confirm` accepted after a timeout because a device that answers late has told the truth.
4. **Registries, not switch statements.** The device taxonomy, the metric registry and the pairing-failure
   registry are each one table. A category's domain, label, affordances and group key are defined in one place
   and nothing else switches on a category.
5. **No vocabulary in the library.** Hierarchy levels are a `kind` string and a `parentId`; the model's tests
   build four different vocabularies (portfolio → zone, farm → irrigation zone, home → room, organisation →
   machine) and none is built in. Mode labels and units are the product's.
6. **Exclusive buckets for display.** A summary shown to a person must sum to the fleet size (§9.3).
7. **The simulation is demo state and lives in the website.** Deterministic (seeded), driven by an injected clock,
   running the real lifecycle machine, disclosed on every page that renders it, and not published.
8. **Compositions are source, not API.** The three environments and the rest are copied, not installed, because
   a screen is where a product's decisions live.
9. **Every claim on `/iot` is derived or asserted.** Version, entry points and the React peer come from
   `package.json`; the component counts are asserted against the React barrel; a scan test refuses unsupported
   claims (wearables, "coming soon", protocol support outside a denial).

### 9.3 Honest deviations from the brief

- **Lowercase domain unions.** Device categories and domains are lowercase strings (`"soil-sensor"`,
  `"irrigation"`), matching every other union in the module, rather than the capitalised labels a brief tends to
  use. The human-readable form comes from `describeDeviceCategory` / `describeDeviceDomain`.
- **Interaction-shape categories were retained, and a domain registry was added beside them.** The brief's
  domain list (lighting, climate, security, irrigation, …) was not substituted for the categories, because a
  category decides *which controls a device is offered* (a light, a lock, a pump, a motor) and a domain decides
  *how devices are grouped and filtered*. Replacing one with the other would have lost either the affordances or
  the grouping. Four categories were added for genuinely different shapes (`motor`, `weather-station`,
  `air-quality`, `soil-sensor`); everything else stays `sensor` or `meter`, expressed by metric.
- **Phase 1 found that offline is counted in a warning bucket.** `deriveDeviceHealth` gives an offline device the
  level `warning`, and `summarizeFleetHealth` also reports `offline` beside the health counts, so one offline
  device reads as "1 warning · 1 offline" and the numbers stop summing to the fleet. `DeviceHealthSummary` now
  gives every device exactly one bucket (offline or unreachable is its own, taken out of `warning`), and
  `/docs/iot` says so. The raw headless summary still overlaps by design and documents why.
- **The simulation is not in the package.** It was briefed as demo infrastructure and it is one: it lives in
  `apps/web/src/lib/iot-sim`, is not exported and is not published.
- **The hero device does not use the simulation layer.** The hero's single device is a `setTimeout` chain over the
  real lifecycle machine, so the first paint does not pull scenario data or a tick loop into the initial bundle.
  It is still labelled SIMULATION and still discloses.
- **Earlier compositions were kept, not deleted.** The fleet, dashboard, connected-space, telemetry-board,
  alert-inbox and connection-troubleshooting layouts stay on `/iot` under "More layouts", one at a time, because
  they answer different questions from the environments.
- **The page states no "shipped in <version>" badge.** The 0.3 additions describe the working tree, and the
  published version is whatever `package.json` and the release process say; a hand-typed badge would be a claim
  this document cannot keep true.
- **The tree-shaking floor.** The headless additions reopened the per-import cost problem §5 had closed: module-
  level initialisers a bundler cannot prove pure (registries built with `new Set`, `Object.keys`, `.map`) were
  kept and kept everything they referenced alive. The source-level guard
  `packages/iot/src/functions/tree-shaking.test.ts` now asserts that anything reachable from a top-level
  initialiser is a literal, a function, or a call annotated `/* @__PURE__ */`. Its header records one case
  (`clampBatteryLevel` alone: 4,939 B before, 65 B after annotation). Measured sizes: see §9.6 Measurements
  (filled by lead).

### 9.4 What was added

Headless (`@kinetixui/iot/functions`, React-free and asserted so): the command-lifecycle machine; device
connectivity, health and fleet summaries; the device taxonomy and domain registry; the metric registry,
reading evaluation, series summaries, gap detection, threshold crossings and accessible series sentences; alert
sorting, summary and acknowledgement; activity grouping; the automation rule model, validation and plain-language
summary; the pairing flow machine, methods and failure registry; the space tree, path and health rollup; and
energy summary and trend.

React: `MetricStatus`; `CommandLifecycle`; `TelemetryMetric`, `TelemetryGrid`; `AlertList`, `ActivityTimeline`;
`DeviceHealthSummary`, `SpaceBreadcrumb`, `SpaceRollup`; `AutomationRuleView`, `AutomationBuilder`;
`PairingMethodPicker`, `PairingStepper`, `PairingFailure`; `CameraDeviceCard`; `EnergySummary`. `TelemetryTrend`
gained thresholds, gaps, a stale marker, a summary row and a data table; `AlertCard` gained kind, source, action
and resolved.

Website: the deterministic simulation and three reference scenarios; the compositions `state-honesty`,
`smart-space-environment`, `agritech-environment`, `operations-environment`, `automation-builder`, `pairing-flow`,
`telemetry-history` and `alert-center`, and an evolved `device-detail`; the `/iot` Connected Product Lab page
(§9.5); and the documentation in `/docs/iot`.

### 9.5 The `/iot` page

Information architecture: hero, with one simulated device whose command goes requested → acknowledged →
confirmed (or times out when the reader makes the device stop answering) → a reference-environment switcher
(Smart space, Agritech, Operations) → device controls and state honesty → telemetry → alerts → automation →
pairing → device detail → more layouts → architecture (the transport-boundary figure) → what ships (counts read
against the barrel) → missing data → accessibility, right-to-left and motion → install → roadmap.

Client boundaries: the page is a server component. Client code is the hero's command strip, `LabTabs` (which
mounts only its active panel, so an interactive environment does not run until opened), the examples, which bring
their own boundaries, and the missing-data demo. Every environment tab carries the simulation disclosure.

### 9.6 Measurements

Measured sizes: see §9.6 Measurements (filled by lead).

<!-- LEAD: sizes -->

Baseline for the website routes, from §5, for the lead to compare against: `/iot` 21 kB / 447 kB First Load and
`/docs/iot` 155 B / 501 kB.

### 9.7 Verification

<!-- LEAD: validation -->

Tests that guard the 0.3 claims are in `apps/web/src/lib/iot-page.test.tsx` (the page: one `h1`, no skipped
heading level, named landmarks, a simulation disclosure in every environment, the diagram's accessible names,
no unsupported claims, counts against the barrel), `apps/web/src/components/iot/lab/hero-command-strip.test.tsx`
(a press changes the request and not `aria-checked` until the device confirms; a silent device times out and
offers a Retry) and the extended IoT rules in `apps/web/src/lib/current-truth.test.ts`.
