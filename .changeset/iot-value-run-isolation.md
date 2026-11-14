---
"@kinetixui/iot": patch
---

A measurement and its unit are one left-to-right run in seven more IoT components, so an RTL page no longer draws the unit before the number.

A value and its unit are two bidi runs: the digits are `EN`, and `"°C"`, `"kWh"` and `"L/min"` carry neutral and strong-LTR characters. Without isolation the paragraph direction pulls them apart and the unit lands on the wrong side of the number it belongs to. Measured in Chromium across every `iot-*` Storybook story under `dir="rtl"`: **124 value runs in 32 of 98 stories** rendered `"18 °C"` as `"°C 18"`. After this change, none do.

`TelemetryMetric` and `DeviceBattery` already wrapped their readouts in `<bdi dir="ltr">` with a comment explaining exactly this. These seven did not: `SensorReading` (and so `TelemetryCard` and `DeviceCard`, which compose it), `TelemetryTrend` (the Min/Average/Max row, the range line, "Latest", the threshold legend and the data table), `EnergySummary` (the "Now"/"Today" figures, the sparkline's latest value, the baseline legend, the breakdown line and the daily data table), `DeviceListItem`'s key reading, `DeviceControlCard`'s value, and `DeviceLevelControl`'s and `DeviceSetpointControl`'s numerals.

The string forms are deliberately not isolated. `TelemetryTrend`'s `print` and `EnergySummary`'s `fmt` still return plain text, because the accessible sentences they feed are read aloud rather than laid out.

A count followed by a translated noun — `HealthBar`'s "22 healthy", an alert summary's "1 Critical" — is **not** a value run and is deliberately left alone: pinning it LTR would hold a translated word in Latin reading order.

**No API change, and no visual change in an LTR page:** `<bdi>` is `display: inline` with `unicode-bidi: isolate`, and the measured gap between the digits and the unit is unchanged. What a consumer may notice: a test asserting the exact child structure of a value slot now sees a `<bdi dir="ltr">` wrapper. Text content is unchanged.
