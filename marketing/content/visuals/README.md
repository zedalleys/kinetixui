# Visual assets

Generated, not designed by hand. `pnpm gen:visuals` writes the SVGs from repository truth;
`pnpm render:visuals` rasterises them and checks they survive a feed.

```bash
pnpm gen:visuals                                        # SVG, from the manifests and tokens
PLAYWRIGHT_CHROMIUM_PATH=<chromium> pnpm render:visuals  # PNG + geometry check
```

**Nothing here is hand-edited.** Every count comes from `components.manifest.json`, `platform-parity.json`
and `block-parity.json`; every colour and radius from the real token output. An image with a baked number is
a claim nobody can re-check and nothing will ever correct.

`manifest.json` is the index: asset id, source brief, the content it serves, claim dependencies and **alt
text** for every asset.

## The render check

`render:visuals` fails on three things, and it has caught all three in this repository:

1. **Type too small for a feed.** A 1200px card is displayed at roughly 390px, dividing every size by three.
   The floor is 20px on the canvas (~6.5px in the feed), clamped in the generator so a new asset cannot
   reintroduce it.
2. **Text outside the canvas.** Measured from the rendered geometry, not the markup — three titles shipped
   overflowing while a font-size-only check passed them.
3. **Text colliding on the same baseline.** The coverage table had `98/98` touching `stable` in five rows.

A number can be large and still be absent. The check measures what the browser drew.

## Default theme

**Dark**, for one reason that is not taste: these are architecture diagrams and code, and a dark card is
visually distinct in a feed of light corporate posts. The exception is the homepage screenshot, which shows
the product's own default because that is what it is a picture of.

## Social card templates

Five layouts, which is the whole system. They are functions in `scripts/gen-marketing-visuals.mjs`, not a
design file, so a new card is a few lines rather than a new artboard.

| Template | Shape | Used by |
| --- | --- | --- |
| **A — Engineering idea** | Eyebrow, auto-fitted headline, subhead, one supporting line | VIS-005 |
| **B — Architecture** | Heading + node/arrow diagram with a caption pair | VIS-001, VIS-002, VIS-003, VIS-008, VIS-009 |
| **C — Product proof** | Heading + derived data table with bars | VIS-006 |
| **D — Adoption** | Heading + stacked rungs, first one emphasised | VIS-007 |
| **E — Preview / announcement** | Wordmark, positioning, derived platform strip | SOCIAL-PREVIEW |

Shared by all five: the 6px primary rule at the top, the 64px gutter, the `kinetixui.com` footer, the dark
surface, and the type scale. They are recognisably one family without being identical.
