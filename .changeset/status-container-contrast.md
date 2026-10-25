---
"@kinetixui/tokens": minor
"@kinetixui/ui": minor
---

Status notices no longer fail AA when they sit on a muted surface.

`Banner`, `Inform` and `ResultState` drew their success, warning and error text in the status colour
itself, on that colour's own tint (`bg-success/15`, `bg-warning/15`, `bg-destructive/10`). Measured with
`check:contrast`'s own arithmetic, a notice inside a muted panel — the tightest surface these ship on —
was **4.20:1 for success in light**, **4.4982:1 for success in dark** and **4.28:1 for error in dark**.
All three are below WCAG AA for body text. `information` was already correct, because it was given a
dedicated `--on-info-container` role for exactly this reason; the other three were simply never measured
there, and `check:contrast` gated the info pair on a muted surface while gating none of the other three.

**New roles**, theme-aware in light and dark, tuned against `--muted` as the worst case:
`--on-success-container`, `--on-warning-container`, `--on-destructive-container`. Web exposes them as
`text-success-on-container`, `text-warning-on-container` and `text-destructive-on-container`; SwiftUI,
Compose and Flutter as `onSuccessContainer`, `onWarningContainer` and `onDestructiveContainer`. Light
success and dark success/error move one step along their ramp (6.26:1, 6.03:1 and 6.38:1 at the same worst
case); warning in both modes and error in light keep the value they had, which already cleared AA, and now
have a role of their own so a theme that moves `--warning` cannot silently take the notice text with it.

Nothing else changes: the tints, borders, icons, layout and API are untouched, and the three components'
`information` and `action` variants are byte-identical. A colour set built before these roles existed
falls back to the plain status role on every native platform, which is what those views drew before.

`check:contrast` now measures all four statuses on both the page and a muted surface, so the asymmetry
that hid these cannot return. Because that gate reads token pairs and cannot see which utility a
component writes, `semantic-consumption.test.ts` asserts the consumer side per status per platform.

The Figma `color.semantic.*-container` tokens were measured as an alternative and rejected: they exist
only in `color.light.json`, so in dark mode they land at 1.51–4.13:1.
