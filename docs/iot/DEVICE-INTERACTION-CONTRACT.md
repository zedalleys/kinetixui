# The KinetixUI device interaction contract

How KinetixUI models a connected device changing state: what a user asked for, what the device
reports, and what a control is allowed to draw in between. M1 laid the foundation; M2A made connectivity
truthful and wired the four existing React controls to it (§4.1, §6.1); M2B stopped a missing device
status reading as offline (§6.2) and added colour, lock and media controls on the same API (§4.2); M3 added the
monitoring and feedback components and the freshness contract (§9); M4A hardened the lifecycle for real
devices (§3) and M4B added the device ledger, the provider-neutral integration layer (§10). The audit behind all of them is
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

The package never opens a connection, never holds a credential and never parses a device payload. §10.2
extends this table for applications that connect a real provider through the device ledger.

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

### M4A additions: real-device edges

A simulated device shares the application's clock, ids and timers. A real one does not. These four rules are
additive: a caller that passes none of the new fields sees the M1–M3 behaviour unchanged. Tested in
`packages/iot/src/functions/lifecycle-edges.test.ts`, and read through the Phase 3D wording in
`lifecycle-edges-wording.test.ts`.

| Addition | Rule |
| --- | --- |
| `receivedAt` on `report` | When the application received the report, on the same clock as `now` and `sentAt`. |
| `commandId` on `timeout` | A timeout belongs to the request it was started for. |
| `adjustedValue` on the lifecycle, and `isLifecycleAdjusted(lifecycle)` | The device confirmed the request with a different value. |
| Structural value equality in `summarizeDeviceState` | Requested and reported values are compared with `isSameDeviceValue`. |

**Two clocks on a report.** `observedAt` is when the device observed the value, on the device's clock.
`receivedAt` is when the application received it, on the application's clock. They answer different questions,
so they are never compared with each other:

- *Ordering* uses `observedAt` only. A report older than the last ordered report is refused as `stale-report`,
  whatever its `receivedAt`, and `reportedAt` keeps the device's time.
- *Settling* asks whether the report can be evidence about the current request, which means it must postdate the
  send. With `receivedAt`, that is `receivedAt` against `sentAt`, both on the application's clock, so a device
  whose clock runs behind no longer leaves a request it carried out pending until it times out. Without
  `receivedAt`, `observedAt` is used as before. A report from before the send updates `confirmedValue` and never
  settles the request. An unreadable `receivedAt` is ignored, not trusted.
- Residual: a pre-send observation that is only received after the send, and whose value equals the request,
  settles it. The value it reports is the one asked for, so the claim "the device holds the requested value" is
  still true.

**Correlated timeouts.** `timeout` takes an optional `commandId` and is checked like `acknowledge`, `confirm` and
`fail`: an id of a superseded request, or any id other than the current one, is refused as `stale-response`
with the same state object. A timer left over from a replaced request therefore cannot time out the request that
replaced it. An untagged `timeout` behaves as before. `deviceUnreachable` and `cancel` stay uncorrelated: they
describe the link and the user, not one request.

**Adjusted confirmations.** A `confirm` carrying a value that is not `isSameDeviceValue` to the request (a
setpoint rounded to the hardware's step, a clamped level) settles the request as `confirmed`, records the value in
`adjustedValue`, and `isLifecycleAdjusted` is true. There is no new stage.

- Only a `confirm` sets it. A `report` that differs from the request is not a confirmation: the request stays
  open ("not yet confirmed"), as the table above says. So "requested 22, the device confirms 21.5" and "requested
  22, a report says 21.5" stay distinct.
- It describes how the request settled, so a later `report` that moves `confirmedValue` neither sets nor clears
  it. A new request (`supersedeCommandLifecycle` or `startCommandLifecycle`) starts without it.
- It changes nothing a strategy draws or a control says. The control and `CommandFeedback` name the device's
  value ("21.5°.", "Confirmed: the device reports 21.5°."), never the requested one, so no sentence claims the
  request was met exactly. An application that wants to say "adjusted" reads `isLifecycleAdjusted`.

**How these read in Phase 3D's words.** No sentence changed. A timeout after a differing report says "No
confirmation for 22°: the device did not confirm in time, so the change may still apply. It last reported 21.5°."
A refused superseded timeout leaves the current request's own "not yet confirmed" sentence. A request whose link is
lost reads by the link first. Requested and acknowledged are never confirmed, a lost link is not a failure, a timeout
is not a refusal, offline never sounds in progress, and unknown is never offline.

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
| Device clock behind the application's | `report` with `receivedAt` settles; ordering stays on `observedAt` (`lifecycle-edges.test.ts`) |
| Timeout for a superseded request | `timeout` with its `commandId`, refused as `stale-response` (`lifecycle-edges.test.ts`) |
| Device adjusts the requested value | `confirm` with the adjusted value → `confirmed`, `isLifecycleAdjusted` (`lifecycle-edges.test.ts`) |
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
dragged 20 → 40 → 80): it keeps the reported value and `reportedAt`, so report ordering survives, and
moves the old correlation id to `supersededCommandIds`, so a late reply to 40 is refused as
`stale-response` — including when the new request is sent without an id of its own, where there would
otherwise be nothing to compare it against.

| | `confirmed` | `hybrid` | `optimistic` |
| --- | --- | --- | --- |
| Power | Stays at the reported end with its mark; dashed track; "Turning on"; `aria-checked` = reported | Track and hollow knob move to the request; no mark; "Turning on" | Moves to the request, filled, no mark; "On"; `aria-checked` = shown |
| Level | Numeral and fill = reported; hatched extension, marker and chip for the request | Numeral = request; chip names what the device reports | Numeral and fill = request; nothing else |
| Setpoint | Numeral = reported target; chip; ring with a dashed request | Numeral = request; chip names the device's target | Numeral and arc = request |
| Mode | Reported mode checked; request dashed and named "requested, not yet confirmed" | Request raised and dashed; reported mode stays checked | Request checked, without the confirmed tick |

Every control sets `aria-busy` while a request is open, under every strategy — on the widget, and on the
setpoint's container and its two steppers. It is the one programmatic sign `optimistic` keeps, since it
draws no pending mark and announces nothing while it waits. After a request that did not happen, a control shows
and announces a sentence such as "Could not turn on. The device still reports off." (`data-outcome`;
`data-rolled-back` when the display moved back).

**Accessibility.** Announcements are polite and one per stage: "Turning on, waiting for the device." →
"On." or "Could not turn on. The device still reports off."; timed-out and unreachable endings name
themselves, and a timed-out one says the change may still apply ("No confirmation for on: the device did not
confirm in time, so the change may still apply…"), because a timeout is the application giving up, not the
device refusing (Phase 3D). A request still open when the link drops to `offline` or `unreachable` is described
by the link first ("Device offline. The requested change is not confirmed…"), never as a change in progress. `optimistic` announces nothing while it waits (it chose not to mark the wait) but always
announces the outcome. The status region exists before its first message. `aria-checked` stays the
reported value whenever the request is marked as unconfirmed. Disabled (`disabled`) and unavailable
(`aria-disabled` on a mode) are unchanged. Verified with jsdom tests and in Chromium by
`pnpm check:iot-strategies`; not with a manual screen reader.

**Migration.** Nothing is required. Value props keep working and announce nothing new. Two visible
changes: `DevicePowerControl` with `requested` no longer moves its knob by default (pass
`strategy="hybrid"` for the previous drawing), and the value props are optional.

### 4.2 Colour, lock and media (M2B)

Three controls on the same `lifecycle` / `strategy` / `announce` API, with no state logic of their own:
each goes through `resolveControlPresentation` and `describeControlOutcome`, and the lifecycle's
correlation (`commandId`, `supersededCommandIds`) and report ordering are what refuse stale replies.

| | Strategies | Default | Composes | Capability |
| --- | --- | --- | --- | --- |
| `DeviceColorControl` | `confirmed`, `optimistic`, `hybrid` | `confirmed` (`hybrid` recommended) | `DeviceModeControl` (`tiles`) for the choices | `color` (role `color` or `color-temperature`) |
| `DeviceLockControl` | `confirmed`, `hybrid` | `confirmed` | — | `mode` with role `lock` |
| `DeviceMediaControl` | `confirmed`, `optimistic`, `hybrid`, one for all its commands | `confirmed` | `DeviceLevelControl` for seek and volume | `mode`/`media-playback`, `level`/`volume` |

Each takes `support` from `resolveCapabilitySupport`: `read-only` shows the state without actions, and
`unsupported` renders one sentence ("Front door: not supported by this device") rather than a disabled
widget, because "not on this device" is a different answer from "not now".

**Colour.** `KinetixDeviceColor` is `{ mode: "rgb", r, g, b }` or `{ mode: "temperature", kelvin }` —
the two shapes devices across domains share; a product whose devices speak HSV or CIE xy converts at its
boundary. Values are compared with `isSameDeviceValue`, so a reported colour that is a new object, with
its keys in another order, still confirms the request; `normalizeDeviceColor` turns `#rrggbb` and
loose objects into one of the two shapes before they enter a lifecycle. The product supplies the colours
(`options`); the control is a named radiogroup with a preview, not a design-tool picker. A reported colour
that is none of the options is shown and named by its value. The device's colour is drawn as data
(an inline fill, kept under forced colours like an image); borders, focus, labels and state marks are tokens.

| | `confirmed` | `hybrid` | `optimistic` |
| --- | --- | --- | --- |
| Colour | Preview and checked radio = reported; the request is dashed and named on its swatch; chip "Requested Ocean (#2563EB), not yet confirmed" | Preview = request with a dashed edge; chip names what the device reports; reported radio stays checked | Preview and checked radio = request; silent; rolls back in words |

The default is not changed for colour. `hybrid` suits it — people expect to see the colour they chose —
but a per-control default would make "the default" mean different things on different controls.

**Lock — the safety policy.** "Locked" is only ever the device's word:

- The headline, the closed padlock and `data-lock-state="locked"` appear only when the device *reports*
  locked. While a request is open the headline is either the reported state with the request beside it
  (`confirmed`: "Unlocked" + "Locking, not yet confirmed") or the direction with the reported state
  beside it (`hybrid`: "Locking" + "Waiting for the device. It still reports unlocked").
- `optimistic` is excluded by type (`KinetixLockStrategy`), and `resolveLockStrategy` draws it as
  `confirmed` at runtime, because its whole purpose is to show the request as the state.
- The lock is operated by named buttons ("Lock Front door"), not a switch. A jammed or unknown lock
  offers both actions. Pending is busy (`aria-busy`) and not pressable.
- Announcements: "Locking, waiting for the device." → "Locked." or "Could not lock. The device still
  reports unlocked." A physical change reported with no request updates the state and announces nothing.

**Media — the transport boundary.** KinetixUI owns the interaction and its truth; the application owns
playback. There is no `<audio>`, `<video>`, HLS, WebRTC, RTSP, codec, player or vendor SDK, and nothing
in the control starts, stops or seeks anything: `onPlaybackRequest`, `onSeek`, `onVolumeChange`,
`onMuteChange`, `onPrevious` and `onNext` are callbacks. Each asynchronous command has its own lifecycle
(`playbackLifecycle`, `seekLifecycle`, `volumeLifecycle`, `muteLifecycle`) under one `strategy`:

- **Play/pause.** Under `confirmed` the headline stays at what the device reports ("Paused") with
  "Starting playback, not yet confirmed" beside it; the Play button is busy and not pressable.
- **Seek.** The scrubber is `DeviceLevelControl`, so the reported position and the requested target are
  drawn apart; time is written "1:05" and spoken "1 minute 5 seconds" (`aria-valuetext`). A position
  report that is not the target keeps the seek pending. The product feeds position as `report` events.
- **Volume.** `DeviceLevelControl` itself — the level semantics, not a copy.
- **Mute.** A toggle button; `aria-pressed` is the reported state while a change is marked.
- Previous/next are fire-and-forget; their result is a new title the product reports.
- The transport row and the scrubber stay left-to-right in RTL (playback controls and progress are not
  mirrored); the text around them is.

A pending play does not disable the other actions: each command resolves its own interactivity. Each
tracked command has its own polite status region.

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

**Which control reads which capability (M2B).** No kind or role was added. `DeviceColorControl` is for
`color`. `DeviceLockControl` is for `mode` with role `lock` — the lock is a two-state mode with stricter
presentation, not a new shape. `DeviceMediaControl` is for the speaker's `mode`/`media-playback` and
`level`/`volume`; `media` stays what M1 defined, a preview or stream surface the application renders
(`CameraDeviceCard`), because a playback endpoint and a picture are different shapes.

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

### 6.2 Control availability (M2B, audit G12)

`resolveControlState` used `normalizeDeviceStatus`'s badge fallback, so a control with no status said
"Device offline. Showing the last known setting". It now asks for evidence, as connectivity does.

| Input | Before | After |
| --- | --- | --- |
| No `deviceStatus`, `null`, `""` or an unrecognised string | `offline`, "Device offline…" | `unknown`, "Device status unknown"; not interactive; not "last known" |
| `deviceStatus: "unreachable"` | `offline` | `unreachable`, "Device unreachable. Showing the last known setting" |
| `connectivity: "connecting"` (new input) | — | `connecting`, "Connecting to the device. Showing the last known setting" |
| `connectivity` `offline` / `unreachable` / `stale` | — | wins over `deviceStatus` (the link is the more specific claim) |
| `connectivity: "online"` with no status | — | `ready` |
| A request in flight to a device of unknown status | `offline` | `pending` (the request is a fact we hold) |

`unknown` keeps the old fail-safe (no input), and only `offline`'s sentence says "offline".
`KinetixControlAvailability` gains `unknown`, `unreachable` and `connecting`; an exhaustive `switch`
over it needs three new arms. A control given only a `lifecycle` and no `control` still assumes nothing
about the device (§4.1).

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
| Command lifecycle + `report` + correlation | implemented, tested | consumed by `CommandLifecycle` and by the device controls (`lifecycle` prop; four since M2A, seven since M2B) | not implemented | not implemented | not implemented | not implemented |
| Interaction strategies | implemented, tested | the seven controls (`strategy` prop; lock: `confirmed`/`hybrid` only), tested in jsdom and Chromium | not implemented | not implemented | not implemented | not implemented |
| Control availability incl. `unknown` (G12) | implemented, tested | every control and `DeviceControlCard` | not implemented | not implemented | not implemented | not implemented |
| Colour value + equality | implemented, tested | `DeviceColorControl` | not implemented | not implemented | not implemented | not implemented |
| Lock safety policy | implemented, tested | `DeviceLockControl` | not implemented | not implemented | not implemented | not implemented |
| Media playback / seek / volume / mute | implemented, tested | `DeviceMediaControl` (no playback in the package) | not implemented | not implemented | not implemented | not implemented |
| Connectivity incl. `connecting` / `unknown` | implemented, tested | `DeviceConnection` (M3): six shapes and words | not implemented | not implemented | not implemented | not implemented |
| Data freshness (`resolveFreshness`, M3) | implemented, tested | `DeviceBattery`, `TelemetryMetric`, `EnergySummary` | not implemented | not implemented | not implemented | not implemented |
| Command feedback (`describeCommandFeedback`, M3) | implemented, tested | `CommandFeedback` | not implemented | not implemented | not implemented | not implemented |
| Activity origin (M3) | implemented, tested | `DeviceActivity` | not implemented | not implemented | not implemented | not implemented |
| Capability kinds / roles / support | implemented, tested | `support` prop on the three M2B controls | not implemented | not implemented | not implemented | not implemented |
| Telemetry freshness | implemented, tested | consumed | not implemented | not implemented | not implemented | not implemented |
| Battery state | implemented, tested | `DeviceBattery` (M3): level, charging, freshness, thresholds, support; `BatteryIndicator` uses the percentage only | not implemented | not implemented | not implemented | not implemented |

"Not implemented" means no source exists. An Angular application *can* import
`@kinetixui/iot/functions` today because it has no React dependency, but no Angular component,
service or test consumes it, so that is not claimed as Angular support.

## 9. Monitoring truth model (M3)

Monitoring is the half of a connected product where nobody presses anything, and it is where interfaces
most often turn "we do not know" into a value. M3 keeps five dimensions apart. Each has its own evidence,
each has its own `unknown`, and **none is derived from another**:

| Dimension | Question | Values | Source of truth |
| --- | --- | --- | --- |
| Connectivity | Can the device be reached? | `online`, `offline`, `unreachable`, `stale`, `connecting`, `unknown` (§6.1) | The application's link evidence |
| Freshness | How old is *this* piece of data? | `fresh`, `stale`, `unknown` | A timestamp and a policy (`staleAfterMs`) **the application supplies** |
| Availability | Is there a value to show? | known, `unknown` (nothing reported), `unavailable` (the source says it cannot give one now), `unsupported` (the device does not do this) | The payload, `quality`, `resolveCapabilitySupport` |
| Value | What is it? | A number (formatted by the product), never invented | The device's report |
| Command lifecycle | What happened to what the user asked for? | The nine stages (§3) | Lifecycle events |

`resolveFreshness({ observedAt, staleAfterMs, now, freshness })` is the shared contract. Without a policy
it answers `unknown` — **there is no default timeout**, because how fresh is fresh is a property of the
device and the product: a soil probe reporting twice a day is not stale at noon, and an infusion pump's
rate from ten minutes ago is. Undated data is `unknown`, not stale and not fresh. An answer the
application already has (`freshness`) wins. `TelemetryMetric`'s older `staleAfterMs` path keeps its 0.3
rule — with a window set, an *undated* reading is shown as last known rather than as current — because
the tile has to draw something, and drawing an undated number as live is the lie the package exists to avoid.

### The components

| Component | Layer | Truth rules |
| --- | --- | --- |
| `DeviceBattery` | primitive | Unknown is "—" and "Unknown", never 0 %. Charging is said only when reported (`null` = the device says it cannot tell; omitted = not reported); 100 % implies no charger. Stale is about the reading's age and never says offline. `unsupported` is "No battery", not unknown. `critical`/`low` boundaries are the product's (`thresholds`). |
| `DeviceConnection` | primitive | The six states as six shapes and six words. Connecting never looks online; unknown never says offline; stale means old evidence, not disconnected. Last seen is shown where it means something. No animation. Transport is product display text. |
| `TelemetryMetric` | pattern (extended) | Unknown ≠ unavailable ≠ unsupported, three words, no number for any. Stale keeps its number, marked. A delta needs a real `previous`; none for a stale or missing value. A reference range is printed, never judged; status comes only from the product's thresholds or `severity`. No unit, decimals or medical reading assumed. |
| `CommandFeedback` | pattern | Presentation of an existing lifecycle; no state of its own. Requested/acknowledged/retrying say "not yet confirmed"; timed out "may still apply"; unreachable is not "failed"; cancelled claims no rollback. Retry only when the lifecycle allows it and the product asked; never automatic. |
| `DeviceActivity` | pattern | Explicit `order`. Explicit `origin` (`user`, `device`, `automation`, `system`); missing is "Source unknown", never inferred from `actor`/`source`. A real list; rows are not focusable; actions are real buttons. |
| `EnergySummary` | pattern (extended) | Without `summary`, a composition of `TelemetryMetric`s (power, energy, cost, more) over a period the product names. No kWh, currency, tariff or "today" assumed; a cost is the product's number. No chart in this form. |

**Passive by design.** None of `DeviceBattery`, `DeviceConnection`, `TelemetryMetric`, `DeviceActivity` or
`EnergySummary` is a live region, holds a lifecycle or offers a control. `CommandFeedback` renders one polite
`role="status"` only with `announce` — off by default because a control given the same lifecycle already
announces it — and under `optimistic` does not announce the wait. Each component speaks one phrase
("Battery 18 percent, low, stale reading"; "Offline, last seen 5 minutes ago"; "Glucose 5.8 millimoles
per litre, reference 4.0 to 7.0, measured 2 minutes ago") and hides its visual parts, so nothing is read twice.

### Examples: dimensions that disagree

| Situation | What is shown | Why |
| --- | --- | --- |
| **Online + stale telemetry** | `DeviceConnection` "Online"; `TelemetryMetric` "Soil moisture 31 %", "Last known value", clock + "Stale" | The link is up, but this sensor has sent nothing for three hours. A green dot does not make the number current. |
| **Unknown connection + known stale battery** | "Connection unknown"; "Battery 18 percent, low, stale reading" | Nothing is known about the link, and the last battery report is old. Neither becomes "offline", and the battery is not hidden because the link is unknown. |
| **Offline + last known telemetry** | "Offline, last seen 7 minutes ago"; the reading with its own freshness | Offline is about reaching the device. The reading from seven minutes ago is still fresh under a 10-minute policy, and is shown as such. |
| **Requested command + reported state unchanged** | Control at the reported value; `CommandFeedback` "Requested, not yet confirmed" — "…It last reported 20%." | A request is not a state (§2). The reported value is authoritative until the device reports otherwise. |
| **Unsupported capability vs supported but no data** | "Battery not supported by this device" vs "Battery level unknown"; "Glucose not supported by this device" vs "Glucose unknown, no reading" | "Not on this device" and "not reported yet" lead to different next steps; neither is drawn as zero or as a disabled control. |

### Capability model

No capability kind or role was added. A battery is a `telemetry` capability with role `battery`;
energy and power readings are `telemetry`; connectivity is not a capability (every connected device has a
link); activity remains deliberately not a capability (§5). The monitoring components take `support` from
`resolveCapabilitySupport`, so `unsupported` is distinct from no data, and `read-only` — normal for an
observation — changes nothing.

### Ownership

The application owns timestamps, the freshness policy, battery thresholds, status verdicts, value and
currency formatting, event copy, event origin and de-duplication of transport events. KinetixUI owns how
each dimension is shown and said, and that none is silently converted into another.

## 10. Device ledger and provider integration (M4B)

KinetixUI owns device-interaction truth, not device infrastructure. M4B adds the smallest layer that lets an
application connect a real provider (a home hub, a broker, a vendor cloud) to the lifecycle in §3 without
KinetixUI touching the network: a normalized signal vocabulary, a command intent, and a **device ledger** with
pure functions over it. Types in `src/types/device-ledger.ts`, functions in `src/functions/device-ledger.ts`,
tests in `device-ledger.test.ts` and `device-ledger-boundary.test.ts`. All of it is additive: no existing type,
function, control or sentence changed, and an application that drives lifecycles directly keeps doing so.

### 10.1 What the ledger is, and is not

The ledger is a plain value: for each device the application registered, its link (`KinetixDeviceConnectivity`)
and, for each registered capability, exactly one `KinetixCommandLifecycle`. An idle lifecycle still tracks what
the device reports, so every reported value lives in one place, and `toDeviceState` derives
`confirmedValues`/`requestedValues` from it instead of storing them twice.

It is not a store, a cache, a registry, a queue or a runtime. It has no singleton, no React context, no
subscription, no timer and no history. The application keeps it wherever it keeps state (React state, Zustand,
Redux, XState, a server) and replaces it with what each function returns. Signals for devices or capabilities the
application did not register are refused, not added, so a provider that streams every entity it knows does not
turn the ledger into a device registry.

| Function | Does |
| --- | --- |
| `createDeviceLedger({ devices })` | Registers devices and capability ids. Capabilities start `idle`; links start `unknown` unless given. |
| `requestDeviceChange(ledger, { commandId, deviceId, capabilityId, value }, now)` | Records the request (`requested`, superseding an open one) and returns the `KinetixCommandIntent` to send. No intent for an unknown target, so nothing is sent. |
| `applyDeviceSignals(ledger, signals, now)` | Reconciles provider facts, in order. `now` is when the application received them. |
| `expireDeviceCommands(ledger, now, { timeoutMs?, commandId? })` | Times out open requests by policy, or exactly one request when the application's own timer fires. |
| `selectCapabilityLifecycle(ledger, deviceId, capabilityId)` | The lifecycle for a control's `lifecycle` prop. Same object until that capability changes. |
| `selectDeviceConnectivity(ledger, deviceId)` | The link, for `resolveControlState({ connectivity, lifecycle })` and `DeviceConnection`. `unknown` when absent. |
| `toDeviceState(ledger, { device, … })` | A `KinetixDeviceState` for `summarizeDeviceState` and the device cards. Identity stays the application's. |

Every operation returns `{ ledger, transitions }`. A transition records the cause (a signal type, `request` or
`expire`), the device, capability and command, the lifecycle stage before and after, the link before and after,
and a `rejection` when the item was refused. The application can log, audit, notify or debug from them; the
ledger never throws, emits or sends, and a call that changes nothing returns the same ledger object.

### 10.2 Ownership

| Concern | KinetixUI | Application | Adapter |
| --- | --- | --- | --- |
| Signal vocabulary, command intent shape | defines | — | emits / reads |
| Reconciliation rules, lifecycle transitions, stale-response and stale-report refusal | owns (pure functions) | — | — |
| Requested vs confirmed, adjusted confirmations | owns | — | — |
| UI-facing connectivity and lifecycle, strategies, sentences, selectors | owns | chooses strategy, localises | — |
| Structured transition records | returns them | logs, audits, analyses | — |
| The ledger value and where it is stored | defines the shape | stores it | — |
| Command ids | requires one per request | generates them | carries them |
| Provider request id ↔ command id | never sees provider ids | keeps the map (its transport) | asks for it |
| Provider message → signals; intent → provider command | — | — | owns (pure) |
| Provider error → application code | invents no codes | owns the codes and their copy | maps |
| Timeout rule | owns (`expireDeviceCommands`) | owns the deadline and when to call it | — |
| Transport: WebSocket, HTTP, MQTT, Matter, Bluetooth, discovery | never | owns | never |
| Credentials, authentication, authorization, account linking | never | owns, server side | never |
| Subscriptions, reconnect, backoff, retry policy, rate limits | never | owns | never |
| Device and entity registry, persistence, offline queue / outbox | never | owns | never |
| Telemetry storage, background processing | never | owns | never |

An adapter is a pure translation boundary: provider event → `KinetixDeviceSignal[]`, `KinetixCommandIntent` →
provider command. It is a convention, not an exported interface, until more than one real adapter shows what a
shared interface would need.

### 10.3 Signals

| Signal | Carries | Becomes |
| --- | --- | --- |
| `report` | `deviceId`, `capabilityId`, `value`, optional `observedAt` | a lifecycle `report` with `receivedAt: now`. Always the reported value; settles an open request only when it equals the request (`isSameDeviceValue`) and was received after the send. |
| `snapshot` | `deviceId`, `values` by capability, optional `observedAt` | one `report` per capability it names, for providers that observe a device's capabilities together |
| `acknowledgement` | `commandId` | `acknowledge`: still not confirmed |
| `result` | `commandId`, `outcome: applied` (optional `value`) or `rejected` (optional `code`, `reason`) | `confirm` (adjusted when the value differs) or `fail` with the application's code |
| `connectivity` | `deviceId`, one of the six connectivity states, optional `lastSeenAt` | the device's link only |

Deliberately absent:

- **Provider fields.** No provider name, entity id, topic, cluster or provider context id. An adapter maps a
  provider target to the application's `deviceId`/`capabilityId`, and a provider request id to the KinetixUI
  `commandId`, before a signal exists. The ledger copies only the fields above; extra keys on a signal never reach
  it (`device-ledger-boundary.test.ts`).
- **An application ↔ provider link signal.** The RFC proposed `link: up | down | resyncing`. It was not needed:
  when the application's own connection drops, it says so per device with `connectivity: connecting` (we lost our
  view; the device did not go offline), and the reconnect snapshot restores the truth.
- **A timeout signal.** A timeout is the application's clock, not a provider fact: `expireDeviceCommands`.
- **Origin / caused-by on reports.** A physical change while a request is open keeps the request open (§3, "What
  `report` does"). Ending it as overridden needs provider evidence of origin, which is deferred.
- **`result: applied` for providers that only accept.** A provider whose reply means "dispatched" (Home Assistant's
  `call_service` result is one) emits an `acknowledgement`. Only a reply that speaks for the device is a `result`.

### 10.4 Command intent

`KinetixCommandIntent` is `commandId`, `deviceId`, `capabilityId`, `value`, `requestedAt` (ISO, application clock)
and, when an open request was replaced, `supersedes`. It contains no URL, token, service name, topic, cluster,
characteristic or SDK object. The adapter encodes it; the application's transport sends it.

### 10.5 Reconciliation

Each signal becomes one lifecycle event, so §3's rules apply unchanged. Each row is a test in
`device-ledger.test.ts`.

| Scenario | Signals | Ledger result |
| --- | --- | --- |
| Normal confirmation | request 22, acknowledgement, report 22 | `requested` → `acknowledged` → `confirmed` 22 |
| Report without acknowledgement | request 22, report 22 | `confirmed`. An acknowledgement is not required for truth. |
| Acknowledgement without report | request on, acknowledgement | `acknowledged`, reported off; then `timed-out` ("may still apply"), never `failed` |
| Adjusted confirmation | request 22, `result applied` 21.5 | `confirmed` 21.5, `isLifecycleAdjusted`; every strategy draws 21.5, no sentence says 22 |
| Unrelated report | request 22, report 21.5 | still `requested`; reported value 21.5 |
| Physical change | confirmed 20, report 18 (no request) | reported 18, stage kept |
| Disconnect while pending | request on, `connectivity: offline` | still `requested`, not `failed`, no code. `resolveControlState` reads "Device offline. The requested change is not confirmed." |
| Reconnect | `connecting`, `online`, snapshot | the link alone confirms nothing; a snapshot equal to the request confirms it, one that differs leaves it open |
| Timeout | `expireDeviceCommands` | `timed-out` with the request's own `commandId`; a later matching report still confirms |
| Stale timeout | A, B replaces A, timer for A fires | refused as `stale-response`; B untouched |
| Late response to a replaced command | A, B, then A's acknowledgement / result | refused as `stale-response` in every order; a late *report* of A's value is device truth but cannot confirm B |
| Out-of-order reports | observed 4 s, then observed 3 s | the older one is refused as `stale-report` |
| Device clock behind | report observed before the send on the device's clock, received after it | confirms (M4A two clocks: `observedAt` orders, receipt time settles) |
| Report before acknowledgement | report on, then acknowledgement | `confirmed`; the acknowledgement is absorbed as `illegal-transition` |

### 10.6 One request, end to end

```text
 Control        App store         KinetixUI ledger      Adapter          App transport     Provider / device
    │ onToggle(on)   │                    │                  │                   │                  │
    ├───────────────▶│ requestDeviceChange│                  │                   │                  │
    │                ├───────────────────▶│ lifecycle: requested                 │                  │
    │                │◀── ledger, intent ─┤                  │                   │                  │
    │                ├──────────────── encode(intent) ──────▶│                   │                  │
    │                │◀────────────── provider command ──────┤                   │                  │
    │                ├────────────────────── send (assigns request id) ─────────▶├─────────────────▶│
    │                │                    │                  │◀── reply id 10 ───┤◀── accepted ─────┤
    │                │ applyDeviceSignals ◀── acknowledgement(cmd-1) ────────────┤ (id 10 → cmd-1)  │
    │◀── on requested, off reported ──────┤ acknowledged      │                   │                  │
    │                │                    │                  │◀── state: on ─────┤◀── light is on ──┤
    │                │ applyDeviceSignals ◀── report(on) ─────┤                   │                  │
    │◀── on confirmed┤◀─ lifecycle: confirmed               │                   │                  │
```

### 10.7 Provider neutrality and the Home Assistant reference

Home Assistant is the reference integration target, not a dependency. The reference adapter, its fixtures and an
example application live in `packages/iot/reference/home-assistant/`, outside `src`: they are not built, exported
or published, and a boundary test fails if package source imports them. The adapter covers binary power for
`light.*` and `switch.*` entities: `state_changed` and `get_states` → `connectivity` + `report`, `unavailable` →
`offline`, a `call_service` success → `acknowledgement` (the later state change is the confirmation), a failure →
`result: rejected` with the application's own code; intent on/off → `turn_on`/`turn_off`. The fixtures are
synthetic messages shaped from Home Assistant's public WebSocket API documentation, with no token, URL or personal
data; they were not captured from a live instance, so the shapes are representative, not verified.

The same ledger accepts the same signals from an MQTT, Matter or cloud adapter without changing its lifecycle
model (the reference suite checks that a non-Home-Assistant signal sequence yields an identical ledger). That is
architectural portability. No MQTT, Matter, Bluetooth or cloud adapter exists.

### 10.8 Physical proof target

The first physical validation target is a smart light or smart plug with binary power: the requested and
confirmed values are unambiguous, a person can override it at the switch, it can be unplugged and reconnected, and
a stale report is easy to provoke. The architecture names no vendor. **No physical device has been tested yet.**
Before that can happen: a running Home Assistant (or other provider) with the device paired; an application-side
transport and server proxy that holds the credential; the adapter's message shapes checked against that instance's
real messages; and a manual run of the §10.5 scenarios with the physical device.

### 10.9 Truth semantics kept

Requested ≠ confirmed. Acknowledged ≠ confirmed. Disconnected ≠ failed: a `connectivity` signal never settles,
fails or times out a request, and an offline device's open request reads "not confirmed", never "in progress".
Timeout ≠ refused: `expireDeviceCommands` produces `timed-out` ("may still apply"), and only a `result: rejected`
produces `failed`. Unknown ≠ offline: a device nobody has reported on, or the ledger does not hold, is `unknown`.
Reports may be late, out of order, or caused by someone else; transport time and device observation time stay
separate clocks.

## 11. Live-provider validation (M4C)

M4C proves the M4B architecture against real Home Assistant behaviour and, later, a real lamp. It adds no
architecture to `@kinetixui/iot`: everything below lives in `packages/iot/reference/home-assistant/live/`,
outside `src`, and is not built, exported or published. No changeset.

**Status: M4C-A (integration readiness) is done. M4C-B (live provider) and M4C-C (physical device) are BLOCKED**:
no authorized Home Assistant instance or physical device has been available. Nothing in this section claims
a live or physical result.

### 11.1 Integration architecture

```
 server (holds the token)                                      browser / app UI
 ┌──────────────────────────────────────────────────────┐      ┌─────────────────────┐
 │ session.ts   socket · auth · subscribe · ids ·        │      │ DevicePowerControl  │
 │              reconnect · cleanup                      │      │  (unchanged)        │
 │   │ messages ▲ service calls                          │      └─────────▲───────────┘
 │   ▼          │                                        │                │ selectors
 │ example-app  receive · request · expire · linkLost ── │── ledger ──────┘
 │   │ adapter.translate / adapter.encode (pure)         │  (app-owned value)
 │   ▼                                                   │
 │ @kinetixui/iot/functions  applyDeviceSignals · requestDeviceChange · expireDeviceCommands
 └──────────────────────────────────────────────────────┘
```

| File | Owner in a real product | What it does |
| --- | --- | --- |
| `live/session.ts` | application | The Home Assistant WebSocket session: `auth_required` → `auth` → `auth_ok`, then `subscribe_events(state_changed)` **before** `get_states`; message ids from 1 per connection, always increasing; reconnect with backoff (1 s, 2 s, 5 s, 10 s, 30 s, last repeats); `stop()` unsubscribes and closes. It is the integration's transport. |
| `example-app.tsx` | application | Gains a `scheduler` (one timer per sent command, at its deadline, expiring only that command), `expire(commandId)`, `linkClosed()` (devices `unknown` when the app stops trying) and `dispose()`. `send` may now return `null`: the request is refused as `not-sent`, never queued. |
| `live/config.ts` | application | Reads the live run's environment. No defaults for endpoint, token, entity or evidence location; the token never enters the parsed config. |
| `live/sanitize.ts` | evidence | Keeps only types, ids, outcomes, the test entity's on/off state and Home Assistant's timestamps, under a pseudonym. Drops tokens, attributes, `context`, error text and every other entity. `findSensitiveContent` refuses a file that still holds a secret, a URL, a private address, a user id or a real entity id. |
| `live/diagnostics.ts` | application (opt-in) | Records each ledger transition: scenario, time, cause, device, capability, command, lifecycle before → after, connectivity before → after, rejection code. |
| `live/testing/fake-home-assistant.ts` | tests | A manual clock and an in-memory Home Assistant that speaks the same protocol subset. |
| `live/live-harness.test.tsx`, `session.test.ts`, `sanitize.test.ts` | tests | The automated column of the matrix (§11.5), the presentation table, session mechanics, sanitizer and config. In CI. |
| `live/live-provider.e2e.ts` + `vitest.live.config.ts` | evidence (manual) | The M4C-B run against a real instance. Never in `pnpm test` or CI; skips everything without configuration. |

### 11.2 Home Assistant transport boundary

- **Credential.** A long-lived access token for a Home Assistant user that may switch only the test entity. It is
  read from the server's environment at the moment of authentication, never stored by the session, never
  logged (the wire log shows `[redacted]`), and never sent to a browser. A browser app talks to its own server,
  which holds the session; that proxy is the application's and is not built here.
- **Authorization.** A refused credential (`auth_invalid`) stops the session: no retry, devices read `unknown`.
- **Transport security.** `wss://` only; `ws://` needs `KX_HA_ALLOW_INSECURE=1` (a LAN instance), and a URL
  with credentials or a query string is refused.
- **Commands are never retried or queued.** Reconnecting restores the view (subscription and a fresh snapshot),
  not commands. A command sent before a drop stays open until a report, a result or its own deadline settles it.
- **Unsupported devices.** An entity the application did not map is ignored; a value the adapter cannot express
  is refused as `unsupported` and nothing is sent.

### 11.3 Real-provider message mapping

Unchanged from §10.7. What M4C adds is a way to check it: the live run records every message's shape
(`messageShape`, key paths only) and writes `shapes.json`, listing per message type the fields a live instance
sends that the synthetic fixtures lack. Until that run happens, the mapping is still from Home Assistant's
public documentation.

### 11.4 Evidence classification

| Class | What counts | Where it lives |
| --- | --- | --- |
| **Automated** | Repeatable tests against the in-memory double on a manual clock. Proves the code follows the contract under the modelled protocol. | `live/*.test.ts(x)`; CI. |
| **Live provider** | Sanitized messages and ledger transitions from an authorized Home Assistant instance. Proves the protocol model matches reality. | `KX_HA_EVIDENCE_DIR`: `wire.json`, `diagnostics.json`, `results.json`, `shapes.json`. |
| **Physical** | A person's observation of the device itself (the lamp lit, the plug clicked) next to the run's records. | The checklist in §11.6, filled in by the operator. |
| **Blocked** | A prerequisite was not available. Never counted as passed. | — |

### 11.5 Evidence matrix

Automated rows are tests in `live/live-harness.test.tsx` (S01–S20) unless noted. Every live and physical cell is
**BLOCKED** (no instance, no device). The live run covers L01–L11; rows it does not cover stay automated-only.

| # | Scenario | Expected | Automated | Live (run step) | Physical |
| --- | --- | --- | --- | --- | --- |
| S01 | Initial state | Real state displayed once ready | pass | BLOCKED (L01) | BLOCKED |
| S02 | Request ON | `requested`; reported unchanged; one `call_service` | pass | BLOCKED (L02) | BLOCKED |
| S03 | Provider acknowledgement | `acknowledged`, not confirmed | pass | BLOCKED (L03) | — |
| S04 | Device reports ON | `confirmed` | pass | BLOCKED (L04) | BLOCKED |
| S05 | Request OFF while ON open | supersedes | pass | BLOCKED (L11) | — |
| S06 | Device reports OFF | confirmed OFF | pass | BLOCKED (L06) | BLOCKED |
| S07 | Physical switch OFF | UI updates, no app request | pass | BLOCKED (L07) | BLOCKED |
| S08 | Provider disconnect | `connecting`; command not failed; not re-sent | pass | BLOCKED (L08) | — |
| S09 | Device unavailable | offline; pending reads "not confirmed" | pass | not in live run | BLOCKED (unplug) |
| S10 | App reconnect | link back confirms nothing | pass | BLOCKED (L09) | — |
| S11 | Reconnect, unexpected value | reported updates; request open | pass | not in live run | BLOCKED |
| S12 | Reconnect, requested value | confirms by the usual rules | pass | BLOCKED (L10) | — |
| S13 | Exact deadline | `timed-out` at the deadline, not rejected | pass | not in live run | — |
| S14 | Late response | ack cannot reopen; later report of the value confirms | pass | not in live run | — |
| S15 | Superseded response | refused `stale-response` | pass | BLOCKED (L11) | — |
| S16 | Out-of-order report | refused `stale-report` | pass | not in live run | — |
| S17 | Unsupported command | nothing sent; `failed`/`unsupported` | pass (+ S17b not-sent) | not in live run | — |
| S18 | Provider rejection | `failed` only on an explicit error | pass | not in live run | — |
| S19 | Rapid toggles | last request settles; earlier acks refused | pass | BLOCKED (L11) | BLOCKED |
| S20 | Boundary | no provider vocabulary in the ledger at any step | pass | — | — |

Presentation (brief §6) is a second table in the same file: idle, requested, acknowledged, offline with a pending
request, reconnecting, timed out, rejected, confirmed, physical override, credential refused, unsupported. Each row
checks `aria-checked`, `aria-busy`, disabled, the visible label, the accessible description, zero axe violations
and keyboard reachability. Binary power has no adjusted-value state (documented gap).

### 11.6 Physical-device checklist (M4C-C, manual)

One smart light or plug, binary power, paired to the Home Assistant instance used in M4C-B. The operator records
the time, what the device did, and what the control showed:

1. Start the live run with `KX_HA_PHYSICAL_WAIT_MS=60000`. The lamp's real state matches L01.
2. L02–L06: the lamp turns on, then off, and the control shows "Turning on" until the lamp is lit, never before.
3. L07: press the device's own button during the wait. The control follows without a request.
4. Unplug the device. The control reads offline; a pending request reads "not confirmed".
5. Plug it back in. Connectivity returns; the control shows what the device reports, not what was requested.
6. Request a change, then unplug before it applies. After the deadline the control reads "may still apply", not "rejected".
7. Toggle quickly three times. The lamp ends where the last request asked; the control agrees.

### 11.7 Setup, operational security and troubleshooting

Setup: create a Home Assistant user limited to one test entity; create a long-lived token for it; on a machine
you control set `KX_HA_URL`, `KX_HA_TOKEN`, `KX_HA_ENTITY`, `KX_HA_EVIDENCE_DIR` (optionally `KX_HA_TIMEOUT_MS`,
`KX_HA_PHYSICAL_WAIT_MS`) and run `pnpm --filter @kinetixui/iot test:live`. Revoke the token afterwards. Never
put the token in a repository, a CI secret shared with pull requests, a browser bundle, or a chat.

| Symptom | Likely cause |
| --- | --- |
| All live tests skipped | Configuration missing or invalid; `readLiveConfig` lists which. |
| Session `unauthorized` | Token revoked or wrong; the session will not retry. |
| Stuck `waiting-to-reconnect` | URL, TLS or network; the backoff tops out at 30 s. |
| Requests `not-sent` | The session was not `ready` when the control was pressed. |
| `Refusing to write …` | The sanitizer found something that must not be kept; fix the pseudonym map, never the check. |

### 11.8 Findings and known limitations

- **F1 (fixture finding, open).** Home Assistant's own `unknown` state reports no value (an M4B decision), so the
  last known value stays on screen at `ready`, as if current. Whether a live light reports `unknown` (after a Home
  Assistant restart, say) needs M4C-B; until then the adapter is unchanged.
- **F2 (fixture finding, open).** An offline device with an open request is labelled "Turning on" with the
  description "Device offline. The requested change is not confirmed." The description is right; the label
  still names the request. Pre-existing (M3/3D); no change without live evidence.
- Confirmation is by value: a report of the requested value confirms the open request whoever caused it (report
  origin evidence is deferred from M4B). Rapid toggles can therefore confirm the last request on an earlier report.
- No heartbeat (`ping`): a half-open socket is noticed only when the operating system closes it.
- Home Assistant only. No MQTT, Matter, Bluetooth or cloud transport; binary power only.

### 11.9 Roadmap naming

The public roadmap (`/docs/iot`, written before this work) listed **M4** as camera, security and spatial
presentation. The real-device integration work then shipped as M4A (lifecycle edges), M4B (device ledger) and
M4C (validation). Decided by the owner on 2026-10-08:

- The shipped track is **M4 · Device integration** (M4A, M4B, M4C), which is what the repository and its history
  already say.
- Camera, security and spatial move to **M7**, marked "previously listed as M4" on `/docs/iot`. M5 and M6 keep
  their numbers, so no other commitment moves.

## 12. What remains

- **Camera, security and spatial** (M7; listed as M4 in the public roadmap before the real-device integration
  work took that number, see §11.9): camera preview and availability, security event presentation,
  privacy and recording truth, spatial overlays — with no embedded transport or video engine.
- **Live-provider and physical validation of the ledger** (§11, M4C-B and M4C-C): blocked on an authorized Home
  Assistant instance and a physical light or plug. Also deferred from M4B: report origin evidence (ending a pending request
  as overridden), cancel and retry through the ledger, and a React helper, which waits until the same wiring
  repeats in real applications.
- **Manual screen-reader verification** of the M2A, M2B and M3 announcements and phrases (VoiceOver, NVDA, TalkBack). Only
  automated accessibility-tree checks have run.
- **Native parity**: implement the lifecycle, strategies and capability support in Swift, Kotlin and
  Dart against the same test cases, where those toolchains can run in CI.
- **Angular**: an IoT consumer only when there is product demand. `@kinetixui/iot/functions` imports into
  an Angular app because it has no React dependency, but nothing Angular consumes or tests it.
