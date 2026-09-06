---
"@kinetixui/cli": patch
"@kinetixui/tokens": patch
"@kinetixui/ui": patch
---

**Chart text alternative.** `ChartContainer` now renders `role="img"` with an
`aria-label` — pass `label` with a one-line summary of what the chart shows
(WCAG 1.1.1); it falls back to `"Chart"`. Cartesian recipes already pass
`accessibilityLayer` for keyboard data-point navigation.
