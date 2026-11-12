# Signature footer — design record

Recorded 2026-11-12 from the implemented surface. This record covers the website footer only. It does not
amend `DESIGN.md` (hero and identity authority) or `PRODUCT.md`, and it introduces no token, no colour and
no component into the library. It authorizes no merge and no deployment.

Design direction: **Precision Native**, as recorded in `docs/audits/precision-native/design.md` (PR #557 /
#577). This footer is the ending of that page, built from the same material.

## 1. Baseline

The footer on `main` is a *print surface*. It renders an engraved Arabian landscape — two 5760×1920 WebP
plates, one per theme, with five srcset steps each — over an `accent` panel textured with a 384px
paper-grain tile. Thirteen rasters in `apps/web/public/footer/` serve it.

`DESIGN.md` has excluded that artwork since the Kinetic Weave refresh, twice and explicitly:

> No alternative artwork and no Arabian motifs belong to this refresh. (line 52)
> Don't introduce Arabian motifs, the excluded coloured reference, or replacement mesh artwork. (line 158)

The footer was the last surface on the site still shipping them. Retiring them is therefore not a
side-effect of this redesign; it is the reason the redesign can be a single bounded change.

Three other properties of the baseline were kept because they were right: the `minmax(0, 1fr)` discipline
that stops a column pushing the page sideways, the creator credit's underline (a link inside a text block),
and the rule that only the installation link in this footer carries CTA attribution.

## 2. Three concepts

**A — The Architectural Grid.** An asymmetric editorial composition: a wide closing statement over a
measured register of navigation columns separated by hairlines, closed by a utility strip. Structure comes
from rules and whitespace, never from panels. Reads directly out of the site's existing `.kx-edges`
graph-paper rules and the homepage colophon's bordered `<dl>`.

**B — Kinetic Signature.** A closing composition derived from the Kinetic Weave mark's own geometry, with
interaction-responsive detail and a controlled indigo accent. Strongest on originality. Its risk is
specific and real: anything with ambient motion at the foot of a page that opens with an animated polygon
hero becomes a second hero, and the Precision Native surface deliberately disables entrance animation.

**C — The Editorial Monogram.** Typography-led, built around an oversized wordmark with navigation demoted
to a quiet sidebar. Excellent on a phone. Rejected as the lead because the wordmark already appears in the
header on every route, so a third of the footer's area would be spent repeating it, and the register —
which is the footer's only *useful* content — would be the part that shrank.

## 3. Chosen direction

**A, taking B's geometry and none of B's motion.**

The register is the footer's job and A gives it the most room and the clearest reading order. B contributes
the decoration: a hairline weave whose two diagonals are measured off the mark (the cross stroke's 45.5deg,
the leg's -38deg) and a seam carrying the lockup's proportions as two ticks. Neither animates. C contributes
the statement's scale and the discipline of one closing sentence.

The one motion in this footer is the navigation underline, which is a state, not an entrance.

## 4. Brand

Nothing protected is touched. The diff contains no change to `brand-mark.tsx`, `hero-mesh.json`,
`hero-mesh-source.json`, `hero-polygon.tsx`, `brand-hero.css`, `design-assets/identity/**` or `tokens/**`,
and no literal hex colour anywhere. `#6054F4` continues to reach the page only through the mark's own
gradients and the `--primary` / `--brand` tokens.

## 5. Layout

Three layers inside the existing `max-w-screen-2xl` container and its 16 / 24 / 32px gutters.

| Layer | Composition |
| --- | --- |
| Closing statement | One sentence at display scale, with a single factual note beside it. Two columns at `lg` (`1.2fr / 0.8fr`), bottom-aligned so the two share a baseline band. |
| Register | Four groups — Docs, Platforms, Explore, Project — `repeat(auto-fit, minmax(9rem, 1fr))`, becoming a fixed four-column row above `64rem` with `border-inline-start` rules between columns. |
| Utility strip | Lockup · copyright, derived version and licence, creator credit · back to top. |

**The 9rem rule.** The register's track is a text measure, not a pixel count — see §11.

## 6. Typography

Nothing new. The statement uses the existing self-hosted display family at
`clamp(1.75rem, 1rem + 2.6vw, 3.25rem)`, `1.06` line height, `-0.03em` tracking, `text-wrap: balance` and a
`26ch` measure so the line does not run on at 1920. Group titles are the existing mono family at `text-xs`,
uppercase, `0.14em` tracking — the same metadata role the homepage colophon's `<dt>` uses. Links are body
sans at `text-sm`. The derived version and licence are mono, because they are machine facts.

## 7. Motion

| Trigger | Property | Duration / easing | Reduced motion |
| --- | --- | --- | --- |
| hover or focus-visible on a register link | `transform: scaleX()` on a 1px pseudo-element | `--duration-fast` / `--easing-enter` | the line still appears, instantly |
| activating Back to top | the document's own scroll | `globals.css` `scroll-behavior: smooth` | `scroll-behavior: auto`, already in `globals.css` |

There is no entrance animation and no ambient animation. The decoration never moves. Under reduced motion
the underline arrives at `0.01ms` — the `@kinetixui/ui` preset's base-layer contract, not a rule written
here — so the state is reached, not the travel.

## 8. Responsive

Measured at 320, 375, 390, 768, 1024, 1440 and 1920, in both directions, at 100% and 200% text, on three
routes: 84 cases, all with zero overflow. See `evidence/`.

## 9. Light and dark

Both themes are the same composition in the same semantic tokens, not an inversion. The plate is
`--muted` at `.35` over `--background` — the Precision Native playground canvas value — so the footer reads
as a closing surface rather than a tinted panel. Rules are `--border`; the statement and lockup are
`--foreground`; supporting copy is `--muted-foreground`; links are `--foreground` at 75% rising to 100%;
the seam ticks and the underline are `--primary`.

## 10. RTL

The weave and the seam are mirrored with `scaleX(-1)` so the dense corner and the ticks stay at the reading
start. The underline's `transform-origin` flips to `right`. The column rules are `border-inline-start` and
the register's padding is logical throughout. Verified in the browser at all seven widths.

## 11. The defect this redesign found and fixed

The register was first written as `grid-cols-2 sm:grid-cols-4`. At 320px with the reader's text at 200%,
each column is 144px and "Changelog" set at a 32px root is exactly 144px of unbreakable word, so the column
— and the document — ran 8px past the viewport. Measured on `/`, `/blocks` and `/docs/rtl`: all reported
`documentElement.scrollWidth` 328 against a 320 client width with five escaping elements inside the footer.

No test in the repository could have caught it. `scripts/large-text.mjs` is the 200%-text gate but drives
Storybook, which has no site footer; `scripts/a11y-site.mjs` sweeps the site but at the default text size;
jsdom performs no layout at all.

The fix is a text measure rather than a breakpoint, the same shape as Precision Native's `64rem` rule:
`repeat(auto-fit, minmax(9rem, 1fr))`. 9rem is 144px at a 16px root, so 320px still gets two columns; at a
32px root it is 288px, so the register collapses to one and the longest word always has its own line.

`scripts/footer-browser.mjs` is the gate, wired into `a11y-site.yml`.
`scripts/footer-negative-controls.mjs` is its control: nine conditions restored at runtime, the first of
them the pre-fix two-column register, which reproduces the original measurement exactly — 8px of overflow
and five escaping elements. A second control holds that same two-column register at 320px and 100% text and
requires it to stay clean, which is what attributes the failure to the column rule rather than to the width.

## 12. Do's and don'ts

- Keep every figure derived. The platform count comes from `platform-parity.json`; the version and licence
  come from `@kinetixui/ui`'s own `package.json`.
- Keep every href a route that exists. The test walks `apps/web/src/app` rather than trusting the list.
- Do not add a React entry to Platforms. `/docs/installation` is the React path and there is no React page
  to link to; a label would have to invent one.
- Do not turn the group titles into headings. Four `h2`s enter the outline of all 740 views; `h3` is an axe
  `heading-order` violation on any page whose deepest heading is `h1`. The names are carried by
  `aria-labelledby` on each list, and the gate asserts the footer contributes no heading at all.
- Do not restore a raster to this footer. The decoration is drawn; the gate asserts zero `<img>` and zero
  `url()` background in the footer subtree.
- Do not give the footer ambient motion. It is the end of the page, not a second hero.
