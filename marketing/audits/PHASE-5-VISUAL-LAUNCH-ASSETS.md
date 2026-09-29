# Phase 5 — Visual proof and launch assets

**Date:** 2026-09-29 · **Base:** `4e37559` (Phase 4 content engine)

**Nothing was published, deployed or launched.** No repository setting was changed. This phase produced
assets and the machinery that keeps them true.

## Asset inventory — before

| Asset | State |
| --- | --- |
| `.github/assets/home.png` | **STALE** — the pre-Phase-2 homepage, with the retired "One token architecture" hero. Consumer: the README's first image, and nothing else (checked, not assumed) |
| GitHub social preview | **MISSING** |
| Phase 4 visual briefs VIS-001 … VIS-007 | **BRIEFS ONLY** |
| `drafts/a01/visual-brief.md`, `drafts/a02/visual-brief.md` | Briefs, unbuilt |
| Everything else | None. There was no visual system |

## Approach: generated, not designed

Every asset is **SVG emitted by a script from repository truth** — `components.manifest.json`,
`platform-parity.json`, `block-parity.json` and the real token output — then rasterised to PNG.

The reason is not convenience. Every number in these assets is volatile: coverage, the catalogue count, which
platforms are published. An image with a baked number is a claim nobody can re-check and nothing will ever
correct — six months on it is a confidently wrong PNG on someone's timeline. Generation makes that structurally
impossible, and the brand comes from the same tokens the product ships.

This is not a graphics pipeline. It is string templates in one file, and if it ever wants to be more, the
answer is fewer assets rather than more machinery.

```bash
pnpm gen:visuals      # SVG from the manifests and tokens
pnpm render:visuals   # PNG + the geometry check below
```

## Assets produced — 9

All in `marketing/content/visuals/`, SVG + PNG, indexed with alt text in `manifest.json`.

| ID | Brief | Type | Serves | Claims |
| --- | --- | --- | --- | --- |
| **VIS-001** | VIS-001 | Uncontrolled drift | LI-003, X-005 | A1, A2 |
| **VIS-002** | VIS-002 | Manifest → every surface | LI-004, X-003 | B1 |
| **VIS-003** | VIS-003 | Token architecture (generated) | ART-002, LI-005, X-004 | A1, A2 |
| **VIS-005** | VIS-005 | Two trades | LI-007, X-008 | A2, A3 |
| **VIS-006** | VIS-006 | Coverage, derived | LI-008, X-007, X-011, LI-010 | B2, B3, B4, C1–C3 |
| **VIS-007** | VIS-007 | Adoption ladder | LI-009, X-010 | D2, D3 |
| **VIS-008** | new (§7) | Component architecture — companion to VIS-003 | LI-007, X-008 | A2, A3, B2, B4 |
| **VIS-009** | new (§8) | Verification pipeline | LI-004, X-003, X-009, ART-001 | B1, E6 |
| **SOCIAL-PREVIEW** | §14 | GitHub social preview, 1280×640 | GitHub | B2, B4, C1–C3 |

**VIS-001 is labelled a constructed illustration** in its own metadata. It shows values drifting on three
platforms; it is not a screenshot of a real broken app and must never be presented as one.

**VIS-003 and VIS-008 are a deliberate pair.** One says tokens are *generated*; the other says components are
*written*, with dashed arrows captioned "implements, not compiles into". Publishing either alone is how the
distinction blurs.

## Assets refreshed — 1

**`.github/assets/home.png`** — captured from the real production build at 1440×900, deviceScaleFactor 2,
after a 1.2s settle so the hero animation is not caught mid-transition. It shows the Phase 2 hero, the drift
paragraph, the corrected spec panel (97 components + 1 documented recipe, no runtime-deps row) and the new
CTAs. The README's alt text described the *retired* headline and was corrected with it.

## Assets deferred — 1

**VIS-004** (the dependency-list before/after). It needs a real code excerpt laid out as a comparison, which
the current generator does not do well, and LI-006 / X-006 read fine without it. Deferring beat shipping a
weak diagram or hand-making one that would drift.

## The render check, and what it caught

`render:visuals` fails on three things. It caught all three **in my own assets**:

1. **Type too small for a feed** — a 1200px card displays at ~390px, dividing every size by three. First pass
   used 15–18px for secondary labels: **8 of 9 assets failed**. Fixed by clamping the floor at 20px in the
   generator, so a new asset cannot reintroduce it.
2. **Text outside the canvas** — measured from rendered geometry, not markup. **Three headlines overflowed**
   while the font-size check passed them, because they were large, which was the problem. Headline size is
   now derived from the string length.
3. **Text colliding on a shared baseline** — the coverage table had `98/98` touching `stable` in five rows,
   and its last column ran off the edge.

The lesson worth keeping: **a number can be large and still be absent.** The first version of this check
measured the markup and passed a broken asset; it now measures what the browser drew.

## Day 1–7 visual coverage — COMPLETE

| Day | Asset | Visual | State |
| --- | --- | --- | --- |
| 1 | LI-003 | VIS-001 | **READY** |
| 2 | X-005 | VIS-001 (shared) | **READY** |
| 4 | LI-004 | VIS-002, VIS-009 | **READY** |
| 6 | X-003 | VIS-002 (shared) | **READY** |

No silent gaps. Week 2 is also covered: VIS-003 (day 8–11), VIS-005 and VIS-008 (day 13).

## Social card templates — 5

Layouts in the generator, not a design file, so a new card is a few lines rather than a new artboard:
**A** engineering idea · **B** architecture · **C** product proof · **D** adoption · **E** preview.

Shared: the 6px primary rule, the 64px gutter, the footer, the dark surface, the type scale. One family,
not five copies. Documented in `marketing/content/visuals/README.md`.

## Default theme — dark

One reason, and it is not taste: these are architecture diagrams and code, and a dark card is visually
distinct in a feed of light corporate posts. The exception is the homepage screenshot, which shows the
product's own default, because that is what it is a picture of. **No light/dark duplicates were produced.**

## Motion plan — 3 shot lists, 0 produced

`marketing/content/motion-briefs.md`. **MOT-001** platform switching on the flagship (18–22s), **MOT-002** a
token change moving four platforms in one commit (20–25s), **MOT-003** a check failing then passing (15–20s).
All silent with burned-in captions; all serve named Phase 4 assets.

Not produced because screen recording needs a real session with a human deciding what looks right, and adding
video tooling for three clips would be the pipeline the brief warns against.

**An install walkthrough was deliberately excluded** — the obvious candidate, and the strongest possible form
of the activation claim that is still **PENDING LIVE VERIFICATION**.

## Launch kit

| Piece | File | State |
| --- | --- | --- |
| Social preview | `visuals/SOCIAL-PREVIEW.{svg,png}` | Ready — **upload is manual** |
| Homepage screenshot | `.github/assets/home.png` | **Ready, in place** |
| Architecture | `visuals/VIS-003`, `VIS-008` | Ready |
| Verification | `visuals/VIS-009`, `VIS-002` | Ready |
| Product proof | `visuals/VIS-006` | Ready |
| Adoption | `visuals/VIS-007` | Ready |
| Index | `visuals/manifest.json` | Ready |

## Claim verification

`pnpm marketing:stats` was run and every asset number reconciled against it: React 98/98, Angular 31/98
preview, SwiftUI / Compose / Flutter 90/98 source-only, 97 components + 1 documented recipe, 20 blocks.
**The SVG text was swept** for *production ready*, *write once*, *run everywhere*, *identical everywhere*,
*wearable*, *generated components* and *one command* — **all clean**. No activation language anywhere.

VIS-006 exists specifically to keep implementation, maturity and distribution as three visible facts — a row
of platform logos would imply they are one.

## Validation

| Check | Result |
| --- | --- |
| `pnpm render:visuals` | **PASS — 9/9**, min font 20px (~6.5px at feed size), no overflow, no collisions |
| `pnpm check:content` | PASS — 27 assets, 23 linkable attributed |
| `lint` · `typecheck` | PASS |
| `pnpm test` · `test:release` | PASS |
| Visual inspection | VIS-006 and `home.png` reviewed as rendered images, not trusted from a passing check |
| Alt text | 9/9 assets, all substantive |

## Manual actions

1. **Upload `SOCIAL-PREVIEW.png` as the GitHub social preview** (Settings → General → Social preview) and set
   the repository description and topics. Repository settings; not changed from here.
2. **Aesthetic approval** on the nine assets before Day 1.
3. **Record MOT-001 … MOT-003** if motion is wanted in month one — optional, nothing depends on it.
4. Re-run `pnpm gen:visuals && pnpm render:visuals` after any manifest change, so the numbers stay current.

## Risks

- **The generator is mine, not a designer's.** These are clear and on-brand; they are not art-directed. A
  designer's pass would improve them and is not required to start.
- **PNG in git.** Nine images, regenerable. If it becomes noisy, generate PNG in CI and commit only SVG.
- **VIS-001 could be misread** as a real screenshot. Labelled in metadata; if it is ever posted, the caption
  should say so too.
- **The homepage screenshot ages with the homepage.** It is one command, but nothing automatically notices.
