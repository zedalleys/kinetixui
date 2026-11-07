# Polygon reference

Owner-supplied reference: `OH38WC1.svg` and its matching grayscale JPG, uploaded 2026-11-01. Only this reference governs the refresh; the separate coloured OFFLINE_ABSTRACT_SHAPES image is excluded.

Source SHA-256: `408664deb8813d3b03c142a54b3d24a7caa45dc20a6be9ec08ca4cdc8d97e12f`.

`apps/web/src/components/hero-mesh-source.json` preserves all source path coordinates. No outside imagery, generated raster, cultural motif or alternative mesh is used. Source tones 1 and 2 are the drawn links, 9 and 14 the junctions, the rest translucent facets; `scripts/gen-hero-mesh.mjs` classifies them by those tones, measures each junction's centre and measures the three light routes into `hero-mesh.json`, and runs with `--check` in CI so the derived file cannot drift from this source. The counts are 44 facets, 44 link outlines, 26 junctions and 3 routes, asserted in a browser by `scripts/rebrand-browser.mjs`.

The renderer maps the supplied tones to the Kinetic Weave palette approved on 2026-11-02 — indigo and violet for the identity, cyan and teal for the artwork's light — not to neutral ink. The grayscale rendering described in the 2026-11-01 brief, and the small nine-facet composition built on it in PR #509, were superseded. Geometry is never morphed: the ambient motion is a translate/scale breath on the whole body plus a per-facet opacity shimmer, the travelling lights move along the measured routes, and rotation is applied as a CSS transform on a wrapping group by the reader's drag or arrow keys. Nothing rotates the mesh automatically.

The uploaded file supplies design direction; its commercial redistribution license was not supplied. Keep this provenance record with the derived geometry.
