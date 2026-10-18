---
"@kinetixui/iot": minor
---

Harden the command lifecycle for real devices (M4A). All additive; existing callers see no change unless they use the new fields.

- **Device clocks.** A `report` event takes an optional `receivedAt`: when the application received it, on the same clock as `now`. When given, it decides whether a report can settle the current request, so a device whose clock runs behind the application's no longer leaves a request it carried out pending until it times out. Reports are still ordered against each other by `observedAt`, so stale-report protection is unchanged.
- **Timeouts belong to a request.** A `timeout` event takes an optional `commandId`. A timeout for a superseded request, or for another request than the current one, is refused as `stale-response`, as a late reply already was, so a timer left over from a replaced request cannot time out the one that replaced it.
- **Adjusted confirmations.** New `isLifecycleAdjusted(lifecycle)` and the lifecycle's `adjustedValue`: true when the device confirmed the request with a different value (a setpoint rounded to the hardware's step, a clamped level). Set only by a `confirm` that carries a different value, never by a `report`. No new stage, and nothing a control draws or says changes.
- **Fix:** `summarizeDeviceState` compared requested and reported values by reference, so a requested colour equal to the reported one (a new object on every snapshot) was counted as unconfirmed. It now compares by content with `isSameDeviceValue`, as the rest of the package does.
