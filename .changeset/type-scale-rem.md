---
"@kinetixui/tokens": minor
"@kinetixui/ui": minor
---

Make the type scale follow the reader's text size, on every platform.

A font size in `px` does not respond when someone raises their browser's default text size, so the
KinetixUI type scale could not be made bigger. Measured across all 206 Storybook stories before this
change: **1,357 rendered elements** carrying a type-scale class, across 115 stories and 13 of the 16
steps, every one of them unchanged at 200% text. Components that mixed `text-body-md` with Tailwind's
own `text-sm` showed the inconsistency directly — one half of a page doubled and the other did not.

**The canonical tokens were never wrong.** `tokens/primitives/typography.json` stores plain unit-less
numbers, which is the right thing for a source that feeds five platforms. `px` was added by a transform
that appended it to every `$type: dimension` token, so a font size was treated exactly like a border
width. The split now happens at the transform instead, and each platform says what scalable means in
its own terms:

- **Web** — `fontSize.*` and `lineHeight.*` are emitted in `rem`; every other dimension stays `px`.
  `--font-size-body-md: 14px` → `0.875rem`, `--text-body-md: 400 14px/20px …` → `400 0.875rem/1.25rem …`.
- **Android resources** — the type scale moves from `dp` to `sp`. `dp` ignores the font-size setting in
  Android's display options, which is the same defect in Android's spelling. Spacing and radii stay `dp`.
- **SwiftUI** — `Font.custom(_:size:)` → `Font.custom(_:size:relativeTo:)`. The two-argument form is a
  fixed size that opts out of Dynamic Type entirely; the three-argument form keeps the designed size at
  the default setting and scales from there. The text style per step is chosen by nearest default point
  size, so it is derived from the scale rather than hand-assigned.
- **Compose and Flutter** were already correct (`.sp`, and `TextStyle` under `TextScaler`) and their
  generated output is byte-identical after this change.

**Default appearance is unchanged.** Every conversion is exact, because the scale is all sixteenths:
14 → `0.875rem`, 11 → `0.6875rem`, 57 → `3.5625rem`. At the default 16px root every step computes to
the pixel size it always did, and measured rendered dimensions are identical — delta 0.0px across the
representative components. Letter-spacing deliberately stays in `px`: it is an optical constant rather
than a size the reader asked to change, the primitive tokens are shared across steps so there is no one
font size to make it relative to, and at 0.1–0.5px scaling it would not be legible.

**Why minor, and what is observable.** No token is renamed or removed and nothing rendered moves at the
default setting, but the *value representation* changes and that is visible to anyone reading tokens
directly: `tokens.fontSize["body-md"]` is now `"0.875rem"` rather than `"14px"`, so code that does
`parseInt(...)` on it gets `0.875`. The same applies to `--font-size-*` / `--line-height-*` in
`globals.css` and to the `dp` → `sp` change in the Android resource table. `@kinetixui/tokens` is Beta
and documents that pre-1.0 it carries no compatibility guarantee, and in `0.y.z` semver a change of this
kind is expressed as a minor — the same call the reduced-motion base layer took for the same reason.
If you consume the token values as strings, check any arithmetic you do on them.

`Select`'s value also now wraps instead of being clamped to one line. `line-clamp-1` was invisible while
the text could not grow; once it could, the span needed 80px and was given 40, with a computed
`text-overflow` of `clip` rather than `ellipsis` — so "Select a fruit" rendered as "Select a" with
nothing to say the rest existed. The trigger's `min-h` was always meant to absorb this.
