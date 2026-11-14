# Signature footer — browser evidence

Captured 2026-11-12 in Chromium against the production build (`next build` + `next start`), at
`deviceScaleFactor: 2`. Chromium only: Firefox and WebKit were not run here, so nothing in this folder
is evidence about them. No physical device, no Safari and no hardware screen reader was used.

## What each file is

`footer-gate-results.json` — the output of `pnpm check:footer`, the gate wired into `a11y-site.yml`:
84 geometry cases (320 / 375 / 390 / 768 / 1024 / 1440 / 1920 × LTR / RTL × 100% / 200% text × `/`,
`/blocks`, `/docs/rtl`), every one at zero overflow, plus the decoration, interaction and naming
measurements.

`footer-browser-results.json` — the 24-case visual matrix these screenshots come from, each with the
footer's measured height, the document's horizontal overflow, its link count, its image count and the
weave's computed `display`.

The twelve PNGs are a representative selection of that matrix; the full 24 live outside the repository
with this thread's report.

## How the captures are taken, and what that does not prove

The text scale is applied as an inline root font size, the technique `scripts/large-text.mjs` uses. That
scales every `rem` length in the document but **not** `rem` inside a media query, whose unit stays the
initial font size. A reader who raises the browser's default size scales both, which moves the register
into its stacked form *earlier*. The wide cases here are therefore measured under the stricter of the two
models; the narrow ones under the same model either way.

The viewport is grown to the footer's own height plus a 170px lead and the page scrolled to its end before
each shot. Without that, the site's sticky header paints across the footer's first rows — a capture
artifact rather than a layout one.

Every case is screenshotted with the first register link focused, so the focus indicator is visible in all
of them rather than in a separate case.

## Known, out of scope, not a footer defect

In the RTL captures the full stop of an English sentence appears at the visual start of the line. That is
bidirectional reordering of a Latin run inside an RTL paragraph, it affects every English string on the
site under `dir="rtl"`, and the site ships no translations — `dir="rtl"` here is a layout exercise. Isolating
the footer's strings alone would make this one surface inconsistent with the rest of the site. Recorded,
not fixed.
