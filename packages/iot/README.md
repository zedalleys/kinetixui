# @kinetixui/iot

KinetixUI IoT is a connected-device module for building products that pair, monitor, control, and troubleshoot devices.

**Experimental.** The API may change without a major version while it finds its shape.

```bash
npm install @kinetixui/iot
```

## What it is

A product semantic layer for connected devices: the models, the classification rules, five small React
primitives, and nine composed product patterns built from them. Deliberately generic — the same
vocabulary suits smart agriculture, medical devices, smart home, industrial dashboards, and fleet and
logistics.

```ts
import { classifyBatteryLevel, formatLastSeen, type KinetixDevice } from "@kinetixui/iot/functions";
import { DeviceStatusBadge, SensorReading } from "@kinetixui/iot/react";
```

| import                     | contains                                          |
| -------------------------- | ------------------------------------------------- |
| `@kinetixui/iot`           | everything                                        |
| `@kinetixui/iot/functions` | models and pure functions — **no React**          |
| `@kinetixui/iot/react`     | the primitives and the product patterns           |

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

<https://kinetixui.com/docs/iot>
