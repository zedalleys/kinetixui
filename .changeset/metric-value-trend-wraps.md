---
"@kinetixui/ui": minor
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

**Why this is a minor and not a patch.** `sm-rem` (40rem), `md-rem` (48rem), `lg-rem` (64rem) and
`xl-rem` (80rem) now live in `packages/ui/tailwind.config.ts`, which this package publishes and
exports as `./tailwind.config`. Four new variant names a consumer can author against is **additive
public API on a published artifact**, not an internal correction, so it takes a minor even though
nothing existing changes meaning. `md-rem` is new in this change; the other three previously
existed only in the website's own config, so any consumer of the preset — the repository's own
Storybook included — generated **no rule at all** for a `sm-rem:` utility.

Nothing is removed or renamed, and no existing utility changes which widths it applies at: `md-rem`
is `48rem`, which is Tailwind's `md` for a reader who has not changed their text size.

They are registered as **variants**, not as `theme.screens`, and that distinction is the whole
point. Tailwind 3.4 emits no rule for **any** `min-*` or `max-*` variant once the screen map mixes
units, silently: no warning, no error, the class is simply absent. Four `rem` entries beside
Tailwind's `px` defaults are exactly that mixture. Measured on one stub carrying `max-md:hidden`,
`min-[420px]:grid-cols-2`, `md:flex` and `sm-rem:grid-cols-2`:

- as `theme.extend.screens` — `max-md:hidden` **0 rules**, `min-[420px]:grid-cols-2` **0 rules**
  (`md:flex` survives; plain responsive variants are unaffected)
- as variants — all four emitted

This had already cost something before the preset carried the breakpoints: the website's own config
had them, and `min-[420px]:grid-cols-2` on the blocks gallery emitted **no `min-width: 420px` rule
in the built site**, so that grid never took its two-column step. It does now. `check:breakpoints`
is a new CI gate that compiles both halves against the published preset and carries its own
negative control.
