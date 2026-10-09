# M4C-A — application-side provider validation

This is a server-only operator harness for one allowlisted Home Assistant light or switch. It is outside
`src`, package builds, exports and npm publication. It reuses the M4B adapter and the provider-neutral ledger;
it adds no runtime dependency or public API. M4 is **Device Integration**. The previous camera/security/spatial
scope is **M7**; M5 native parity / Angular reassessment and M6 reference experiences stay unchanged.

## Evidence and limits

| Layer | Evidence | Status |
| --- | --- | --- |
| M4B baseline | PR #323 merged; main `51cb6fe1f71534a5503c32aa2751dd2b528c8176` | Verified repository evidence |
| Protocol shapes | [Home Assistant WebSocket documentation](https://developers.home-assistant.io/docs/api/websocket/) | Documentation-based, not captured live |
| Session → adapter → ledger | `live-session.test.ts`, injected socket and clock | Synthetic automated evidence only |
| UI selectors/control | Existing `home-assistant.test.tsx` fixture flow | Synthetic automated evidence only |
| Real Home Assistant | No endpoint, credential or authorized instance supplied | Blocked; not validated |
| Physical light/plug | No paired device or independent observer supplied | Blocked; not validated |

A service-call success means **acknowledged**, never physical confirmation. A matching state report can
confirm the ledger request, including a reconnect snapshot or a late report after timeout. It does not prove
which actor caused the change or that a lamp visibly lit. Physical evidence must be recorded separately.

## Run locally on a trusted server

Use Node 22+ (native WebSocket) and the repository's locked pnpm dependencies. From the repository root:

```sh
pnpm --filter @kinetixui/iot exec tsup reference/home-assistant/live-session.ts --format esm --platform node --out-dir reference/home-assistant/dist
node packages/iot/reference/home-assistant/live-runner.mjs
```

Inject `HA_WS_URL`, `HA_ENTITY_ID` and `HA_ACCESS_TOKEN` through the server process's protected environment
or secret manager. Do not put the token in a command argument, source, fixture, browser bundle, screenshot,
log or committed env file. Configuration examples intentionally contain no token. `HA_WS_URL` must be a
fixed operator-configured `wss://HOST/api/websocket`, with no userinfo, query or fragment. Explicit
`HA_ALLOW_LOOPBACK_WS=1` permits plaintext only to `localhost`, `127.0.0.1` or `::1` for a local test instance;
prefer TLS in every other case. Use a dedicated non-admin validation account, the narrowest available
permissions, a harmless test light/plug and revoke its credential afterwards. The entity allowlist constrains
this harness; it does not reduce the provider token's own privileges.

The CLI connects but sends **no device command automatically**. `status` prints only fixed session codes and
the normalized ledger; `on` / `off` explicitly request the allowlisted device; `quit`, EOF or SIGINT dispose
the socket and timer. Missing/invalid configuration exits before connecting. Generated `dist/` is ignored.

## Boundaries and behavior

- Authentication credentials stay with the trusted server owner. The pure adapter and ledger see none.
  The CLI has no HTTP listener, browser credential path or arbitrary client-supplied proxy URL. A production
  browser UI still needs its own authenticated, authorized server proxy, origin/CSRF controls and rate limits;
  this operator CLI does not implement that product surface.
- IDs are allocated before send. Setup IDs and command IDs have separate meanings. Results must match the
  current session's pending map; unknown/duplicate results cannot turn an arbitrary array into a snapshot.
  State events must match the current subscription, entity mapping and validated frame shape.
- Session callbacks are generation-guarded; every drop clears the map and subscription. Reconnect performs
  auth → acknowledged subscription → snapshot. Retryable link loss produces `connecting`, never command failure. Terminal blocks produce
  `unknown` connectivity because no further connection attempt is scheduled.
  Commands are not replayed. Requests require ready session and reported-online allowlisted target.
- The owner calls `tick` (CLI: every 100 ms). Auth/setup timeouts detach and reconnect; command deadlines
  remove correlation and call the ledger expiry rule, including exact deadlines. Timeout means uncertain,
  not rejected. Send failure also leaves uncertainty until a report or expiry. Provider rejection is distinct.
- Reconnects have exponential delays and a lifetime limit of three retries; auth/setup rejection blocks
  immediately. Restart the operator process deliberately after resolving a block. There is no persistent
  outbox, retry of device actions, registry, history, raw message log or unattended infinite retry.
- Inbound text is capped at 1 MiB, unanswered commands at 64, malformed frames are discarded by detaching.
  Native socket buffering is not controlled by this text-size check. Production deployments need their own
  transport resource limits. There is no heartbeat; silent link loss is detected by setup deadlines or command
  uncertainty, or by the native socket's close/error notification.

## Automated checks and negative controls

```sh
pnpm --filter @kinetixui/iot test
pnpm --filter @kinetixui/iot typecheck
pnpm --filter @kinetixui/iot lint
pnpm build:iot
pnpm check:iot-dist
node packages/iot/reference/home-assistant/negative-controls.mjs
```

Run negative controls only in a disposable checkout without concurrent edits/tests. The script first requires
a green baseline, individually sabotages acknowledgement semantics, session guarding, unknown-result routing,
TLS enforcement, stale-report ordering, reconnect false confirmation and exact request-map deadlines, requires assertion failures, and restores the source in
`finally`. It then requires a green restored baseline. These are synthetic controls, not provider observations.

Local verification on 2026-10-08 (America/Los_Angeles), Node 22.23.3:

- Full IoT suite: **44 files, 1,148 tests passed**, including 12 new live-session tests.
- IoT typecheck, lint, build and `check:iot-dist`: passed. Native runner syntax and missing-configuration
  exit were checked; the runner did not attempt a provider connection.
- All five negative controls caused assertion failures: ack-as-confirmation **2**, old-session callback **1**,
  unknown-result-as-snapshot **1**, insecure remote endpoint **1**, exclusive request deadline **3**.
  Restored baseline: **12 passed**.
- `check:manifest`, `check:verification`, `check:stories`, `check:usage`, `check:iot-examples`,
  `check:package-readmes`, `check:releases`: passed.
- Web production build: passed after building its UI dependency. Existing marketing-claims unused-variable
  lint warnings remain. No UI component or story changed; browser/visual suites were not rerun.
- Marketing `check:content` / `check:distribution`: structurally passed; no marketing files changed.
  Those checks do not verify actual publication content or engagement.
- npm dry-run packaging: excludes `reference/`; published exports and dependencies unchanged.

GitHub CI is a separate check of the PR head; local results above do not claim hosted checks passed.

## Operator evidence checklist (pending)

Record UTC run time, commit, Node and Home Assistant versions, anonymized entity mapping, and whether the
entity is virtual or physical. Do not attach raw frames containing account/context/device identifiers.
For each row, record observed lifecycle, normalized value and independent physical observation separately:

| Scenario | Expected normalized behavior | Evidence now |
| --- | --- | --- |
| Initial snapshot, on/off | Reported off; requested on; ack still off; report on confirms | Synthetic only |
| Ack without report | Acknowledged then timed-out, may still apply | Synthetic only |
| Report without ack | Matching report confirms; late ack cannot alter truth | M4B fixture only |
| Device unavailable / removed | Offline / unknown; pending request is not failed | Synthetic only |
| Link loss, reconnect off/on | Connecting; off keeps request open, on confirms | Synthetic only |
| Supersession and stale responses | Old command/session cannot settle replacement; older report refused | Synthetic only |
| Service rejection and send error | Rejection fails; send error leaves uncertainty | Synthetic only |
| Physical switch override | Report changes truth, no unsupported origin claim | M4B fixture only |

No release or changeset is required: the published package surface is unchanged. Completion of the automated
harness is not completion of M4C's live-provider/physical proof.

## Continuation verification — 2026-10-09

- PR #325 inspection: existing head `1af55de236`; hosted build, accessibility, CodeQL and Vercel checks passed.
- Addressed review finding: blocked authentication/setup/retry exhaustion now reports connectivity
  `unknown`, retaining the last reported value without suggesting an active retry. Regression assertions
  cover all three terminal paths; reconnect explicitly asserts zero automatic command replay.
- Full IoT unit/integration/accessibility/boundary suite: 44 files / 1,148 tests passed.
- Seven executable negative controls failed assertions as intended: acknowledgement 2, old callback 1,
  unknown result 1, insecure endpoint 1, stale report 1, reconnect false confirmation 1, exact deadline 3.
  Restored baseline: 12/12 passed; source restored byte-for-byte.
- IoT typecheck, lint, build, distribution import checks, manifest, verification, IoT examples and release
  metadata checks passed. Standalone session bundle and CLI syntax passed; missing configuration
  returned exit 1 before connection.
- npm dry-run: 113 files, zero reference files, no bundled dependencies. Published source/API unchanged.
- M4 Device Integration and M7 Camera, Security & Spatial verified in contract, audit and website roadmap;
  M5/M6 unchanged. No provider or physical validation performed; operator evidence remains pending.
- Security limits above remain applicable: token privileges, native socket buffering and no heartbeat.
  Follow-up hosted checks must be evaluated against the new PR commit. No merge or publication authorized.
