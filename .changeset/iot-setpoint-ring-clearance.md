---
"@kinetixui/iot": patch
---

`DeviceSetpointControl`'s `ring` presentation keeps its ± buttons clear of the gauge. They were pinned to the ring's
bottom corners with fixed insets, directly under the arc's two ends: measured in Chromium, 6.6–16.7px into the end
markers at every width. They now sit in a row pulled into the empty band below the arc's ends by a margin derived from
the arc's own geometry, so the gap holds at any size (19–28px). The ring is a size container: narrower than 12rem
(a phone at 200% text, browser zoom) the decoration steps aside and the numeral and buttons stack, where before the
numeral overflowed the ring and the 88px buttons covered it. The current reading wraps instead of truncating.
Buttons keep their 44px targets, labels and order.

`BatteryIndicator`'s `pill` presentation wraps inside its container instead of overflowing it at 200% text.

Verified by the new `check:iot-state-spatial` browser gate.
