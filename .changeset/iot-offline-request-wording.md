---
"@kinetixui/iot": patch
---

Say what an open request means once the device's link is gone, and stop calling a timeout a failure.

- **`describeControlState(availability, "requested")`** now names the link first when the device is `offline` or `unreachable` ("Device offline. The requested change is not confirmed. Showing the last known setting") instead of "Change requested, not yet confirmed by the device", which promised progress the request was not making and never said the device was gone. `connecting` says "Connecting to the device. The requested change is not yet confirmed…", and `stale` adds "Device data is out of date". Online, acknowledged and unknown-link requests are unchanged. No availability or phase was added, and `resolveControlState`'s availability, phase and `interactive` are unchanged.
- **The `failed` phase** reads "The last change was not confirmed. Showing the setting the device reports" (was "The last change failed…"): that phase also covers a timeout and an unreachable device, and neither proves the device refused.
- **`describeControlOutcome` for `timed-out`** reads "No confirmation for on: the device did not confirm in time, so the change may still apply. It last reported off." (was "Could not turn on: the device did not answer…"), matching `CommandFeedback`'s "Timed out, may still apply". `failedPhrase` is no longer used for a timeout. Every control's outcome note and announcement follow.
- **`summarizeDeviceState`** says "1 command not confirmed" instead of "1 command in progress" when the device is `offline` or `unreachable`.
- The README's links to the device contract are absolute, so they work on npmjs.com and in `node_modules`.

Migration: code that matched these sentences should match the new wording, or read `availability`, `phase` and `outcome` instead.
