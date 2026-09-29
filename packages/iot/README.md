# @kinetixui/iot

KinetixUI IoT is a connected-device module for building products that pair, monitor, control, and troubleshoot devices.

**Experimental.** The API may change without a major version while it finds its shape.

```bash
npm install @kinetixui/iot
```

## What it is

A product semantic layer for connected devices: the models, the classification rules, eight React
primitives, four device controls, and twenty-seven composed product patterns built from them. Deliberately
generic — the same vocabulary suits smart agriculture, medical devices, smart home, industrial
dashboards, and fleet and logistics.

The controls are the part that makes this more than a dashboard, and they share one rule: **what the
user asked for is drawn differently from what the device has confirmed.** A control that fills in the
instant you touch it is lying until the device agrees, and on a lock or an irrigation valve that lie
has a cost.

```ts
import { classifyBatteryLevel, formatLastSeen, type KinetixDevice } from "@kinetixui/iot/functions";
import { DeviceStatusBadge, SensorReading } from "@kinetixui/iot/react";
```

| import                     | contains                                          |
| -------------------------- | ------------------------------------------------- |
| `@kinetixui/iot`           | everything                                        |
| `@kinetixui/iot/functions` | models and pure functions — **no React**          |
| `@kinetixui/iot/react`     | the primitives, the controls and the patterns     |

## The connected-product layer (0.3)

The same rule — *a request is not a state* — extends past the controls. These are all React, all
data-in and callbacks-out, and none of them talks to a device:

| Moment | Components |
| --- | --- |
| A change settling | `CommandLifecycle` — requested, acknowledged (never drawn as confirmed), confirmed, or timed out / unreachable with a Retry |
| A reading you may not trust | `TelemetryMetric`, `TelemetryGrid`, `MetricStatus`; `TelemetryTrend` gains thresholds, gaps, a stale marker, a summary row and a "View data" table |
| Alerts and health | `AlertList`, `AlertCard` (kind, source, action, acknowledged/resolved), `DeviceHealthSummary` |
| Places | `SpaceBreadcrumb`, `SpaceRollup`, and `path` / `rollup` slots on `DeviceGroupCard` |
| What happened | `ActivityTimeline` |
| Automations | `AutomationRuleView` (read-only) and `AutomationBuilder` (a structured, keyboard-operable form) |
| Adding a device | `PairingMethodPicker`, `PairingStepper`, `PairingFailure` — UI pieces only |
| Two device families | `CameraDeviceCard` (a poster slot, never a video), `EnergySummary` (application-supplied numbers) |

Some things to know before relying on them:

- **Status is never colour alone.** Every state is a glyph with a different silhouette *and* a word.
- **`AutomationBuilder` edits a rule; it does not run one.** There is no engine, scheduler or trigger
  evaluation in this package.
- **`CameraDeviceCard` never shows or implies a live feed.** There is no `<video>`, no stream and no
  player; the picture is a poster slot the product fills, or a placeholder that says "no live feed".
- **`EnergySummary` is display only** — no billing, cost, carbon or forecast.
- **Pairing components are UI state.** No Bluetooth, Wi-Fi or discovery lives here.
- **Live regions are rare.** `CommandLifecycle` and `AutomationBuilder` each have one polite
  `role="status"`; `PairingFailure` is a `role="alert"`. Nothing else announces.

## What it is not

Not a transport. There is no MQTT, BLE, WebSocket or HTTP client here, no vendor adapter, and no code
that parses or executes a device payload. Nothing in this package opens a connection or holds a
credential. It models what a device *is*, so the layer that talks to one has something honest to
render into.

## The recurring design rule

Every classifier separates "we do not know" from a value. A device that does not report a battery is
not a device with a flat one; an undated reading is not a fresh one; a firmware pair that cannot be
compared is not up to date. Each of those is a place where a convenient default becomes a lie the UI
tells about someone's hardware, so `unknown` is a first-class result rather than a fallback.

## No dependencies, including no KinetixUI ones

This package has zero runtime dependencies and does not import `@kinetixui/tokens` or `@kinetixui/ui`,
not even as a peer. Two reasons:

**Nothing is imported at runtime.** The primitives style themselves with Tailwind utilities on the
KinetixUI token contract (`bg-muted`, `text-label-md`). Those are class names, not imports.

**A peer range would be a claim with nothing behind it.** A peer range says "bring me a
`@kinetixui/tokens` in this range and I will work", and it has to be maintained as a claim: when the
token version moves outside it, someone has to verify the package against the new contract and widen
it deliberately (RELEASING.md → *Peer ranges across cohorts*). Nothing here imports the tokens
package, so there is nothing to verify and no compatibility to claim — the range would only ever be a
number to keep in step. A documented prerequisite says the same thing without pretending to be
resolvable.

So the prerequisite is stated instead of depended on. For the React primitives to look right, an app
needs the KinetixUI token stylesheet loaded and this package inside its Tailwind `content`:

```js
// tailwind.config.js
content: ["./src/**/*.{ts,tsx}", "./node_modules/@kinetixui/iot/dist/**/*.js"],
```

The `functions` subpath needs none of that, and no renderer either.

## Accessibility

Each primitive renders its fact as text, so the reading survives greyscale, forced-colors mode and a
screen reader. Colour is always a second encoding of something already written down. Where a visual
shorthand is used — a battery bar, a signal meter, `5m ago` — the visuals are hidden from assistive
technology and the full sentence is supplied as the accessible name, so nothing is announced twice and
nothing is announced only as an abbreviation.

Those sentences come from the pure half (`describeBattery`, `describeSignal`, `describeLastSeen`), so
the text a screen reader receives is covered by the same unit tests as the classification.

No primitive animates, so there is nothing for `prefers-reduced-motion` to suppress — asserted, not
assumed.

## Documentation

- [Experience maturity pass](https://github.com/zedalleys/kinetixui/blob/main/docs/iot/EXPERIENCE-MATURITY.md) — the control layer, what was measured, and what is deferred

<https://kinetixui.com/docs/iot>

## License

MIT
