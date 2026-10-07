---
"@kinetixui/iot": patch
---

A "requested, not yet confirmed" chip on `DeviceLevelControl`, `DeviceSetpointControl`, `DeviceColorControl`, `DeviceLockControl` and `DeviceMediaControl` no longer pulses while the device is offline or unreachable. A request to a device whose link is gone is not progressing, and the pulse said it was. The chip keeps its dashed outline and words, which is how it already looks under reduced motion. No API change.
