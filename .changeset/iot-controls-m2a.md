---
"@kinetixui/iot": minor
---

Mature the existing device controls (M2A).

- **Connectivity truth.** `KinetixConnectivityState` gains `connecting` and `unknown`. Missing connectivity now summarises as `unknown` instead of `offline`; a missing or unrecognised device status derives `unknown` connectivity and no longer adds an "offline" health reason; a backend status of `unreachable` stays `unreachable`. `describeConnectivity` says "Connecting" and "Connection unknown". `normalizeDeviceStatus` is unchanged.
- **Controls on the lifecycle.** `DevicePowerControl`, `DeviceLevelControl`, `DeviceSetpointControl` and `DeviceModeControl` accept optional `lifecycle`, `strategy` (`confirmed` default, `optimistic`, `hybrid`) and `announce` props. With a lifecycle they announce each stage once in a polite `role="status"` region, set `aria-busy` while a request is open, and say in words when a request did not happen (rolling back under `optimistic`/`hybrid`).
- **New functions:** `resolveControlPresentation`, `describeControlOutcome` and `supersedeCommandLifecycle`. Superseding a request records the one it replaced in `supersededCommandIds`, so a late reply to it is refused as `stale-response` even when the new request carries no id of its own.

Migration: nothing is required, and the value props still work (they are now optional). Two things to know: an exhaustive `switch` over `KinetixConnectivityState` needs `connecting` and `unknown` arms; and `DevicePowerControl` with `requested` now keeps its knob at the reported state by default (`confirmed`). Pass `strategy="hybrid"` for the previous moving-track drawing.
