---
"@kinetixui/cli": patch
"@kinetixui/tokens": patch
"@kinetixui/ui": patch
---

`ChartContainer` now scrubs two redundant Recharts a11y artefacts from its
rendered output: the `role="img"` (no `<title>`) that Recharts stamps on every
sector / dot `<path>` — noise, since the container already carries the text
alternative — and the unnamed `<svg role="application">` its
`accessibilityLayer` leaves behind, which now gets the container's label. Clears
axe `svg-img-alt` on chart pages.
