# The KinetixUI device interaction contract

How KinetixUI models a connected device changing state: what a user asked for, what the device
reports, and what a control is allowed to draw in between. M1 laid the foundation; M2A made connectivity
truthful and wired the four existing React controls to it (§4.1, §6.1). The audit behind both is
[IOT-MATURITY-AUDIT.md](./IOT-MATURITY-AUDIT.md).

The contract lives in `@kinetixui/iot/functions`: TypeScript types and pure functions, no React,
no DOM, no runtime dependencies. The React controls in `@kinetixui/iot/react` consume it. It is implemented and tested in TypeScript only. Nothing in this
document is implemented in Angular, SwiftUI, Jetpack Compose or Flutter yet (see §8).

## 1. Ownership boundary

| KinetixUI owns | The application owns |
| --- | --- |
| The command lifecycle and its legal transitions | Sending commands: MQTT, BLE, HTTP, Matter, HomeKit, vendor SDKs |
| Desired vs reported state, and how each is presented | Receiving replies and reports, and turning them into lifecycle events |
| Interaction strategies (confirmed, optimistic, hybrid) | Choosing a strategy per control, and timeouts (`now`, deadlines) |
| Capability shapes, roles and support answers | Discovering devices and their capabilities |
| Telemetry freshness, battery and health classification | Streaming video, codecs, players |
| Accessible sentences for every state | Localisation of those sentences, error copy for its own codes |

The package never opens a connection, never holds a credential and never parses a device payload.

## 2. Desired and reported state

A device is not a variable. Asking a lamp to turn on sends a message that may be queued by a gateway,
delivered to a sleeping radio seconds later, refused by the hardware, or lost. Until the device
reports back, the honest statement is "you asked for on; it last said off".

| Brief term | KinetixUI name | Meaning |
| --- | --- | --- |
| Desired state | `requestedValue` (lifecycle), `requestedValues` (device state) | What the user asked for. Never presented as the device's state. |
| Reported state | `confirmedValue`, `confirmedValues` | What the device last reported. The only values that are true. |

The names predate this document and were kept: renaming a public API for vocabulary would break every
consumer for no behavioural gain.

**Why instant-looking UI can be dishonest.** A switch that flips the moment it is pressed claims the
device's state while the app only knows its own request. On a fast LAN the claim is usually right. On a
battery sensor behind a gateway, a door lock, an irrigation valve or an infusion pump it is the
moment a user is told something false about physical equipment, and either presses again (toggling it
back) or walks away believing the door is locked.

## 3. The command lifecycle

`KinetixCommandLifecycle` is a state machine driven by events the application reports.

| Stage | Meaning | Brief's state |
| --- | --- | --- |
| `idle` | Nothing in flight | idle |
| `requested` | Sent, no reply yet | requested / pending |
| `acknowledged` | Received by the device or gateway, **not done** | pending |
| `retrying` | Sent again; `attempts` counts | pending |
| `confirmed` | The device reported the requested value | confirmed |
| `failed` | The device or the path refused, or the device came back not in the requested state | failed |
| `timed-out` | No reply within the application's deadline; it may still run | timeout |
| `unreachable` | The device could not be reached | unavailable |
| `cancelled` | The user withdrew the request; says nothing about the device | — |

Events: `sent`, `acknowledge`, `confirm`, `fail`, `timeout`, `deviceUnreachable`, `retry`, `cancel`,
and (new in M1) `report`. A refused event returns `ok: false` with the same state object and a
`rejection.code`; it never throws.

### M1 additions

| Addition | Problem it solves |
| --- | --- |
| `commandId` on the lifecycle, on `sent`/`retry`, and on responses | A reply to a superseded request was accepted as confirming the newer one. Now refused as `stale-response`. Opt-in: no ids, no change. |
| `report` event with optional `observedAt` | Reported state that is not an answer (reconnect announcement, physical switch, periodic push) had no input. Previously the only way in was `confirm`, which labelled any value "confirmed". |
| `stale-report` rejection | A delayed report cannot overwrite a newer one. Only reports with `observedAt` are ordered. |
| `reasonCode` (from `code` on `fail`, `timeout`, `deviceUnreachable`, `cancel`) | A stable machine-readable reason. The application defines the codes and owns the user-facing message. |
| `isSameDeviceValue` | Structural equality, so a reported colour object matches a requested one. |

### What `report` does

| Stage when it arrives | Report equals request | Report differs |
| --- | --- | --- |
| `requested`, `acknowledged`, `retrying` | → `confirmed` | stays pending (an intermediate value) |
| `unreachable` | → `confirmed` | → `failed` (the device is evidently back, and not in the requested state) |
| `timed-out` | → `confirmed` | stays `timed-out` (it may still run) |
| `failed` | → `confirmed` (the thing asked for has happened) | stays `failed` |
| `idle`, `confirmed`, `cancelled` | value tracked, stage kept | value tracked, stage kept |

In every case the reported value becomes `confirmedValue`.

### The asynchronous cases, and where they are tested

All in `packages/iot/src/functions/device-contract.test.ts` unless noted.

| Case | Representation |
| --- | --- |
| Immediate acknowledgement | `sent` → `confirm` |
| Delayed acknowledgement | `sent` → `acknowledge` → … → `confirm`; acknowledged is never drawn as confirmed |
| Failure | `fail` with `code`; requested stays as intent, reported unchanged |
| Timeout | `timeout`; `isLifecycleTimedOut(state, now, ms)` measures from the latest send (`lifecycle.test.ts`) |
| Duplicate acknowledgement | refused as `illegal-transition`, same state object returned |
| Stale acknowledgement | refused as `stale-response` (correlated) or `stale-report` (ordered) |
| Device goes offline while pending | `deviceUnreachable` |
| Device reconnects later | `report` → `confirmed` or `failed`, then `retry` with a new `commandId` |
| Stale telemetry | `evaluateReading` → `stale`, never `normal` |
| Unsupported capability | `resolveCapabilitySupport` → `unsupported` |

## 4. Interaction strategies

`presentCommandValue(lifecycle, strategy)` decides what a control draws. It never changes the
lifecycle: a strategy changes what is shown, not what is believed.

| Strategy | While pending | After failure / timeout / cancel | Use for |
| --- | --- | --- | --- |
| `confirmed` (**default**) | Reported value, pending marked | Reported value | Anything with physical consequences: locks, valves, pumps, medical devices, industrial drives |
| `optimistic` | Requested value, pending tracked silently (`indicatePending: false`) | Reported value, `rolledBack: true` | Fast, cheap, reversible changes (a lamp's brightness on a local network) |
| `hybrid` | Requested value as a target, pending marked (`indicatePending: true`) | Reported value, `rolledBack: true` | Slow changes the user wants to see heading the right way (a thermostat target, a blind's position) |

`rolledBack` exists because a value that silently snaps back reads as a malfunction: the UI must say
the change did not happen.

Since M2A the four React controls accept a strategy (§4.1). `confirmed` is the default.

### 4.1 The control API (M2A)

`DevicePowerControl`, `DeviceLevelControl`, `DeviceSetpointControl` and `DeviceModeControl` each take
three optional props on top of their existing ones:

| Prop | Meaning |
| --- | --- |
| `lifecycle` | The change's `KinetixCommandLifecycle`. When given it is the only source of truth: the value props (`state`/`requested`, `value`/`target`, `target`/`requestedTarget`, `value`/`requested`) are ignored. |
| `strategy` | `confirmed` (default), `optimistic` or `hybrid`. Changes what is drawn while a change is open, never the lifecycle. |
| `announce` | A polite `role="status"` region with one sentence per stage. On by default when a `lifecycle` is passed, off otherwise. Pass `false` when `CommandLifecycle` renders the same lifecycle, so it is heard once. |

There is no second state machine. Every control goes through one pure function:

```ts
const view = resolveControlPresentation({ lifecycle, strategy });     // presentCommandValue + request + outcome
const sentence = describeControlOutcome(view, { formatValue, pendingPhrase, failedPhrase });
```

and reads only the presentation's fields (`valueSource`, `indicatePending`, `rolledBack`, `unsuccessful`),
never the strategy's name. The legacy props are turned into a lifecycle (an open request when `requested`
differs from the reported value) and go through the same function. Without a `control`, a lifecycle still
decides interactivity (pending is not pressable) and no device status is assumed.

```tsx
const [lifecycle, setLifecycle] = useState(() => startCommandLifecycle({ confirmed: "off" }));

<DevicePowerControl
  label="Workshop lamp"
  lifecycle={lifecycle}
  strategy="confirmed"
  onToggle={(next) => {
    const id = crypto.randomUUID();
    setLifecycle((l) => advanceCommandLifecycle(supersedeCommandLifecycle(l, next, { commandId: id }), { type: "sent" }));
    send(next, id); // the application's transport; replies become confirm/fail/report events
  }}
/>
```

`supersedeCommandLifecycle(previous, requested, { commandId })` replaces an open request (a dimmer
dragged 20 → 40 → 80): it keeps the reported value and `reportedAt`, so report ordering survives, and drops
the old correlation id, so a late reply to 40 is refused as `stale-response`.

| | `confirmed` | `hybrid` | `optimistic` |
| --- | --- | --- | --- |
| Power | Stays at the reported end with its mark; dashed track; "Turning on"; `aria-checked` = reported | Track and hollow knob move to the request; no mark; "Turning on" | Moves to the request, filled, no mark; "On"; `aria-checked` = shown |
| Level | Numeral and fill = reported; hatched extension, marker and chip for the request | Numeral = request; chip names what the device reports | Numeral and fill = request; nothing else |
| Setpoint | Numeral = reported target; chip; ring with a dashed request | Numeral = request; chip names the device's target | Numeral and arc = request |
| Mode | Reported mode checked; request dashed and named "requested, not yet confirmed" | Request raised and dashed; reported mode stays checked | Request checked, without the confirmed tick |

Every strategy sets `aria-busy` while a request is open, and after a request that did not happen shows
and announces a sentence such as "Could not turn on. The device still reports off." (`data-outcome`;
`data-rolled-back` when the display moved back).

**Accessibility.** Announcements are polite and one per stage: "Turning on, waiting for the device." →
"On." or "Could not turn on. The device still reports off."; timed-out and unreachable endings name
themselves. `optimistic` announces nothing while it waits (it chose not to mark the wait) but always
announces the outcome. The status region exists before its first message. `aria-checked` stays the
reported value whenever the request is marked as unconfirmed. Disabled (`disabled`) and unavailable
(`aria-disabled` on a mode) are unchanged. Verified with jsdom tests and in Chromium by
`pnpm check:iot-strategies`; not with a manual screen reader.

**Migration.** Nothing is required. Value props keep working and announce nothing new. Two visible
changes: `DevicePowerControl` with `requested` no longer moves its knob by default (pass
`strategy="hybrid"` for the previous drawing), and the value props are optional.

## 5. Capabilities, not device classes

A device is a list of `KinetixDeviceCapability` entries. `kind` is the interaction shape (how it is
operated); the optional `role` is what it means.

| Kind | Shape |
| --- | --- |
| `power` | Binary on/off-like |
| `level` | A number on a range |
| `setpoint` | A target a device works toward |
| `mode` | One of a product-supplied set |
| `color` | A structured colour value (**new in M1**) |
| `telemetry` | A reading |
| `media` | A preview or stream surface the application renders (**new in M1**; the package carries no media) |
| `action` | A one-shot command |

Roles are an open vocabulary (`brightness`, `volume`, `temperature-setpoint`, `lock`,
`camera-preview`, … or any product string). No function changes behaviour by role.

The brief's validation devices, as data (all asserted in the contract test):

| Device | Capabilities (kind / role) |
| --- | --- |
| Lamp | power, level/brightness, color |
| Speaker | power, mode/media-playback, level/volume, telemetry/battery |
| Camera | media/camera-preview, media/live-stream, power/recording, power/motion-detection, power/privacy |
| Door lock | mode/lock (locked, unlocked), telemetry/battery |
| Air conditioner | power, setpoint/temperature-setpoint, level/fan-speed, telemetry/humidity, mode/operating-mode |
| Irrigation valve | power/irrigation-zone, telemetry flow |
| Soil sensor | telemetry soil-moisture, telemetry/battery |
| Infusion pump | setpoint/infusion-rate, action start |
| Conveyor motor | power, level (rpm) |

**Deliberately not capabilities.** *Schedule* is the automation model (`KinetixAutomation`), *activity*
is `KinetixActivityEvent`, and *access* (who may unlock, who did) is application business logic on top
of a `lock` capability and the activity log.

## 6. Other contract pieces

| Concept | Type / function | Note |
| --- | --- | --- |
| Connection | `KinetixConnectivityState`: online, offline, unreachable, stale, connecting, unknown | See §6.1. "Degraded" is a health level, deliberately separate from the link. |
| Health | `KinetixDeviceHealthLevel` + reasons | Unchanged |
| Telemetry | `KinetixTelemetryPoint` (value, unit, timestamp, quality), `evaluateReading` | Unchanged |
| Battery | `KinetixBatteryState` → `resolveBatteryState`: level, available, charging (or `unknown`), low, critical | New in M1 |
| Device error | `KinetixDeviceFault.code`; lifecycle `reasonCode` | Codes are the application's |
| Activity | `KinetixActivityEvent`: deviceId, kind, timestamp, actor, source, status, `metadata` | `metadata` new in M1 |

### 6.1 Connectivity (M2A)

Each state needs its own evidence, and the absence of evidence is a state of its own.

| State | Means | Words (`describeConnectivity`) |
| --- | --- | --- |
| `online` | Reachable, per the current evidence | Online |
| `offline` | Affirmative evidence the device is gone | Offline |
| `unreachable` | An attempt was made and failed | Unreachable |
| `stale` | The evidence is too old to trust | Data is out of date |
| `connecting` | An attempt or session is being established | Connecting |
| `unknown` | Not enough information | Connection unknown |

`unknown`, `connecting`, `unreachable` and `stale` are each distinct from `offline`.

| | Before M2A | After |
| --- | --- | --- |
| `summarizeDeviceState` with no connectivity | `offline`, `needsAttention: true` | `unknown`, no attention |
| `deriveDeviceConnectivity` with a missing or unrecognised status | `offline` | `unknown` |
| `deriveDeviceConnectivity({ status: "unreachable" })` | `offline` | `unreachable` |
| `deriveDeviceHealth` with an unrecognised status | warning, "The device is offline" | `unknown`, no reason |
| `connecting` / `unknown` in health | not representable | no reason, no evidence |

`normalizeDeviceStatus` still falls back to `offline`: that is the device *status* a badge shows, and
`isKnownDeviceStatus` tells the two apart. Fleet and space rollups still count `offline` and `unreachable`
as offline; `unknown` and `connecting` are not counted as either. An exhaustive `switch` over
`KinetixConnectivityState` in consumer code needs two new arms.

## 7. Examples by domain

**Smart home.** A lamp's brightness uses `optimistic`: the slider moves at once, and if the bridge
times out the slider returns and the UI says the change did not apply. Its door lock uses `confirmed`.

**Agritech.** An irrigation valve behind a LoRa gateway is acknowledged by the gateway in a second and
confirmed by the valve a minute later. The control stays `confirmed`; `acknowledged` reads "the
gateway has it, the valve has not moved". If the valve drops off and reports `closed` on reconnect,
the lifecycle becomes `failed` and offers a retry, rather than claiming the zone is watering.

**Healthcare devices.** An infusion rate change uses `confirmed`, with the application's codes
(`occlusion`, `rate-out-of-range`) on `fail` and its own clinically reviewed messages. A stale SpO₂
reading is `stale`, never `normal`, however in-range the number is.

**Industrial.** A conveyor speed change uses `hybrid`: the gauge shows the target and the reported rpm
ramping toward it, with pending visible until the drive reports the target. A late reply from an
earlier speed command carries the old `commandId` and is refused.

## 8. Platform parity

Language-neutral mapping. Every type is plain data; events are a tagged union; open vocabularies are
strings.

| Construct | TypeScript | Swift | Kotlin | Dart |
| --- | --- | --- | --- | --- |
| Closed string union (stage, strategy, kind) | string literal union | `enum: String` | `enum class` with serial name | `enum` with `.name` |
| Open vocabulary (`role`, activity kind) | `"…" \| (string & {})` | `struct` wrapping `String`, static constants | `@JvmInline value class` | extension type over `String` |
| Event union | discriminated union on `type` | `enum` with associated values | `sealed interface` | `sealed class` |
| `KinetixCommandLifecycle<T>` | generic object | generic `struct` | generic `data class` | generic class with `copyWith` |
| `ok` / `rejection` result | discriminated union | `Result<State, Rejection>` | `sealed` result | `sealed` result |
| Timestamps | ISO string in, ISO string out | `Date` (ISO at the boundary) | `Instant` | `DateTime` |

Truth today, verified by search of `packages/` at audit time:

| Concept | TS functions | React | Angular | SwiftUI | Compose | Flutter |
| --- | --- | --- | --- | --- | --- | --- |
| Command lifecycle + `report` + correlation | implemented, tested | consumed by `CommandLifecycle` and, since M2A, by the four controls (`lifecycle` prop) | not implemented | not implemented | not implemented | not implemented |
| Interaction strategies | implemented, tested | the four controls (`strategy` prop), tested in jsdom and Chromium | not implemented | not implemented | not implemented | not implemented |
| Connectivity incl. `connecting` / `unknown` | implemented, tested | words via `describeConnectivity`; no connectivity component | not implemented | not implemented | not implemented | not implemented |
| Capability kinds / roles / support | implemented, tested | not consumed | not implemented | not implemented | not implemented | not implemented |
| Telemetry freshness | implemented, tested | consumed | not implemented | not implemented | not implemented | not implemented |
| Battery state | implemented, tested | `BatteryIndicator` uses the percentage only | not implemented | not implemented | not implemented | not implemented |

"Not implemented" means no source exists. An Angular application *can* import
`@kinetixui/iot/functions` today because it has no React dependency, but no Angular component,
service or test consumes it, so that is not claimed as Angular support.

## 9. What remains

- **M2B**: colour, media and lock controls on the same API, only with a demonstrated consumer.
- **Control availability without a device status** (audit G12): `resolveControlState()` still reads a
  missing status as offline.
- **Manual screen-reader verification** of the M2A announcements (VoiceOver, NVDA, TalkBack). Only
  automated accessibility-tree checks have run.
- **Native parity**: implement the lifecycle, strategies and capability support in Swift, Kotlin and
  Dart against the same test cases, where those toolchains can run in CI.
- **Angular**: an IoT consumer only when there is product demand. `@kinetixui/iot/functions` imports into
  an Angular app because it has no React dependency, but nothing Angular consumes or tests it.
