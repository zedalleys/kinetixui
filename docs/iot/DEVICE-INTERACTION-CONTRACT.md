# The KinetixUI device interaction contract

How KinetixUI models a connected device changing state: what a user asked for, what the device
reports, and what a control is allowed to draw in between. This is the M1 foundation of the IoT
maturity programme; the audit behind it is [IOT-MATURITY-AUDIT.md](./IOT-MATURITY-AUDIT.md).

Everything here lives in `@kinetixui/iot/functions`: TypeScript types and pure functions, no React,
no DOM, no runtime dependencies. It is implemented and tested in TypeScript only. Nothing in this
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

**Every shipped KinetixUI control today behaves as `confirmed`.** The React controls render the
confirmed value through `resolveControlState`. They do not yet accept a strategy; wiring one in is M2.

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
| Connection | `KinetixConnectivityState`: online, offline, unreachable, stale | `connecting` and `unknown` are **not** modelled yet (audit G4/G11). "Degraded" is a health level, deliberately separate from the link. |
| Health | `KinetixDeviceHealthLevel` + reasons | Unchanged |
| Telemetry | `KinetixTelemetryPoint` (value, unit, timestamp, quality), `evaluateReading` | Unchanged |
| Battery | `KinetixBatteryState` → `resolveBatteryState`: level, available, charging (or `unknown`), low, critical | New in M1 |
| Device error | `KinetixDeviceFault.code`; lifecycle `reasonCode` | Codes are the application's |
| Activity | `KinetixActivityEvent`: deviceId, kind, timestamp, actor, source, status, `metadata` | `metadata` new in M1 |

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
| Command lifecycle + `report` + correlation | implemented, tested | consumed by the `CommandLifecycle` component; the four controls take a command status, not a lifecycle | not implemented | not implemented | not implemented | not implemented |
| Interaction strategies | implemented, tested | not wired (controls are confirmed-only) | not implemented | not implemented | not implemented | not implemented |
| Capability kinds / roles / support | implemented, tested | not consumed | not implemented | not implemented | not implemented | not implemented |
| Telemetry freshness | implemented, tested | consumed | not implemented | not implemented | not implemented | not implemented |
| Battery state | implemented, tested | `BatteryIndicator` uses the percentage only | not implemented | not implemented | not implemented | not implemented |

"Not implemented" means no source exists. An Angular application *can* import
`@kinetixui/iot/functions` today because it has no React dependency, but no Angular component,
service or test consumes it, so that is not claimed as Angular support.

## 9. What remains

- **M2, control maturity**: let `DevicePowerControl`, `DeviceLevelControl`, `DeviceSetpointControl` and
  `DeviceModeControl` accept a lifecycle and a strategy and render `presentCommandValue`, with
  real-browser and assistive-technology verification. New controls (colour, lock, media) only with a
  demonstrated consumer.
- **Connectivity widening** (`connecting`, `unknown`, fixing audit G4) as its own, explicitly versioned change.
- **Native parity**: implement the lifecycle, strategies and capability support in Swift, Kotlin and
  Dart against the same test cases, where those toolchains can run in CI.
- **Angular**: an IoT consumer only when there is product demand; the contract is ready for it.
