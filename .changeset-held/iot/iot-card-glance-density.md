---
"@kinetixui/iot": minor
---

`DeviceCard` and `CameraDeviceCard` take an optional `density="glance"` (default `full`, unchanged). Glance keeps the operational view: the status badge only when the device is not online, a battery only when it is low or critical, and battery, signal and last update behind one "Device details" disclosure. Recording and privacy on a camera stay in view. Nothing is removed. On `CameraDeviceCard`, glance draws a small thumbnail beside the name, privacy, recording and last event instead of the large preview, with any `controls` beneath.
