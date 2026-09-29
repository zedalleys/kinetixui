---
"@kinetixui/iot": minor
---

Add a device control layer, and make the React entry point tree-shake per component.

`@kinetixui/iot` could display a device but not operate one. Four controls —
`DevicePowerControl`, `DeviceLevelControl`, `DeviceSetpointControl` and
`DeviceModeControl` — now cover power, level, setpoint and mode, and they share one rule: what the
user asked for is drawn, and announced, differently from what the device has confirmed.
`resolveControlState` derives that from a device status and a command status so controls on one
screen cannot disagree; pending is non-interactive so a second press cannot queue a duplicate, while
stale stays operable because sending a command is how you find out whether a quiet device is there.

Also new: `DeviceIcon` and `DeviceIdentity` (twelve device categories), `DeviceControlCard` and
`DeviceGroupCard` (composition via slots rather than a prop per control), `RoutineCard` for scenes,
routines and schedules, and React-free helpers for control state, device category and automation
timing in `@kinetixui/iot/functions`.

Packaging: importing one component used to cost 45.91 KB of a 46.54 KB library, because
`Component.displayName = "…"` is a top-level assignment a bundler cannot prove is safe to drop.
Moving it into a `/* @__PURE__ */`-annotated call restores per-component tree-shaking — one control
now bundles to 4.03 KB, and `DeviceCard` alone to 10.25 KB against 22.01 KB before this release.

No transport is added. Nothing here opens a connection or speaks MQTT, BLE, Matter or WebSockets.
