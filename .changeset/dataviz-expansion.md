---
"@kinetixui/cli": patch
"@kinetixui/tokens": patch
"@kinetixui/ui": patch
---

**`--chart-6`, `--chart-7`, `--chart-8`** added to the token contract (light +
dark, plus the `chart.6/7/8` Tailwind colours) so stacked / categorical charts
with more than five series stay distinguishable.

**`ChartContainer`** gains `state` (`"loading" | "empty" | "error"` — renders a
shimmer / message / alert placeholder), `stateMessage`, and `srTable` (a
visually-hidden `<table>` of the underlying numbers for screen readers).
