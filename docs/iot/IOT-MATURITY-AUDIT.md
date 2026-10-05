# `@kinetixui/iot` maturity audit — M1, the contract foundation

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
| Connectivity | 4 states, separate from health | G4, G11 | **Do not change in M1**: adding `connecting`/`unknown` widens an exported union (see §5). Documented as a proposed change |
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
