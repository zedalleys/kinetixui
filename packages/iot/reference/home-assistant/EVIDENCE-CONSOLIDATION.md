# M4C-A evidence consolidation

Reviewed donor [PR #324](https://github.com/zedalleys/kinetixui/pull/324) at
`00116082ccd071778c74f054f47798ffaae08f21`. Implementation candidate is PR #325.
This captures the donor scenario matrix without introducing another session, configuration vocabulary,
transport double, or live runner. All results below are synthetic; provider and physical proof remain blocked.

## Scenario coverage map

`session` means `live-session.test.ts`; `fixture` means `home-assistant.test.tsx`.

| Donor scenario | Retained coverage |
| --- | --- |
| S01 initial state / S02 request / S03 acknowledgement / S04 reported ON | session: authenticates, subscribes before snapshot, separates acceptance and confirmation |
| S05 supersession / S15 stale response / S18 rejection | session: routes request IDs; fixture: records service-call refusal |
| S06 reported OFF / S07 external switch | fixture: full light flow; session: external report without request or origin claim |
| S08 disconnect / S10 reconnect without confirmation | session: old callbacks, reconnect, no automatic replay; unavailable/removal test |
| S09 unavailable | session and fixture: pending uncertainty preserved |
| S11 reconnect unexpected value | session: unavailable/removal test retains off and pending request |
| S12 reconnect requested value | session: reconnect snapshot confirmation |
| S13 exact deadline / S14 late response | session: exact deadline then late report |
| S16 out-of-order report | session: rejects older observations; stale-ordering negative control |
| S17 unsupported intent | fixture: unsupported value is refused, nothing sent; live session rejects unknown target without dispatch |
| S19 rapid toggles | session: new three-toggle regression settles only latest command |
| S20 provider boundary | fixture vocabulary checks; session ledger credential exclusion; package dry-run |

Presentation evidence remains in the existing rendered fixture and published control/presentation tests.
The donor's dedicated 11-state presentation table is preserved at its pinned PR, not claimed ported or rerun.
Manual screen-reader validation remains pending. Binary power has no adjusted-value evidence.

## Assets reviewed and disposition

- Scenario matrix and manual physical checklist: retained here and in LIVE-VALIDATION.md. Added direct
  single-session regressions for external reports and three rapid toggles.
- Diagnostics recorder: not imported. #325 prints fixed status codes and normalized pseudonymous state,
  without raw inbound frames or persistence; transition capture is not required by this operator CLI.
- Sanitizer and wire recording: not imported. Avoid creating a raw-frame evidence path solely to sanitize it.
  If evidence persistence is later authorized, review the pinned donor sanitizer as a starting point and test
  it against that exact output contract before reuse. No sanitizer security guarantee is claimed here.
- Second transport/runner/fake: intentionally omitted. #325 has authentication/setup deadlines, input shape
  validation, bounded unanswered commands and lifetime retries; donor presentation/evidence does not require
  replacing those boundaries.
- Donor findings: provider `unknown` state retaining a last-known value and offline pending-label wording
  need operator/presentation review. They are not physical observations or silently fixed in consolidation.

## Operator observations still required

Use one harmless paired binary-power light/plug. Independently record initial state; on/off; external button
changes; unplug/replug; pending disconnect; timeout uncertainty; and three quick toggles. Record provider
reports and physical observations separately with UTC time, commit, versions and pseudonymous mapping.
Do not infer physical operation from service acknowledgement or a matching provider report. Follow the
credential and TLS controls in LIVE-VALIDATION.md. No live endpoint/account/device has been supplied.

## Consolidation checks

Full IoT suite: 44 files / 1,150 tests pass. Typecheck and lint pass. Seven negative controls
fail assertions as intended (acknowledgement 3, old callback 1, unknown result 1, TLS 1, stale ordering 1,
reconnect false confirmation 1, deadline 3); restored session baseline 14/14 passes. Published source,
exports and dependencies are unchanged. Hosted CI on the consolidation commit is a separate gate.
