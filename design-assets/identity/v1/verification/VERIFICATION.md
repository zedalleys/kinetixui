# Kinetic Weave verification — 2 November 2026

Implementation revision: `157717b48794a44fd46aae12c0f7040300aefe27`.
Screenshots and browser results below are from its **actual production Next.js
render**, not mockups. The later evidence commit changes only this directory.
No merge, production promotion or package release was performed.

## Autoplay / soft-gradient refinement

The latest owner refinement removes the visible Reset/Pause controls and control
caption. A unified translucent brand gradient softens the facets, and a broader
cyan wash fades behind the artwork. The original facet and cage geometry stays
intact. A 24-second floating rotation and 14-second traveling-light loop autoplay
on each visit; an obsolete stored pause setting cannot suppress playback.

The seven production browser cases verify actual transform changes, infinite
iteration, absence of visible controls, drag / keyboard rotation, Home reset,
Space / Escape motion control, offscreen suspension and live reduced-motion
changes. Desktop, mobile and dark screenshots below were refreshed from the
production build. The latest production build, changed-component lint,
component-use guard and homepage pixel-contrast / aura-strength safeguards pass.
Platform and token suite counts below are retained from the original rebrand
validation; this refinement does not alter their source or token values.

## Visible background-circle correction

The cyan light spot now has a broad, visibly colored center behind the polygon,
a circular silhouette and blurred fading edges. Its size is 82% of the artwork
column with an 18px blur; dark mode has a separate luminous cyan/indigo treatment.
The circle stays confined to the artwork. The pixel comparison now also rejects
a spot that is too faint: a 55–110 channel-difference budget replaces the former
wash-only ceiling. Copy-overlap checks and the 4.5:1 rendered lede contrast floor
are unchanged. Production desktop/mobile/dark captures below are refreshed.

## Hero evidence

- [Desktop, with navigation](desktop.png)
- [Desktop hero](desktop-hero.png)
- [Mobile, with navigation](mobile.png)
- [Mobile hero, including the complete polygon](mobile-hero.png)
- [Mobile polygon detail](mobile-polygon.png)
- [Dark desktop](desktop-dark.png)
- [Dark RTL mobile, reduced motion](mobile-dark-rtl.png)
- [320px](narrow.png)
- [Tablet](tablet.png)
- [320px with 200% text](narrow-text-200.png)
- [Machine-readable browser findings](browser-results.json)
- [Supplied artwork provenance](source-provenance.json)

Seven browser cases pass with zero page errors and zero WCAG A/AA axe findings.
The runner verifies source facet/cage counts, brand wireframe color, actual
pointer drag, keyboard rotation, Home reset, Space/Escape pause, offscreen suspension, live
reduced-motion preference changes, and horizontal reflow at 320px / 200% text.
The original source coordinates are retained; the file's SHA-256 is recorded.

## Local checks

| Check | Result |
| --- | --- |
| Production website build | Pass, 154 static pages |
| Website unit tests | 2,576 pass across 124 files |
| React library build / tests | Pass / 649 tests |
| Theme engine tests | 668 pass |
| Angular build / tests | Pass / 368 tests |
| SwiftUI compile / tests | Pass / 79 tests |
| Flutter analysis / tests | Clean / 172 tests |
| Compose assemble / unit tests / lint | Pass / 101 tests / pass |
| Semantic contrast guard | Pass, including alpha states and native focus shadows; existing tracked non-text cue exceptions remain |
| Token contract | 26 light/dark rows match source |
| Reusable component color guard | 556 source files clean, existing reviewed exceptions retained |
| Forced light preview parity | Pass |
| Existing homepage browser safeguards | Pass: LTR/RTL keyboard tabs, live direction changes, type floor, headline reflow, platform map routing, overlay layout/hit testing, pause/tour, rendered lede contrast and aura strength |
| Site accessibility | Initial 720-view sweep found only linked-code contrast failures on five dark-mode docs pages; after the shared styling fix, all 100 affected-page/theme/width/text combinations pass |
| Lint | No errors; four existing unused-variable warnings |
| Impeccable mechanical detector | No findings on new hero/mark/page/CSS |
| Website component-use guard | Pass, including six negative controls; one bounded spatial-rotation D exception, no new B/C debt |
| Typography / RTL / spatial-grid guards | Pass; the obsolete Open Graph text-size allowance was lowered |
| Additional repository gates | 27 pass; see `repository-checks.json` |
| Patch whitespace | Clean |

All pre-existing primitive color values and semantic token names were compared
with the starting draft and preserved. New defaults select additive brand ramps.
Status semantics remain unchanged. The token-to-platform map was moved below
the polygon; its keyboard and motion checks remain active. The existing homepage
browser test now scrolls that map into view and checks the new aura selector,
while retaining its rendered-pixel contrast and decoration-strength thresholds.

Text-resize verification exposed overflowing platform-tab labels and an
unmeasured SVG overlay's intrinsic width. The labels now wrap, overlays take
100% of their host, and the hero CTAs wrap without clipping at enlarged text.

The full sweep covered 36 pages, two themes, five widths and two text sizes. Its
25 reported view findings were confined to linked inline code on `/docs/platforms`,
`/docs/tokens`, `/docs/accessibility`, `/docs/cli` and `/docs/components/input`.
Dark-mode linked code now uses the parent surface rather than a lighter chip.
The five affected pages were rerun through the entire 100-view matrix with zero
axe findings and no overflow; the other 620 initial views had no findings.
The final all-pages CI run remains a merge gate.

## Merge / release limits

The PR remains draft. GitHub CI on the final branch head and owner visual review
are required before merging. This evidence does not claim that a production
site or package has been published. Existing release versions and platform
support/distribution claims are unchanged. Connected Figma libraries and already
published external marketing material were not updated. No separate exhaustive
color-vision simulation or native screenshot comparison is claimed.
