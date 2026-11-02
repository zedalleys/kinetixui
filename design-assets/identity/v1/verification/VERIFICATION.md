# Kinetic Weave verification — 2 November 2026

## Finalization pass — exact head `aec1a655e10c01810d7f8a18d607200db4b6854f`

Everything in this section was executed against this commit. The sections below
it describe earlier revisions and are kept as history; where a figure here
disagrees with one of them, this one is the measurement.

**Dark-theme AA repair.** `check:a11y-browser` failed at `3cd10512` with 27 new
dark colour-contrast violations. Reproduced in Chromium with node-level detail:
all 27 reduce to two foregrounds — `#dd6969` (`destructive`) at 4.33:1 on `card`,
4.42:1 on the list surface and 3.87:1 on its own 10% tint, and `#a689fa`
(`primary`/`action`) at 4.43:1 on `bg-primary/10` over `card`, 3.72:1 on the same
tint over `muted` and 4.31:1 on `accent`. Cause: the Kinetic Weave dark surfaces
rose to `navy.800`/`navy.700` while both foregrounds kept steps sized for the old
near-black page. Repaired in `tokens/semantic/color.dark.json` and
`tokens/semantic/shadow.dark.json`; the generator chain (`build:tokens`,
`vendor:compose`, `vendor:swiftui`, `vendor:flutter`) was run to a fixed point.
No baseline entry, accessibility exception or threshold was changed.

**Focus indicator.** Measured differentially — render the polygon unfocused and
focused, take the pixels that changed as the indicator, compare each against its
nearest unchanged neighbour. Before: 34% (light) and 14% (dark) of the indicator
reached 3:1. After thickening the cage on focus: 54% and 45%, top decile 5.8:1
and 9.1:1, best 7.2:1 and 9.8:1. No rectangular outline or box-shadow returns;
`check:hero-beacon` asserts both and holds the 3:1 share at a 25% floor.

**Loop duration, timed rather than quoted.** The traveling light's lap measures
**16.7–16.8 s** in the browser across runs, and the floating rotation advances at
12 deg/s, a 30-second revolution. The "24-second / 14-second" figures in the
sections below predate the cage-tracing beacon and were wrong for this head.

**Negative control.** With one circuit vertex moved off the cage in the served
bundle (`635.06,257.55` → `560,180`), `check:hero-beacon` exits 1 with "the
beacon never pulsed at the supplied junction node 635.06,257.55". Restoring the
bundle returns it to green. Nothing sabotaged was committed.

**Gate wiring.** `scripts/rebrand-browser.mjs` was referenced from no package
script and no workflow, so the "seven hero browser cases" were never a gate.
Both it and the new `scripts/hero-beacon-browser.mjs` now run in
`.github/workflows/a11y-site.yml` against the production build.

### Executed at this head

| Check | Result |
| --- | --- |
| `check:a11y-browser` (Storybook, every story, light + dark) | ok — 276 stories × 2 themes, 4 known violations, **none new** |
| `check:a11y-site` (the site's own pages) | ok — 36 pages × 2 themes × 5 widths × 2 text sizes = **720 views**: no axe findings, no horizontal overflow, docs reading column never narrower than the rails beside it |
| `check:rebrand-hero` (7 viewports) | ok — 0 axe violations, 0 page errors |
| `check:hero-beacon` | ok — 6 junction nodes pulsed, 0 units off any cage leg, lap 16.8 s, halo 6→17, drag/offscreen/reduced-motion as approved |
| `check:contrast` | PASS |
| `check:token-contract` | ok — 26 rows match the tokens |
| `check:component-colors` | ok — 556 sources, 19 reviewed exceptions (unchanged) |
| `check:verification` | ok — evidence for 109 components, no counter changed |
| `check:home-systems` | ok |
| `typecheck`, `lint`, `check:rtl`, `check:typography`, `check:releases`, `check:a11y-coverage`, `check:label-association`, `check:role-coherence`, `check:motion-tokens`, `check:web-dogfooding`, `check:stories` | all PASS |
| Unit tests | web 2576, React 649, theme engine 668 — all passing |
| Production website build | PASS |
| Generated-output guard (CI `build` step 64) | failed at `11a3a9a9` on a stale `apps/web/public/r/tokens.json`; fixed in `619a3a7b`, which also re-ran `check:contrast`, `check:token-contract`, `check:registry-deps` and `check:registry-motion` green. The full generator chain now runs from a clean `HEAD` to a fixed point. |

### Screenshots at this head

`exact-head/` holds ten captures from the actual production render at
1440 light, 1440 dark, 1920, 768, 390, 320, 390 dark, 200% text at 1280,
reduced motion, and the polygon with keyboard focus visible. Every one reported
zero page errors and zero horizontal overflow; the only console entry across all
ten was one 403 rate-limit on an external badge request in the dark capture,
which is an artifact of repeated local runs rather than page code.

### Not verified here

The Vercel preview could not be checked from the environment this pass ran in:
the preview host does not resolve and the proxy refuses the tunnel, and the
Vercel API rejects the `zed-alleys` scope. The PR's Vercel comment reports the
deployment Ready and updated 2026-11-02T12:05:40Z, but **which commit it serves,
its console and its rendered behaviour are unverified**. Every screenshot and
browser measurement above is from a local production build of this branch, which
is branch behaviour, not preview behaviour.


Implementation revision: `7fba3a8af4560b30364efad942cdd8f1f46952ef`.
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

## Polygon face-color enhancement

The reference's cyan/teal depth is applied to the polygon itself. Four coordinated
materials replace the uniformly pale gradient: luminous cyan upper planes,
translucent glass at the center, deeper teal shadow planes and indigo-tinted
return edges. All nine original facets and the main-brand wireframe retain their
coordinates. The visible background circle, autoplay, drag rotation and reduced-
motion behavior stay intact. Production desktop/mobile/dark screenshots below
are refreshed; the production build, changed-component lint and seven browser
cases pass. The existing homepage guards cover copy contrast and circle visibility.

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

## 2026-11-02 — the large mesh, the hero's share, and the dark hierarchy

Everything in this section was executed on the branch tree described by the PR
body's final SHA, against a production `next build` served on `127.0.0.1:3000`.
It is not carried over from an earlier revision.

| Check | Command | Result |
| --- | --- | --- |
| Semantic contrast | `check:contrast` | PASS. Text pairs meet AA, non-text cue pairs meet SC 1.4.11; the five `KNOWN_SUB3` entries are unchanged registrations, not new ones. |
| Token contract | `check:token-contract` | PASS, 26 rows match the tokens. |
| Composite-field visual contract | `check:composite-visual` | PASS, React and Angular, light and dark, on rendered pixels. The React dark MultiSelect placeholder now measures **9.38:1 against a 9.90:1 selected value** — the relation the gate asserts. It previously read 13.37:1 against 9.90:1 and failed. |
| Storybook axe | `check:a11y-browser` | PASS. 276 stories × 2 themes, 4 known violations, **none new**. The IoT dark-theme contrast findings from job 125265124733 do not reproduce. |
| Site sweep | `check:a11y-site` | PASS. 36 pages × 2 themes × 5 widths × 2 text sizes = **720 views**: no axe findings, no horizontal overflow. |
| Hero structure and interaction | `scripts/rebrand-browser.mjs` | PASS across 7 viewport/theme cases: 44 facets, 44 link outlines, 26 junctions, 3 light routes, rendered unaltered. |
| Hero light and focus indicator | `check:hero-light` | PASS. A light's measured lap is **8.7s against the 9.4s `hero-mesh.json` declares**. The focus indicator reaches 3:1 against what it borders over **47% of its own area in light and 53% in dark**, measured differentially. |
| Homepage systems | `check:home-systems` | PASS, including the hero lede's rendered contrast at 768, 1024 and 1440. |
| Homepage negative controls | `scripts/home-systems-negative-controls.mjs` | Both numeric bounds provably fail: skipping the text hide reads 1.00:1 against the 4.5:1 assertion; the aura at `opacity .45` reads 34 under the 55 floor; a flat saturated disc reads 215 over the 110 ceiling. Recorded near-miss: `blur(6px)` reads 75, the same as shipped, and does **not** exercise the ceiling. |
| Typecheck / lint | `typecheck`, `lint` | PASS. |
| Website suite | `--filter @kinetixui/web test` | PASS, 124 files, 2,576 tests. |

### The hero's share of its section

Measured as the mesh's box over the hero section's box, on the running build:

| Width | Share |
| --- | --- |
| 1024 | 41.9% |
| 1280 | 52.2% |
| 1440 | 62.6% |
| 1600 | 62.3% |
| 1920 | 61.4% |
| 2560 | 60.2% |

The 55–65% target holds from 1440 up. Below it the share falls deliberately, so
the copy column keeps the room it needs. No facet, link or junction box overlaps
the headline, lede, platform line, CTAs or install link at any of those widths.

### Captures

`captures/` holds thirteen screenshots of the real running site at this head —
1920, 1440, 768, 390 and 320, light and dark, 200% text, the reduced-motion rest
pose, and the hero with keyboard focus actually on it — with `captures.json`
recording each one's measured mesh share, pulse state and console errors. They
are screenshots, not generated artwork.

Two observations recorded rather than fixed: the page makes an unauthenticated
client-side call to `api.github.com/repos/zedalleys/kinetixui`, which returns
403 (rate limit) from this container's shared egress address. That is an
environment artifact, not a site defect, but the call itself is out of this
PR's scope and is noted for separate triage.

## Merge / release limits

The PR remains draft. GitHub CI on the final branch head and owner visual review
are required before merging. This evidence does not claim that a production
site or package has been published. Existing release versions and platform
support/distribution claims are unchanged. Connected Figma libraries and already
published external marketing material were not updated. No separate exhaustive
color-vision simulation or native screenshot comparison is claimed.
