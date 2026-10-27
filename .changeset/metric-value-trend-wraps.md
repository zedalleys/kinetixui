---
"@kinetixui/ui": patch
---

`Metric`'s value and trend now wrap instead of colliding, and the shared Tailwind preset carries the
`-rem` breakpoints.

**The defect.** `Metric` laid its value and trend out as `flex items-end justify-between gap-2` with
two intrinsically-sized children. `justify-between` with two such children has no give: once the
value and the trend together need more than the card's content box, flex has nothing left to take
and the pair is painted outside it. Measured in a browser at 1280px, in both directions, on the
Error-rate card of the Theme Creator's dashboard preview: `scrollWidth` 129 against `clientWidth`
115 — the pair **14.1px past its own box**, with the gap pinned at the 8px floor, which is exactly
how close the two read before they met. At 320px with 200% text two cards overlapped and `2,420`
over `1.2%` rendered as the single run `2,42102%`.

**The fix.** The row wraps rather than compresses, and the trend degrades one step at a time:
`whitespace-nowrap` so a figure is never broken mid-number; the row's `flex-wrap`, which places
items by their natural size *before* shrinking any, so a trend too wide to sit beside the value
reaches its own line whole; and `flex-wrap` on the trend itself as the last resort, for the case
where the trend is alone on a line narrower than it still is (a 158px card at 200% text leaves 92px
for a 94px trend) — the figure then goes under the arrow. The trend deliberately carries no
`shrink-0`: that holds it at its natural width and puts the overflow straight back, which was
measured and is the defect this replaces. The gap moves from `gap-2` to `gap-x-3` / `gap-y-1`.

After, across a 6-width × 2-direction × 2-text-size sweep: overflow 0 everywhere, the gap 27.89px on
the card that used to collide, and the **minimum gap anywhere in the sweep 18.09px**.

**No API change.** `MetricProps` is untouched. A `data-kx-metric-pair` attribute is added to the row
as the handle the rendered gate measures it by; it is a marker, never a styling hook.

**One further published change.** `sm-rem`, `lg-rem` and `xl-rem` move into
`packages/ui/tailwind.config.ts`, which this package publishes and exports as
`./tailwind.config`. They previously existed only in the website's own config, so any consumer of
the preset — the repository's own Storybook included — generated **no rule at all** for a
`sm-rem:` utility. The change is additive: three screen names appear in the preset's
`theme.extend.screens`, and nothing is renamed or removed.
