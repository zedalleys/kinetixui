---
"@kinetixui/iot": minor
---

Connect a real device provider without KinetixUI owning the connection (M4B). All additive; nothing existing changes.

- **Device ledger.** `createDeviceLedger`, `requestDeviceChange`, `applyDeviceSignals` and `expireDeviceCommands` are pure functions over a plain value the application stores wherever it keeps state. Each registered capability has one command lifecycle, so the M1–M4A rules (correlation, supersession, report ordering, two clocks, adjusted confirmations) apply to provider traffic unchanged. Every call returns `{ ledger, transitions }`, structured records an application can log or audit; nothing is thrown, sent, scheduled or stored.
- **Normalized signals and intent.** `KinetixDeviceSignal` (`report`, `snapshot`, `acknowledgement`, `result`, `connectivity`) is what an adapter emits; `KinetixCommandIntent` is what `requestDeviceChange` returns for the application to send. Neither carries a provider name, entity id, topic, URL or credential.
- **Truth kept.** An acknowledgement never confirms. A lost link never fails, refuses or times out a request, and a returned link confirms nothing until the device reports. A timeout reads "may still apply", never refused. Late replies to a replaced request are refused in any order. Signals for devices or capabilities the application did not register are refused rather than added.
- **Selectors.** `selectCapabilityLifecycle` feeds a control's `lifecycle` prop and keeps its identity until that capability changes; `selectDeviceConnectivity` feeds `resolveControlState`; `toDeviceState` derives a `KinetixDeviceState` for `summarizeDeviceState` and the device cards.

A Home Assistant reference adapter (binary power, synthetic fixtures) lives in the repository's `packages/iot/reference/` and is not published. No provider adapter is included in the package, and the ledger has not yet been run against a live provider or a physical device.
