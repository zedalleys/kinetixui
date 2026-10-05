---
"@kinetixui/iot": minor
---

Add colour, lock and media controls, and stop reading a missing device status as offline (M2B).

- **Unknown is not offline (G12).** `resolveControlState()` with no device status, or one it cannot read, now resolves to availability `unknown` ("Device status unknown") instead of `offline` ("Device offline. Showing the last known setting"). It still refuses input, as before. `KinetixControlAvailability` gains `unknown`, `unreachable` and `connecting`; the status spelling `unreachable` keeps its word, and a new optional `connectivity` input (a `KinetixConnectivityState` or `{ state }`) lets a control take the link's own claim. `DeviceControlCard` says "Status unknown", "Unreachable" or "Connecting" rather than "Offline".
- **`DeviceColorControl`.** The colours a product offers (RGB or a white point, `KinetixDeviceColor`) as a named radiogroup with a preview, on `lifecycle` / `strategy` / `announce`. Colours are compared by value. New functions: `normalizeDeviceColor`, `describeDeviceColor`, `formatDeviceColorHex`, `previewDeviceColor`, `findDeviceColorOption`.
- **`DeviceLockControl`.** Never shows "Locked" before the device reports it. Accepts `confirmed` (default) and `hybrid` only (`KinetixLockStrategy`); `optimistic` from untyped code is drawn as `confirmed`. New functions: `normalizeLockState`, `resolveLockStrategy`, `describeLockState`, `describeLockOutcome`, `lockActions`, `LOCK_SENTENCE`.
- **`DeviceMediaControl`.** Play/pause, previous/next, a scrubber, volume and mute for any playback endpoint, with a lifecycle per command. Every action is a callback; the package plays nothing. Seek and volume reuse `DeviceLevelControl`. New functions: `normalizeMediaPlaybackState`, `describePlaybackState`, `describePlaybackOutcome`, `nextPlaybackRequest`, `formatMediaTime`, `describeMediaTime`, and the `PLAYBACK_SENTENCE`, `SEEK_SENTENCE` and `MUTE_SENTENCE` options.

Migration: an exhaustive `switch` over `KinetixControlAvailability` needs `unknown`, `unreachable` and `connecting` arms. A control whose device status was missing now says "Device status unknown" where it said "Device offline"; pass `deviceStatus: "offline"` (or `connectivity: "offline"`) when you do know the device is offline.
