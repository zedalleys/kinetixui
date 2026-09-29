# `@kinetixui/iot` — experience maturity pass

What changed, what was measured, and what was deliberately left for later.

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

Four were found by writing the tests, and would each have shipped silently.

| Defect | Why it mattered |
| --- | --- |
| `DeviceLevelControl` committed the **old** value | The input is controlled, so React rewrote its value back to the prop and the release handler read the stale number. A product wiring only `onCommit` would command 20 every time the user dragged to 80 |
| `DeviceSetpointControl` announced every change twice | The visible number carried `aria-live` as well as the sr-only sentence written to replace it |
| `DeviceModeControl` moved selection but not focus | In a roving-tabindex radiogroup the tabbable radio is the selected one, so focus was left on a radio that was no longer the group's tab stop |
| `RoutineCard` rendered a future run as "Last seen just now" | `formatLastSeen` floors elapsed time at zero by design, so it cannot express a *next* run |

A fifth was a packaging defect, measured rather than guessed — see below.

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

---

## 6. What this module still is not

Unchanged by this pass, and stated because a control layer is exactly what invites the assumption:

- **No transport.** No MQTT, BLE, Matter, Zigbee, LoRaWAN, WebSocket, HTTP polling or discovery.
  Controls report intent through callbacks; what happens next is the product's.
- **No automation engine.** `RoutineCard` renders a scene, routine or schedule that a product's own
  engine populates. Nothing evaluates a trigger or schedules a run.
- **No calendar product.** Scheduling is shown, not edited.
- **No video.** Nothing streams, decodes or displays a camera feed.
- **No cross-platform parity.** The controls are React. There is no SwiftUI, Compose or Flutter
  equivalent, and none is implied.
- **Not published.** `@kinetixui/iot` remains unpublished and experimental.

---

## 7. Deferred — P1

Explicitly not done, so that the P0 above is coherent rather than thin in nine places.

| Deferred | Why | Blocked on |
| --- | --- | --- |
| Three domain showcases (smart space, agritech, operations) on the website | Each is a whole screen; the control layer had to exist and be correct first | Nothing — next in line |
| Redesigned `/iot` device-detail and dashboard screens | Same | The showcases |
| Pairing flow composed from the new controls | `functions/pairing.ts` already models it; the composition is a screen, not a component | The showcases |
| Extending `iot-examples.manifest.json` so live previews and copyable source stay single-sourced | The generator exists and must not be bypassed by hand-written duplicate snippets | The showcases |
| A pattern gallery in `/docs/iot` | The prose documentation of the control layer landed in this pass; the gallery is presentation | The showcases |
| Real-browser visual QA at 390/768/1440, light/dark/RTL | jsdom axe and Storybook cover structure; contrast and layout need a browser | The showcases |
| A grouped/scheduled command queue | Genuinely useful, genuinely a product concern; modelling it here risks becoming the engine this module refuses to be | A real product's requirements |
| Optimistic-with-rollback as an opt-in | Some products legitimately want it for low-stakes devices. It needs a rollback story before it is safe to offer | Design |

---

## 8. Verification

```
pnpm --filter @kinetixui/iot typecheck   # clean
pnpm --filter @kinetixui/iot lint        # clean
pnpm --filter @kinetixui/iot test        # 9 files, 304 tests
pnpm build:iot && pnpm check:iot-dist    # React-free closure holds, 4 export paths resolve
pnpm check:content                       # ok
```

Passing tests are not the whole bar. The three control defects in §4 were found by writing tests that
failed, and the packaging defect in §5 was found by measuring rather than by any test — a suite that
only ever goes green is measuring the author's assumptions.
