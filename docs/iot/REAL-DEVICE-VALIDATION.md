# Real-device validation for the held `@kinetixui/iot` changesets

`@kinetixui/iot` is published at **0.5.0**. Four changesets are held in `.changeset-held/iot/` and together
would make **0.6.0**; the owner's decision (2026-10-09) is that they stay held until the device ledger has been
run against a live provider and a physical device. This document says which of their claims need that
evidence, how to collect it, and what counts.

**Status on 2026-10-11: no real-device evidence exists.** No test device, Home Assistant instance or
credential has been supplied, so every case below is unrun on hardware. Everything that has run is
simulation (a synthetic socket in `validation.test.ts`), and simulation never counts toward release.

The harness lives in `packages/iot/reference/home-assistant/` (outside `src`; not built, exported or
published) and builds on the PR #325 live session and the M4B adapter:

| File | Role |
| --- | --- |
| `live-session.ts` (#325) | Authenticated Home Assistant WebSocket session → adapter → ledger. Gains an `onLedger` observer and the provider's version. |
| `validation/cases.ts` | The case catalogue: held changeset, steps, criteria, and an evaluator per case. |
| `validation/trace.ts` | Records each ledger change as the UI would read it (stage, availability, `describeControlState`, `summarizeDeviceState`). Sees no frame, URL, entity id or credential. |
| `validation/evidence.ts` | Evidence record, verdict rules, sensitive-content screening and the release gate. The validator recomputes every case's automated result from the recorded trace window rather than trusting the stored outcome. |
| `validation/runner.ts` + `validation-runner.mjs` | Operator CLI. The only producer of `live-provider` records. |
| `evidence-gate.mjs` | Reads committed records in `validation/records/` and prints the gate. |
| `validation/negative-controls.mjs` | Reverts each held behaviour and harness guard in turn and requires the tests to fail. |

## 1. What each held changeset claims, and what evidence it needs

| Held changeset | Claim | Evidence it needs | Case |
| --- | --- | --- | --- |
| `iot-device-ledger` (M4B, minor) | A provider acknowledgement never confirms; only a device report does | **Live provider + physical device** | H02 |
| | The initial snapshot reflects the device | **Physical device** | H01 |
| | A physical switch press is device truth and confirms no request | **Physical device** | H04 |
| | A lost device link never fails, refuses or times out a request | **Physical device** (real link loss) | H05 |
| | A returning link confirms nothing until the device reports | **Physical device** | H06 |
| | A lost provider connection reads `connecting`; nothing is replayed | **Live provider** | H07 |
| | Late replies to a replaced request are refused in any order | **Live provider + physical device** (real reply ordering) | H09 |
| | Unregistered devices/capabilities refused; no provider vocabulary in the ledger | Pure logic; unit tests (`device-ledger.test.ts`, `device-ledger-boundary.test.ts`) | — |
| `iot-lifecycle-edges` (M4A, minor) | `report.receivedAt`: a device whose clock runs behind still settles | **Live provider**; exercised only if the provider clock is behind the app's | H03 (measured, not required) |
| | `timeout.commandId`: a stale timer cannot time out its successor | Pure logic; `lifecycle-edges.test.ts`, `device-ledger.test.ts` | — |
| | `isLifecycleAdjusted` / `adjustedValue` | **Not exercisable through Home Assistant**: its `call_service` result carries no applied value, so no `confirm` with a value can arrive. Needs a provider whose command result returns the applied value, on a non-binary capability. Unit tests only. | — |
| | `summarizeDeviceState` compares values by content (`isSameDeviceValue`) | Pure logic; `lifecycle-edges.test.ts` | — |
| `iot-offline-request-wording` (patch) | `describeControlState(offline, requested)` names the link and does not promise progress | **Physical device** to prove a real request is open when the link drops; the sentence itself is unit-tested | H05 |
| | Timeout reads "may still apply", never "failed" | **Physical device** (H05 secondary check) + unit tests | H05 |
| | `summarizeDeviceState` says "command not confirmed" when offline | Pure logic only. From ledger-derived state an open value request is always summarised as "requested but not confirmed" first, so this branch cannot be reached through a device (negative control confirmed this; see §6) | — |
| | README links absolute | Pure logic; `check:package-readmes` | — |
| `iot-pending-pulse-offline` (patch) | The pending chip stops pulsing when offline/unreachable (Level, Setpoint, Color, Lock, Media) | The pulse is a pure function of availability (`pendingMotion`), rendered-tested in `motion-rendered.test.tsx`. A device only needs to prove a real open request reaches `offline` availability (H05). Binary power has no pending chip of this kind, so the chip itself is not drawn by this harness. | H05 (input only) |

## 2. Cases and pass/fail criteria

The source of truth is `validation/cases.ts` (the runner prints steps and criteria for each case). Outcomes are
`pass`, `fail`, or `not-exercised` (the run never produced the situation); `not-exercised` is never a pass,
and a broken rule fails the case even when it is otherwise not exercised.

| Case | Situation | Automated pass criteria | Operator observes |
| --- | --- | --- | --- |
| H01 | Connect | Link online; reported value `on`/`off`; no open request | Device is in the reported state |
| H02 | One `on`/`off` | `requested` → acknowledgement leaves the value unchanged → only a report with the requested value confirms. Records ack and confirm latency | Device changed, not before the send |
| H03 | Same as H02 | Records `observedAt − sentAt`. Passes only when negative (provider clock behind) and the report still confirms; otherwise `not-exercised` | — |
| H04 | Press the device's own button | No request; value changes; no request settled | Change came from the button |
| H05 | Unplug, then immediately send a change | Request open when the link goes `offline`; link change never moves the stage; availability `offline`/`unreachable`; description starts "Device offline. The requested change is not confirmed."; summary never says "in progress"; the timeout must pass inside the case and leave the stage `timed-out`, never `failed` (without it the case is `not-exercised`) | Device stayed unpowered and unchanged |
| H06 | Plug back in (after H05) | Link back `online`; the link alone never settles; a report of the requested value confirms late, the old value leaves it unconfirmed | Which state the device came back in |
| H07 | Restart the test Home Assistant | `connecting` while away, never moving a lifecycle stage; reconnect through a snapshot; no request without an operator command. (A request held open across a provider restart is too fast to stage by hand with a working device; it stays covered by #325's synthetic session tests.) | — |
| H09 | `burst` (sends `on`, `off`, `on` back to back) | At least one reply to a replaced request arrives and is refused as stale (otherwise `not-exercised`); no replaced request changes the stage; ends under the last request's id with its value | Device ends in the last requested state |

**Verdicts in a record:** `pass` needs a `live-provider` run, a `physical` device, an automated `pass` and every
observation `matches`. A virtual entity gives `provider-only`; a missing observation gives `incomplete`;
synthetic runs give `simulation-only`. The validator recomputes every verdict and rejects a record whose
verdicts do not follow from its results.

## 3. What you need

| Item | Requirement |
| --- | --- |
| Device | **One dedicated test device** you own, controlling nothing that matters: a smart plug with a lamp on it, or a smart bulb in a lamp. Binary on/off, exposed in Home Assistant as `light.*` or `switch.*`. It must have a physical button or a way to change it by hand (H04), and you must be able to cut its mains power (H05/H06). Not a heater, appliance, lock, or anything in use by someone else. |
| Firmware | Whatever it runs; record the version from the device page in Home Assistant (Settings → Devices → the device). |
| Transport | Any. Record it (Wi-Fi, Zigbee, Z-Wave, Thread/Matter…). What matters is how fast its integration marks it **unavailable** after power loss: some integrations wait a long time (ZHA's default for mains-powered devices is two hours, configurable; Zigbee2MQTT's availability tracking is off by default). Check yours, and set `KX_TIMEOUT_MS` above that delay, or H05 ends `not-exercised`. |
| Provider | A Home Assistant instance you administer, used for testing. The record captures its version automatically. |
| Credential | A **long-lived access token** for a dedicated **non-admin** Home Assistant user (Profile → Security → Long-lived access tokens). Revoke it after the run. |
| Network | `wss://HOST/api/websocket` (TLS), or plain `ws://` only to loopback with `HA_ALLOW_LOOPBACK_WS=1`, e.g. through `ssh -L 8123:localhost:8123 <ha-host>`. |
| Machine | A trusted machine with Node 22+, a checkout of this branch, and `pnpm install` done. |

## 4. Run it

From the repository root, on the trusted machine:

```sh
pnpm --filter @kinetixui/iot exec tsup reference/home-assistant/validation/runner.ts reference/home-assistant/validation/evidence.ts \
  --format esm --platform node --out-dir reference/home-assistant/dist
```

Put these in the shell's environment (not on the command line, not in a file you commit):

| Variable | Value |
| --- | --- |
| `HA_WS_URL` | `wss://HOST/api/websocket` (or the loopback tunnel) |
| `HA_ACCESS_TOKEN` | The token. Never pasted anywhere else |
| `HA_ENTITY_ID` | The test device's entity id |
| `KX_TEST_DEVICE` | The same entity id again. Without it every `on`/`off` is refused |
| `KX_DEVICE_KIND` | `physical` (or `virtual` for a provider-only rehearsal) |
| `KX_DEVICE_MODEL`, `KX_DEVICE_FIRMWARE`, `KX_DEVICE_TRANSPORT` | Make/model, firmware version, radio |
| `KX_HA_INTEGRATION` | The integration that owns the device (e.g. `shelly`, `zha`, `tplink`) |
| `KX_TIMEOUT_MS` | Command timeout; above the integration's unavailability delay |
| `KX_EVIDENCE_DIR` | Where records are written (default `validation-records/`) |

```sh
node packages/iot/reference/home-assistant/validation-runner.mjs
```

The runner connects and sends nothing until you type a command. Then, in order:

1. `case H01` · look at the device · `observe matches` (or `differs`) · `end`
2. `case H02` · `on` (or `off`, the opposite of now) · watch it change · `observe matches` · `end`
3. `case H03` · the opposite command · `end` (no observation)
4. `case H04` · press the device's own button once · `observe matches` · `end`
5. `case H05` · unplug the device · straight away type the opposite command · wait until Home Assistant shows
   it unavailable and the timeout passes · `observe matches` · `end`
6. `case H06` · plug it back in · wait until Home Assistant shows it again · `observe matches came back <on|off>` · `end`
7. `case H07` · restart Home Assistant (Settings → System → Restart) · wait for `status` to show `ready` · `end`.
   The runner retries for about two minutes (2 s doubling, six tries); if `status` shows `blocked`, the
   restart took longer: `quit`, start the runner again and repeat H07.
8. `case H09` · `burst` (typing three commands by hand is too slow: each reply would arrive before the next request) · `observe matches` · `end`
9. `save`, then `quit`. Revoke the token.

`observe` notes are short and descriptive ("lamp lit"); a note that looks like a token, URL or entity id is
refused. `save` refuses a record that fails validation and says why.

Commit the saved JSON unedited to `packages/iot/reference/home-assistant/validation/records/`, then run
`node packages/iot/reference/home-assistant/evidence-gate.mjs`. A `virtual` rehearsal first is worthwhile
but is not evidence.

## 5. What unblocks the iot release

The gate (`releaseGate`) is satisfied when **H01, H02, H04, H05, H06, H07 and H09** each have a `pass` in at
least one valid, committed `live-provider` record of a **physical** device. H03 is reported but not
required, because whether it is exercised depends on the two clocks.

Satisfying the gate is evidence for the claims in §1 marked as needing a device, on one device, one
integration and one provider. It is not evidence for `adjustedValue`, for other providers, or for
screen-reader output on a device (still a manual check). Moving the changesets back into `.changeset/` and
releasing remain the owner's decisions.

## 6. Checks run on 2026-10-11 (simulation and tooling only)

- Validation suite: 15 tests on a synthetic socket. Every case evaluates `pass` against a well-behaved
  synthetic provider; every verdict is `simulation-only`; the gate reports not ready.
- Negative controls (`validation/negative-controls.mjs`): reverting the offline wording, dropping
  `receivedAt` from ledger reports, letting an acknowledgement confirm, removing test-device attestation,
  removing note screening, and counting simulation as a pass each fail the suite; sources restored.
- A control reverting `summarizeDeviceState`'s offline wording did **not** fail the suite. Cause: the ledger
  always reports an open value request as "requested but not confirmed", so the changed branch is unreachable
  from a device. That claim is now listed as unit-test-only above rather than given a control that cannot fail.
- The runner was exercised against a local loopback stand-in to check wiring (connect, case, evaluate, save
  refusal). That run is not evidence, and the validator rejects its stand-in provider version.
