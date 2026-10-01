---
"@kinetixui/iot": patch
---

`DeviceSetpointControl`'s ring now animates to a new target instead of jumping to it.

The filled arc was drawn as a path of exactly the confirmed length and the marker placed at computed
`cx`/`cy`. Neither is a property a browser can interpolate, so the ring snapped while the numeral beside it
changed in the same frame — measured in Chromium, `transition-duration` was `0s` with nothing running 45ms
after the device confirmed. The arc is now one fixed path revealed by `stroke-dashoffset` (`pathLength="1"`,
so the offset is the fraction itself) and the marker is drawn once and rotated into place, both over
`duration-base` from the existing scale with `motion-reduce:transition-none`. No new token, no new value, and
no change to the component's API or to what it draws at rest.
