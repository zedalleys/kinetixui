---
id: a01
type: visual brief
supports: article.md, linkedin.md, x-thread.md
status: drafted
---

# a01 — visual brief

**One primary asset.** The others are optional derivatives, built only if the
first earns attention. Shipping five at once spreads the effort and none of them
lands.

---

## PRIMARY — "What has to be true before a platform appears on our site"

**The point:** a platform claim passes through four gates before it reaches a
reader, and the last two are machines. One image, one idea.

### Spec

| | |
| --- | --- |
| **Dimensions** | **1200 × 627** (LinkedIn/general landscape). Optional square **1080 × 1080**. |
| **Headline** | *What has to be true before a platform appears on our site* |
| **Orientation** | Horizontal flow, left → right, four gates then an outcome |
| **Legibility floor** | Every label readable at 400px wide |
| **Themes** | Light and dark. Dark is the default for X. |
| **Palette** | The site's own tokens — `--foreground`, `--muted-foreground`, `--border`, `--primary` for the pass state, `--destructive` for the failure callout |

### Content

```
  ①  CLAIM              ②  SOURCE            ③  API              ④  COMPILER
  components            a file exists        every Kinetix*      the platform's
  .manifest.json        in that platform's   symbol is really    own CI builds
  lists the platform    package              exported            the example
       │                     │                    │                   │
       └── check:manifest    └── check:platform-  └── check:platform-  └── native-*.yml
                                 source               code
                                        ↓
                            PUBLISHED COVERAGE
                     /docs/platforms — generated, not typed
```

**Failure callout**, offset below gate ②, in the destructive colour:

> `direction-provider` claimed three platforms here.
> Gate ② found no file. Coverage corrected 91/90/91 → 90/89/90.

### Factual vs conceptual — label honestly

- **Factual:** the four script names, the file names, the before/after numbers,
  "generated, not typed". All verifiable in the repo.
- **Conceptual:** the left-to-right gate metaphor. The checks do not literally
  run in a pipeline in that order — `check:manifest`, `check:platform-source` and
  `check:platform-code` are separate CI steps, and the native workflows run in
  parallel jobs. Do **not** caption it "our pipeline". Caption it *"what has to
  be true"*.

### Mobile / LinkedIn

At 1080 × 1080, stack the four gates vertically and keep the failure callout
attached to gate ②. Do not shrink the gate labels below the headline's size
ratio — on a phone feed the labels are the only thing read.

---

## Optional derivatives

Build only if the primary performs. In priority order.

**B — Before / after coverage table.** Two columns, four changed cells in the
destructive colour, caption *"Corrected, not improved."* Do not style the drop
as bad; that is the point. **Exclude Angular** — it did not exist in the
before-state and including it invites a false comparison.

**C — The three verification levels.** Three stacked bars: spelling → source
exists → it compiles. Annotate Level 0 with *"feels like validation — has a
script, runs in CI, goes green"*.

**D — The Chart snippet.** Code card of the real snippet with two callouts:
`KinetixChart` → *no such symbol*, `CustomPaint` → *this is a Flutter API*.
Referenced by X post 6. Draw the "Android" tab rather than screenshotting it —
the tab no longer exists.

**E — 30-second demo clip.** Terminal only, no voiceover: add a platform to a
component with no source → `pnpm check:platform-source` → it fails by name →
undo → it passes. End card: *"A claim with nothing behind it should fail the
build."* Highest reuse in the set; also serves Product Hunt.

---

## Tooling — why this brief is the deliverable, not a PNG

The repository has exactly one image generator: `apps/web/src/app/opengraph-image.tsx`,
which uses `next/og` (Satori) to render the site's social card **at Next build
time**. No Satori, sharp, puppeteer or canvas dependency exists outside it, and
`.github/assets/` holds one hand-made screenshot.

I tried to reuse it for this asset from a standalone script. `new ImageResponse(...)`
outside a Next runtime hung with no output and produced no file — it wants a
runtime and font loading that only exist inside the framework's build.

The two ways to force it were both out of scope:

- add a public route to the product site so Next renders a marketing image, or
- add a rendering dependency and build a small image pipeline.

So: KinetixUI has an OG-card generator, **not** a marketing-graphics system. The
asset is produced in a design tool from the spec above. If campaign visuals
become routine, that is the moment to decide whether a pipeline earns its
maintenance — not on the first one.

**Export targets** (whatever tool is used): `1200 × 627` for LinkedIn and the
general landscape slot, optional `1080 × 1080` square. PNG. Light and dark.

## Never make

- A parity grid of ✅ across platforms. Coverage varies per component — 89 of 98
  on four platforms, and Angular at 11. A row of checkmarks is the visual form
  of exactly the claim this campaign is about.
- Any chart of stars, downloads or users. None are known.
- Angular shown alongside the other four without its preview label.
- A screenshot presented as a diagram, or a diagram presented as a screenshot.

## Numbers in any asset

Re-read from `pnpm marketing:stats` on the day the asset is made. Do not copy
them from this file.
