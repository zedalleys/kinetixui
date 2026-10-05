---
"@kinetixui/iot": minor
---

Device interaction contract (M1), all in `@kinetixui/iot/functions` and additive:

- Command lifecycle: optional `commandId` correlation (a reply to a superseded request is refused as `stale-response`), a `report` event for reported state that is not an answer (reconnects, physical switches; out-of-order reports with `observedAt` are refused as `stale-report`), and a machine-readable `reasonCode` from `code` on `fail`/`timeout`/`deviceUnreachable`/`cancel`.
- Interaction strategies: `KinetixCommandStrategy` (`confirmed` default, `optimistic`, `hybrid`) and `presentCommandValue`, which decides what a control draws without changing the lifecycle.
- Capabilities: kinds `color` and `media`, an optional open-vocabulary `role`, `resolveCapabilitySupport` (`supported` / `read-only` / `unsupported`) and `findCapabilitiesByRole`.
- `resolveBatteryState` (level, availability, charging), `isSameDeviceValue`, and optional `metadata` on activity events.

Type-level note: `KinetixCommandLifecycleEvent`, `KinetixLifecycleRejection["code"]` and `KinetixDeviceCapabilityKind` gain members, so an exhaustive `switch` over them in consumer code needs a new arm. No runtime behaviour changes for existing callers.
