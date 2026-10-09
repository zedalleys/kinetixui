# `@kinetixui/iot` maturity audit — M1 contract foundation, M2A controls, M2B colour/lock/media, M3 monitoring and feedback

Audited at `main` `3eaf2c3` (2026-10-05). This is the record of what existed before the M1 contract
slice, what was measured, and what the slice was allowed to change. The contract itself is documented
in [DEVICE-INTERACTION-CONTRACT.md](./DEVICE-INTERACTION-CONTRACT.md).

## 1. Repository truth at audit time

| Fact | Evidence |
| --- | --- |
| Package | `packages/iot`, `@kinetixui/iot` **0.2.0** in source and on npm (`npm view @kinetixui/iot version` → `0.2.0`). Marked **Experimental** in its README and `src/index.ts`. |
| Pending release | Six `.changeset/iot-*.md` files (one `minor`, five `patch`) are queued; release PR #251 proposes 0.3.0. Not touched by this slice. |
| Entry points | `.` (everything), `./functions` (types + pure functions, **no React**), `./react` (components). |
| React-free guarantee | Enforced twice: `src/functions/react-free.test.ts` walks the source import closure from `functions/index.ts`; `scripts/check-iot-dist.mjs` (`pnpm check:iot-dist`) re-checks the built `dist`. |
| Runtime dependencies | None. React is an optional peer, used only by `./react`. |
| Tests | 28 Vitest files, **814 tests**, all passing (`pnpm --filter @kinetixui/iot test`). |
| Docs | `packages/iot/README.md`, `docs/iot/EXPERIENCE-MATURITY.md` (0.2 control layer + 0.3 connected product system), `docs/iot/MANUAL-QA-0.3.md`, `docs/audits/INTERACTIVE-STATE-SPATIAL-AUDIT.md`, the `/iot` site pages. |
| Other platforms | **No IoT code exists** in `packages/ui-angular`, `ui-swiftui`, `ui-compose` or `ui-flutter` (`rg -il "iot\|KinetixDevice\|commandlifecycle"` over all four returns nothing). |
| Transport | None. No MQTT/BLE/HTTP/WebSocket client, no vendor adapter, no payload parsing. Matches the ownership boundary the brief asks for. |

## 2. What the domain model already is

The package is not a set of smart-home cards. It already has a platform-neutral model in
`src/types` and `src/functions`, and most concepts in the brief exist under different names.

| Brief concept | Existing name | File |
| --- | --- | --- |
| Device / DeviceId / DeviceType | `KinetixDevice` (`id`, free-text `type`, `metadata`) | `types/device.ts` |
| Device category (interaction shape) | `KinetixDeviceCategory` + `KINETIX_DEVICE_TAXONOMY` (domain, affordances, default metrics) | `types/identity.ts` |
| DeviceCapability | `KinetixDeviceCapability` (`id`, `kind`, range, unit, modes, `readOnly`) | `types/device-state.ts` |
| Connection state | `KinetixConnectivityState` = `online \| offline \| unreachable \| stale` | `types/device-state.ts` |
| Device health | `KinetixDeviceHealthLevel` + reasons, `deriveDeviceHealth` | `types/device-state.ts`, `functions/device-state.ts` |
| DeviceCommand | `KinetixDeviceCommand` + `KinetixCommandStatus` (message lifecycle) | `types/command.ts` |
| DeviceCommandState | `KinetixCommandLifecycle` state machine: `idle, requested, acknowledged, confirmed, failed, timed-out, unreachable, retrying, cancelled` | `types/command.ts`, `functions/commands.ts` |
| Desired / reported | `requestedValue` / `confirmedValue` on the lifecycle; `requestedValues` / `confirmedValues` maps on `KinetixDeviceState` | same |
| Control presentation | `resolveControlState` → availability + phase; every React control renders the **confirmed** value | `functions/control.ts` |
| Telemetry reading + freshness | `KinetixTelemetryPoint` (value, unit, timestamp, quality), `detectStaleReading`, `evaluateReading` (`stale` outranks a threshold verdict) | `types/telemetry.ts`, `functions/telemetry.ts` |
| Battery | `classifyBatteryLevel` bands incl. `unknown`; `describeBattery` | `functions/battery.ts` |
| Device error | `KinetixDeviceFault` (`code`, `severity`, raised/cleared) | `types/device-state.ts` |
| Activity / event | `KinetixActivityEvent` (device, kind, timestamp, actor, source, status) | `types/activity.ts` |

**Current default behaviour is confirmed-first.** `KinetixCommandLifecycle` only changes
`confirmedValue` on a `confirm` event, `describeCommandLifecycle` never names a requested value as the
device's state, and the React controls draw the confirmed value (`EXPERIENCE-MATURITY.md` §2,
principle 1). Nothing in the package offers optimistic presentation. This slice preserves that default.

## 3. Gaps, reproduced before any edit

Each gap below was reproduced with a throwaway Vitest probe against unmodified `main` (not committed).

| # | Input | Observed on `main` | Why it is wrong |
| --- | --- | --- | --- |
| G1 | Request 80 sent; a late `confirm {value: 50}` that answered an **earlier, superseded** request arrives | `ok: true`, stage `confirmed`, "Confirmed: the device reports 50." | The user's 80 is reported as settled. The lifecycle has no command identity, so it cannot tell a stale reply from a clamp. |
| G2 | ON requested, device goes unreachable, reconnects and reports OFF (sent as `confirm {value: false}`, the only way to record it) | stage `confirmed`, "Confirmed: the device reports off." | A request that did not happen is labelled confirmed. There is no way to record a reported value that is **not** an answer. |
| G3 | Idle lifecycle, device reports a new value unprompted (someone flipped the physical switch) | refused (`ok: false`) | Reported state can change without a command; the lifecycle cannot absorb it. |
| G4 | `summarizeDeviceState` given a state with no `connectivity` | "Pump: health unknown. offline." | Missing knowledge is reported as `offline`. Violates the package's own rule that unknown is not a value. |

Further gaps found by reading, not by defect:

| # | Gap |
| --- | --- |
| G5 | No explicit **interaction strategy**. Confirmed-only is implicit in each control; optimistic and hybrid cannot be expressed or tested. |
| G6 | `KinetixDeviceCapabilityKind` has no shape for a **colour** value or a **media surface** (camera preview, live stream). A capability has no **semantic role** (brightness vs volume are both `level`). |
| G7 | No way to ask "does this device support capability X" and get `unsupported` as a result. `KinetixControlAvailability.unavailable` means "not now", not "never". |
| G8 | Command failures carry only free text (`reason`). There is no stable machine-readable code for a UI or a test to branch on. |
| G9 | Battery has no **charging** fact. |
| G10 | `KinetixActivityEvent` has no `metadata` slot (the brief's activity shape asks for one). |
| G11 | Connectivity has no `connecting` or `unknown` state (and G4 depends on `unknown`). |

## 4. Audit table

| Existing capability | Current implementation | Gap | Recommended action |
| --- | --- | --- | --- |
| Command lifecycle | Explicit, tested state machine; refusals return the same state and never throw | G1, G2, G3, G8 | **Extend, additively**: optional command correlation id, a `report` event for reported state, `reasonCode` on failures |
| Desired vs reported | `requestedValue` / `confirmedValue` | Names differ from the brief; semantics already right | **Keep names**, document the mapping. Renaming a public API for vocabulary is not justified |
| Interaction strategy | Confirmed-only, implicit | G5 | **Add** `KinetixCommandStrategy` + a pure `presentCommandValue`; default `confirmed` |
| Capability model | Interaction-shape `kind`, product-supplied ids | G6, G7 | **Add** kinds `color`, `media`; optional open-vocabulary `role`; `resolveCapabilitySupport` |
| Device taxonomy | 16 categories by interaction shape | None for M1; categories already avoid per-product classes | **Keep** |
| Connectivity | 4 states, separate from health | G4, G11 | **Do not change in M1**: adding `connecting`/`unknown` widens an exported union (see §5). Fixed in M2A (§10) |
| Health | Derived with reasons; `degraded` is a health level | Brief lists `degraded` as a connection state | **Keep**: link and condition are deliberately separate facts here, and merging them would lose information |
| Telemetry freshness | `detectStaleReading`, `evaluateReading` → `stale` | None | **Keep**; add a contract test that stale is representable |
| Battery | Bands incl. `unknown` | G9 | **Add** `KinetixBatteryState` + `resolveBatteryState` (charging, low, critical, available) |
| Device error | Faults have `code`; command failures do not | G8 | Covered by `reasonCode` above. User-facing text stays product-owned |
| Activity | Event model + timeline | G10 | **Add** optional `metadata` |
| React controls | Confirmed-first, consume `resolveControlState` | Strategy not wired | **Out of scope** (M2). PR #307 is editing `src/react/*` right now |
| Angular / native | Nothing | Everything | **Out of scope**: document parity; no native code (cannot be compiled here) |

## 5. Breaking-change risk

| Change | Runtime risk | Type-level risk | Decision |
| --- | --- | --- | --- |
| New optional fields (`commandId`, `reportedAt`, `reasonCode`, `role`, `metadata`) | None | None | Apply |
| New `report` event in `KinetixCommandLifecycleEvent` | None: existing events behave exactly as before | A consumer with an exhaustive `switch` over **events** gets a compile error. Events are inputs products construct, rarely switch over | Apply, record in changeset |
| New rejection codes `stale-response`, `stale-report` | None unless a product passes the new ids | Exhaustive switch over `rejection.code` would need a new arm | Apply, record |
| Capability kinds `color`, `media` | None | Exhaustive switch over `KinetixDeviceCapabilityKind` needs new arms; no switch over it exists in this repo (`rg "capability\.kind"` finds none) | Apply, record |
| Connectivity `connecting`, `unknown` | `describeConnectivity`, `summarizeDeviceState`, health derivation and React components all switch over it | Breaks exhaustive switches in consumers **and** changes G4's output text | **Not applied.** Proposed for a separate, explicitly-versioned change |
| Renaming `requested`/`confirmed` to `desired`/`reported` | Breaks every consumer | Breaks every consumer | **Not applied** |
| New `@kinetixui/iot-contract` package | — | — | **Not created**, see §6 |

The package is Experimental and its README says the API may change without a major version; the
additive type widenings above are still listed so a consumer is not surprised.

## 6. Architecture decision: no new package

`@kinetixui/iot/functions` already is a platform-neutral contract layer: no React, no DOM, no runtime
dependencies, and two independent guards (source closure test, built-`dist` check) that fail if that
changes. A separate `@kinetixui/iot-contract` would duplicate those guards, add a second version to
release and keep in step, and move no code that is not already isolated. The contract additions go into
`src/types` and `src/functions`, behind the existing guards.

## 7. Implementation plan (what M1 changes)

1. `types/command.ts`: `commandId`, `reportedAt`, `reasonCode` on the lifecycle; `commandId` / `code` on
   events; a `report` event; two rejection codes; `KinetixCommandStrategy` and
   `KinetixCommandPresentation`.
2. `functions/commands.ts`: correlation check, `report` handling, `presentCommandValue`.
3. `types/device-state.ts` + new `functions/capabilities.ts`: kinds `color` and `media`, optional
   `role`, `resolveCapabilitySupport`.
4. `types/device.ts` + `functions/battery.ts`: `KinetixBatteryState`, `resolveBatteryState`.
5. `types/activity.ts`: optional `metadata`.
6. A contract test file covering the brief's ten cases plus the reproduced gaps G1–G3, and capability
   validation cases (lamp, speaker, camera, lock, air conditioner, irrigation valve, soil sensor,
   infusion pump, industrial motor).
7. `docs/iot/DEVICE-INTERACTION-CONTRACT.md`: semantics, strategies, ownership boundary, domain
   examples, language-neutral mapping, platform parity matrix.

Not in M1: React control changes, any new component, Angular or native code, connectivity widening (G4/G11).

---

# M2A — mature the existing device controls

Audited at `main` **`20f725d`** (2026-10-05: #307 merged as `6b1be4e`, #308 as `20f725d`). `@kinetixui/iot`
**0.2.0**. Scope: fix connectivity truth (G4, G11) and wire the four existing controls to the M1 lifecycle
and strategies. No new control, no transport, no Angular or native code.

## 8. Repository truth before M2A edits

| Fact | Evidence |
| --- | --- |
| Connectivity union | `"online" \| "offline" \| "unreachable" \| "stale"` (`types/device-state.ts`) |
| Exhaustive switches over it | One: `describeConnectivity`. Everything else compares to `offline` / `unreachable` (`health-bar.tsx` `isOffline`, `hierarchy.ts` rollup, `summarizeDeviceState.needsAttention`) |
| Consumers outside the package | `apps/web` `device-detail.tsx` (`describeConnectivity`), `lib/iot-sim/selectors.ts` (`deriveDeviceConnectivity`, and `{ state: "offline" }` for a device with no runtime) |
| Control props | Power `state`/`requested`, level `value`/`target`, setpoint `target`/`requestedTarget`, mode `value`/`requested`; each takes a `control` from `resolveControlState`. None takes a lifecycle or a strategy |
| Power pending drawing | The track **moved to the request** with a hollow knob and no mark: by the M1 definitions that is `hybrid`, although M1's docs called every control `confirmed` |
| Live regions | `CommandLifecycle` and `AutomationBuilder` (`role="status"`), `PairingFailure` (`role="alert"`), and `DeviceSetpointControl`'s `aria-live` sentence (the README's list omitted it) |
| Tests | 29 files, 844 tests, all passing |

## 9. G4 reproduced before any edit

A throwaway Vitest probe (not committed) against unmodified `20f725d`:

```text
summarizeDeviceState({ id: "d1" })        → connectivity "offline", needsAttention true,
                                            "Device: health unknown. offline."
deriveDeviceConnectivity({})              → { state: "offline" }   (no status at all)
deriveDeviceConnectivity({ status: "weird" }) → { state: "offline" } (unrecognised status)
deriveDeviceHealth({ status: "weird" })   → level "warning", reason "The device is offline"
resolveControlState()                     → availability "offline", "Device offline. Showing the last known setting"
```

Three defects, not one: a missing connectivity, a missing status and an unreadable status all became a
claim that the device is gone. The M1 test that pinned G4 (`device-contract.test.ts`, "known
limitation") was removed when the fix landed; its replacement is `functions/connectivity.test.ts`.

A fourth, related finding, **recorded and not changed** (G12): `resolveControlState()` with no
`deviceStatus` resolves to availability `offline` and the description "Device offline. Showing the last
known setting". A test on `main` pins this as "fail safe" (the control is not interactive). Making
availability `unknown`-aware is a change to `KinetixControlAvailability` and belongs with a control-state
revision; M2A avoids depending on it — a control given only a `lifecycle` does not invent a device status.

## 10. What M2A changed

**Connectivity.** `connecting` and `unknown` added. Missing connectivity summarises as `unknown`; a missing
or unrecognised device status derives `unknown` connectivity and adds no health reason; a backend that
literally reports `unreachable` keeps the word instead of becoming `offline`. `normalizeDeviceStatus`
is unchanged (a status badge still falls back to `offline`; that is the status model, not connectivity).
`unknown` and `connecting` add no health reason and no evidence, and do not set `needsAttention`.
The demo simulation's missing-runtime case is `unknown`.

**Controls.** Each of the four takes `lifecycle`, `strategy` (default `confirmed`) and `announce`. One
pure function, `resolveControlPresentation`, wraps `presentCommandValue` and adds the request and the
outcome; the legacy value props are turned into a lifecycle first, so both paths share the rules. The
controls read only the presentation's fields (`valueSource`, `indicatePending`, `rolledBack`), never the
strategy's name — the browser negative control below caught an earlier draft that did.
`describeControlOutcome` writes the one sentence each control announces. `supersedeCommandLifecycle`
replaces an open request (20 → 40 → 80) while keeping report ordering.

| Control | Before (main) | After, `confirmed` (default) | `hybrid` | `optimistic` |
| --- | --- | --- | --- | --- |
| Power | Track and knob moved to the request; knob hollow; no mark; `aria-checked` = reported | **Changed:** switch stays at the reported end with its mark; dashed track; "Turning on"; `aria-busy` | The old look | Moves to the request, filled, no mark; "On"; `aria-checked` = shown; `aria-busy`; rolls back in words |
| Level | Numeral and fill = reported; hatched extension, marker, chip | Unchanged | Numeral = request; chip "Requested, not yet confirmed. Device reports X" | Numeral and fill = request; no chip, hatch or marker; `aria-busy` |
| Setpoint | Numeral = reported target; chip; ring with dashed request | Unchanged; #307 ring motion intact | Numeral = request; chip names the device target; ring unchanged | Numeral and arc = request |
| Mode | Reported mode checked; request dashed, named "requested, not yet confirmed" | Unchanged | Request raised and dashed; reported stays checked | Request checked without the tick; rolls back in words |

Every control sets `aria-busy` while a request is open (the setpoint on its container and both steppers).
With a `lifecycle`, every control also renders a polite `role="status"` region (present before its first
message) and, after a request that did not happen, a visible sentence (`data-outcome`). Setpoint's older
`aria-live` sentence is replaced by the announcer when a lifecycle is passed, so there is one region.

**Compatibility.** All new props are optional; the value props became optional (a lifecycle supplies the
values). Old callers keep their markup and announce nothing new. The one visible change is power's
default pending drawing; `strategy="hybrid"` restores the old look in one prop. Type-level: an exhaustive
`switch` over `KinetixConnectivityState` needs `connecting` and `unknown` arms.

## 11. Evidence

**Tests.** `functions/connectivity.test.ts` (brief tests 1–6, 21), `functions/control-presentation.test.ts`
(7–14, 17, 18, 20), `react/control-strategies.test.tsx` (7–20 through the rendered controls, axe on each
strategy, compatibility). iot suite: 32 files, 901 tests.

**Negative controls** (each mutation applied alone, the four test files run, the source restored):

| Mutation | Result |
| --- | --- |
| `summarizeDeviceState` default back to `"offline"` | 1 test fails: "(1) a state with no connectivity summarises as unknown" |
| `presentCommandValue` shows the request under `confirmed` | 5 fail, incl. (7), (11); in the browser gate power fails in all 7 conditions and the level scenario fails |
| Optimistic keeps the request after failure (rollback removed) | 10 fail, incl. (9), (18) |
| Correlation check disabled | 5 fail, incl. (11), both (14) |
| Pending sentence removed from `describeControlOutcome` | 10 fail, incl. (19) |
| `aria-busy` removed from power | 3 fail, incl. (19) |
| Superseded ids not recorded, or their guard removed (review round 2) | 1 fail each: the ID-less supersede case |
| `aria-busy` removed from the setpoint container (review round 2) | 1 fail |

**Browser.** `pnpm check:iot-strategies` drives the nine `IoT/Control strategies` Storybook demos through
light, dark, keyboard-only, reduced motion, forced colours, RTL and 390px at 200% text, reading back
roles, `aria-checked`/`aria-busy`/`aria-valuetext`, the status sentence and the visible outcome, and
running axe-core. 63 scenario runs, 565 checks; three consecutive green runs. This is an automated
accessibility-tree check; **no manual screen-reader testing was done.**

### Review findings fixed on this branch

| Finding | Fix |
| --- | --- |
| **P1** (Codex). `supersedeCommandLifecycle` without a new `commandId` dropped the previous id, and the mismatch guard only fires when the current request has an id — so a late `confirm` tagged with the superseded id settled the newer request (reproduced: a reply for 40 confirmed 80). | The superseded id moves to a new bounded `supersededCommandIds` on the lifecycle, and a response tagged with any of them is refused as `stale-response` whether or not the current request has an id. An id deliberately reused by the new request is not listed. |
| **P2** (Codex). `DeviceSetpointControl` never set `aria-busy`, unlike the other three and the documented contract — worst under `optimistic`, which withholds the chip and announces nothing while it waits. | `aria-busy` on the container and both steppers while a request is open. |

## 12. Not done in M2A

- G12 above (`resolveControlState` without a device status). Fixed in M2B (§14).
- No connectivity UI component exists to give `connecting` or `unknown` a glyph; the words come from
  `describeConnectivity`, and `DeviceStatusBadge` renders device status, not connectivity.
- Pending stays non-interactive in `resolveControlState`, so superseding a request from the control
  itself needs the product to pass its own `control` (the level demo does).
- Angular, SwiftUI, Compose and Flutter have no IoT controls.

---

# M2B — G12, colour, lock and media

Started from `main` **`f512e62`** (2026-10-05: #308 merged as `20f725d`, #309 as `f512e62`). `@kinetixui/iot`
**0.2.0** in source (the 0.3.0 release PR #251 is untouched). Scope: fix G12 first, then three controls on
the M1/M2A contract. No transport, no camera or live video, no Angular or native code, no M3.

## 13. Repository truth before M2B edits

| Fact | Evidence |
| --- | --- |
| M1/M2A present | `KinetixCommandStrategy`, `resolveControlPresentation`, `supersedeCommandLifecycle`, connectivity `connecting` / `unknown` all exported from `@kinetixui/iot/functions` |
| Controls | `DevicePowerControl`, `DeviceLevelControl`, `DeviceSetpointControl`, `DeviceModeControl` (README: "four device controls") |
| Capabilities | `color` kind (M1), `media` kind = a preview/stream surface; the M1 speaker is `mode`/`media-playback` + `level`/`volume`; the M1 door lock is `mode`/`lock` |
| `resolveControlState` consumers | Only inside `packages/iot` (stories, tests, `DeviceControlCard` and the controls); none in `apps/web` |
| Tests | 32 files, 903 tests, all passing |
| Browser gate | `pnpm check:iot-strategies`: 9 demos × 7 conditions, 63 runs, 586 checks |

## 14. G12 reproduced, then fixed

A throwaway probe (not committed) against unmodified `f512e62`:

```text
resolveControlState()                         → offline, interactive false, lastKnown true, "Device offline. Showing the last known setting"
resolveControlState({ deviceStatus: null })    → offline, same sentence
resolveControlState({ deviceStatus: "" })      → offline, same sentence
resolveControlState({ deviceStatus: "weird" }) → offline, same sentence
resolveControlState({ deviceStatus: "unreachable" }) → offline (the word is lost)
resolveControlState({ commandStatus: "sent" }) → offline, phase "requested"
```

Root cause: `resolveControlState` read `normalizeDeviceStatus(input.deviceStatus)`, whose documented
fallback for a status *badge* is `offline`, and a test pinned it as "fails safe". The fail-safe (no input)
was right; the claim was not.

Fix: availability is decided from evidence. A missing or unreadable status is `unknown` ("Device status
unknown", not interactive, not last-known); the spelling `unreachable` keeps its word; an optional
`connectivity` input lets the link's own claim (`offline`, `unreachable`, `connecting`, `stale`) win, and
`online` counts as reachability when no status is given. `KinetixControlAvailability` gains `unknown`,
`unreachable` and `connecting`; `describeControlState` gives each its own sentence and only `offline`'s
says "offline". `DeviceControlCard`'s chip says "Status unknown", "Unreachable" or "Connecting", and
"last known value" only where something was known. Contract §6.2 has the before/after table.

## 15. Decisions

| Question | Decision | Why |
| --- | --- | --- |
| Default strategy for colour | `confirmed`, `hybrid` documented as the recommendation | Every control defaults to `confirmed`; a per-control default would make "the default" mean different things |
| Lock and `optimistic` | Excluded by type (`KinetixLockStrategy`), coerced to `confirmed` at runtime | Optimistic's purpose is to draw the request as the state; for a lock that is "Locked" before the bolt moved |
| Lock and `hybrid` | Allowed | The lock draws the request as a *direction* ("Locking", a dashed in-progress mark), never as the secure state |
| Lock widget | Named buttons ("Lock Front door"), not a switch | An action whose result may not arrive; a jammed or unknown lock offers both |
| Colour choices | `DeviceModeControl` in `tiles`, driven with option ids | Reuses the radiogroup, roving tab stop and arrow keys; the colour control keeps the one lifecycle, announcer and outcome |
| Seek and volume | `DeviceLevelControl`; a module-private format context writes time ("1:05") and speaks it ("1 minute 5 seconds") | Level semantics without a copy, and no new public prop on the level |
| Media capability | `mode`/`media-playback` + `level`/`volume`; `media` stays the preview surface | No taxonomy change; a playback endpoint and a picture are different shapes |
| Media direction | Transport and scrubber stay LTR in RTL | Playback controls and progress are not mirrored on any major platform; the text is |
| Colour model | `{ mode: "rgb" }` or `{ mode: "temperature" }` | The two shapes devices across domains share; HSV, CIE xy and vendor scales convert at the product's boundary |

## 16. Evidence

**Tests.** `functions/control-availability.test.ts` (G12 1–3), `functions/m2b-controls.test.ts` (colour
4–10, lock 11–17, media 18–21 at the contract level), `react/m2b-controls.test.tsx` (G12 in the
components; 4–24 through the rendered controls; axe). The M1-era test that pinned G12 now asserts
`unknown`. iot suite: 35 files, 961 tests.

**Browser.** `pnpm check:iot-strategies` gains eleven demos — G12, colour × 3 strategies, lock success,
lock failure, lock unreachable + stale reply + reconnect, media play success, play failure, seek + volume,
and unknown/unsupported media — in the same seven conditions: 140 runs, 1598 checks, green. It reads back
roles, names, `aria-checked`/`aria-pressed`/`aria-busy`/`aria-valuetext`, the status sentences and visible
outcomes, the forced-colours fill of the colour preview, the media transport order under RTL, and runs
axe-core. An automated accessibility-tree check; **no manual screen-reader testing was done.**

**Negative controls.** Each mutation was applied to the working tree, run against the iot unit suite and the
browser gate (`--only` its scenarios, on a fresh Storybook build), then restored; none was committed.
Logs and the runner: `/mnt/project-files/iot-m2b/negative-controls/`.

| # | Mutation | Unit tests failing | Browser gate (scenario runs red) |
| - | -------- | ------------------ | -------------------------------- |
| 1 | A missing status maps back to `offline` (G12) | 8 | 14 of 14 (unknown-status, media-unavailable) |
| 2 | Colour lookup and pending check by reference | 1 | 14 of 14 (colour-confirmed, colour-hybrid) |
| 3 | Lock headline and `data-lock-state` follow the request | 5 | 14 of 14 (lock-confirmed, lock-unreachable-stale) |
| 4 | Stale-response (`commandId`) guard removed | 10 | 7 of 7 (lock-unreachable-stale) |
| 5 | Media headline follows the request, not the device | 2 | 14 of 14 (media-play-confirmed, media-play-failure) |
| 6 | `aria-busy` removed from the lock | 1 | 14 of 14 (lock-confirmed, lock-failure) |
| 7 | `presentCommandValue` keeps the request after failure | 5 | **0 of 14**: the colour, mode and media controls only draw a request while it is pending, so the UI still rolled back |
| 8 | 7, plus the colour and mode controls drop their pending guard | 7 | 7 of 7 (colour-optimistic-failure) |

Mutation 7 is the one browser survivor, reported rather than hidden: rollback is guarded twice (in
`presentCommandValue` and in each control), the unit suite pins the function layer, and mutation 8 shows
the browser gate catches the regression once it reaches what is drawn. (The gate's "N of M checks" line
counts a run that throws as one failure and stops counting that run's checks, so it is not a ratio; runs
are the honest unit here.)

## 17. Not done in M2B

- Manual screen readers (VoiceOver, NVDA, TalkBack) and real hardware.
- `connectivity` is accepted by `resolveControlState`, but no shipped component derives it for you yet.
- A colour picker beyond the product's own options (wheels, sliders, HSV) — deliberately not built.
- Lock access (who may unlock, PIN, audit trail) is application logic on top of the activity log.
- Previous/next are callbacks without a lifecycle; their result is the next title the product reports.
- Angular, SwiftUI, Compose and Flutter have no IoT controls; nothing in this slice changes that.

---

# M3 — Monitoring and feedback

Started from `main` **`19557fb`** (2026-10-06: #310 merged, M2B head `a4e189f8` present). `@kinetixui/iot`
**0.3.0** in source and on npm (the M2B changeset is still pending for the next Version PR). Scope: six
monitoring and feedback surfaces on the M1/M2A/M2B contract, React only. No transport, vendor, camera,
spatial, device card, automation, dashboard, Angular or native code.

## 18. Repository truth before M3 edits

| Fact | Evidence |
| --- | --- |
| M2B present | `DeviceColorControl`, `DeviceLockControl`, `DeviceMediaControl` exported; `.changeset/iot-controls-m2b.md` pending |
| Tests | 35 files, 964 tests, all passing |
| React barrel | 8 primitives, 7 controls, 27 patterns (README and the `/docs/iot` catalogue both derived from it) |
| Browser gate | `pnpm check:iot-strategies`: 20 demos × 7 conditions, 140 runs, 1598 checks |
| Existing names | `TelemetryMetric` and `EnergySummary` already ship (0.3); `BatteryIndicator`, `ConnectionHealth`, `CommandLifecycle` and `ActivityTimeline` do neighbouring jobs |
| Freshness | Only a boolean (`detectStaleReading`, an undated reading with a window counts as stale) |
| Connectivity | `KinetixConnectivityState` (six states) existed since M2A, but no component rendered it |
| Unknown numbers | `TelemetryMetric` showed a `null` or `NaN` value as "Unavailable", the same word as a device saying it cannot measure |
| Activity origin | `KinetixActivityEvent` had `actor` and `source` but no origin; nothing distinguished "a person did this" from "we do not know who" |

## 19. Decisions

| Question | Decision | Why |
| --- | --- | --- |
| `TelemetryMetric`, `EnergySummary` | Extended additively; every 0.3 prop and default kept | Two components with the same name would split consumers; the new props are optional |
| Battery, connection, feedback, activity | Four new components (`DeviceBattery`, `DeviceConnection`, `CommandFeedback`, `DeviceActivity`) | The neighbouring components have different jobs and public contracts (a stepper, device-status rows, a day-grouped log); changing them would break consumers |
| Freshness | `fresh` / `stale` / `unknown`, decided only from a consumer-supplied `staleAfterMs` and a timestamp | No hidden timeout: without a policy or a timestamp the honest answer is `unknown`, never `fresh` |
| Undated reading with a window, in `TelemetryMetric` | Still drawn as last known (the 0.3 rule) | Changing it would turn a cautious display into a confident one for existing consumers |
| Unknown vs unavailable numbers | `null`/`NaN` now read "Unknown"; "Unavailable" only when the product says so (`unavailable`) | A missing value is not a device fault; the visible word changes and the changeset says so |
| Delta | Only when both the current and the comparison value are real numbers | A delta against a guessed zero is a fabricated trend |
| Feedback wording | `requested`, `acknowledged`, `retrying` end "not yet confirmed"; `timed-out` "may still apply" | Acknowledgement is receipt, not success; a timeout is silence, not failure |
| Feedback announcement | Off by default; when on, nothing is announced while an optimistic request is pending | The owning control already announces; doubling it is noise, and optimistic draws are not news |
| Activity origin | Optional `origin`; missing or unrecognised is `unknown` ("Source unknown"), never inferred from `actor` or `source` | Attributing an action to a person who did not take it is the worst error a history can make |
| Activity order | `order` is required | Newest-first and oldest-first are both valid; a default would hide the choice |
| Capability model | No new kind or role | Battery is `telemetry`/`battery`, energy is telemetry, connectivity and activity are not capabilities; `support` props reuse `KinetixCapabilitySupport` |

## 20. Evidence

**Tests.** `functions/monitoring.test.ts` (26) and `react/monitoring.test.tsx` (36, axe in jsdom) cover the
brief's sixteen named cases and the six components. The 0.3 test that expected "Unavailable" for `null`/`NaN`
now expects "Unknown". iot suite: 37 files, 1026 tests.

**Browser.** `pnpm check:iot-monitoring` (new, wired into `a11y-browser.yml`) opens eight `IoT/Monitoring`
stories, 36 scenarios, in seven conditions (light, dark, keyboard, reduced motion, forced colours, RTL, 390 px
at 200% text): 252 runs, 1562 checks, green. It reads back the spoken sentences from the accessibility tree,
the visible words and glyphs, the truth rules per scenario (no "offline" for unknown, no "fresh" for stale, no
"0" for unknown, no "confirmed" before confirmation, "Source unknown" for missing origin), clipping at 200%
text, glyph boxes in forced colours, inline-start placement in RTL, the absence of infinite animation under
reduced motion, tab stops and live regions, and runs axe-core. Chromium only. An automated
accessibility-tree check; **no manual screen-reader testing was done.**

**Negative controls.** Each mutation was applied to the working tree alone, run against the iot unit suite and
the browser gate (`--only` its scenarios, on a fresh Storybook build), then restored; none was committed. Logs
and the runner: `/mnt/project-files/iot-m3/negative-controls/`.

| # | Mutation | Unit tests failing | Browser gate (scenario runs red) |
| - | -------- | ------------------ | -------------------------------- |
| 1 | A missing connectivity state normalises to `offline` | 2 | 7 of 21 (connection-unknown red; connection-online and -offline unaffected, as expected) |
| 2 | `resolveFreshness` answers `fresh` past the window | 3 | 7 of 14 (battery-stale red; energy-stale uses the telemetry path, see 2b) |
| 2b | `detectStaleReading` (the telemetry and energy stale path) never stale | 12 | 14 of 14 (telemetry-stale, energy-stale) |
| 3 | `requested` headline reads "Confirmed" | 3 | 14 of 14 (feedback-requested, feedback-script) |
| 4 | An unknown numeric value renders as `0` | 4 | 28 of 28 (telemetry-unknown, telemetry-unavailable, energy-unknown, energy-partial) |
| 5 | A missing activity origin resolves to `user` | 2 | 7 of 7 (activity) |
| 6 | The visible "Last known value" label removed from stale telemetry | 3 | 14 of 14 (telemetry-stale, energy-stale) |

The first run of control 1 found a gap in the gate, not the code: the `connection-unknown` story passed
`"unknown"` explicitly, so it never exercised the missing-input path and the browser gate stayed green
(0 of 21). The story now passes no state for that scenario, and the re-run is the row above. Control 2 is
split because freshness has two paths: `resolveFreshness` (battery, M3) and the 0.3 `detectStaleReading`
that `TelemetryMetric` and the energy form still use; each is caught on its own.

## 21. Not done in M3

- Manual screen readers (VoiceOver, NVDA, TalkBack), Safari, Firefox and real hardware.
- No component derives freshness or connectivity from a transport; the product passes them in.
- `DeviceActivity` does not group, filter or paginate; `ActivityTimeline` still does the day-grouped log.
- Angular, SwiftUI, Compose and Flutter have no monitoring components; nothing in this slice changes that.
- Roadmap naming updated after the owner decision: M4 is Device Integration; the old camera, security,
  spatial and device-card scope is M7. Native parity and an Angular reassessment remain M5; reference
  experiences remain M6. This renaming does not revise the historical audit evidence.
