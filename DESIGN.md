---
name: KinetixUI Kinetic Weave brand surfaces
description: A large connected facet network in indigo, violet and cyan around a clear component and theme workflow.
colors:
  brand-indigo: "#6054F4"
  brand-violet: "#A78BFA"
  brand-cyan: "#28C7D9"
  brand-navy: "#17233D"
  brand-cloud: "#F6F7FC"
  brand-canvas: "#0C1229"
  action-light: "#5143DB"
  mesh-link-light: "#2BA2CD"
  mesh-link-dark: "#5FD8ED"
  mesh-highlight-light: "#E2FCFF"
  mesh-highlight-dark: "#9CF0FF"
  mesh-return-light: "#3350B6"
  mesh-return-dark: "#221F68"
typography:
  display:
    fontFamily: "Space Grotesk, Inter, system-ui, sans-serif"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    lineHeight: "1.5rem"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: "1.25rem"
  index:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    lineHeight: "1rem"
spacing:
  foundation: "8px"
  page-sm: "16px"
  page-md: "24px"
  page-lg: "32px"
  hero-gap: "1.5rem"
  hero-gap-wide: "1.9rem"
---

# Design System: KinetixUI Kinetic Weave brand surfaces

## Overview

**Creative North Star: "A connected network, lit."**

A large triangulated facet network carries the brand while plain typography and clear controls carry the task. The visual authority is the owner-supplied `OH38WC1.svg` and matching JPG, recoloured — not redrawn — in the Kinetic Weave palette. No alternative artwork and no Arabian motifs belong to this refresh; the separate coloured OFFLINE_ABSTRACT_SHAPES reference is excluded.

This document governs the implemented homepage hero only. Its brand colour names describe that surface's local custom properties, not new library tokens. Library public APIs, semantic token contracts, status colours, component states and Create's generated preview/export semantics remain authoritative in their existing sources.

**It supersedes the grayscale brief of 2026-11-01.** That direction, and the small nine-facet composition built on it in PR #509, were ruled out by the owner on 2026-11-02 in favour of the full-colour identity and the large integrated mesh. The earlier record is kept, marked as superseded, in `docs/audits/polygon-refresh/`.

**Key Characteristics:**
- Full-colour brand surfaces: indigo and violet hold the identity, cyan and teal light the artwork.
- Exact source geometry, generated render data, and motion that is either the reader's or ambient — never an automatic rotation.
- Self-hosted Space Grotesk, Inter and JetBrains Mono.
- Responsive spacing, wrapping controls, RTL and a focus indicator drawn from the artwork itself.

## Colors

### Identity versus action

The identity colours and the accessible interactive colours are separate roles and must stay separate. Electric Indigo `#6054F4` is the identity; the light theme's action colour is `#5143DB` (`indigo.600`), and the dark theme's is `indigo.300`, because Soft Violet as text measured 4.43:1 on `bg-primary/10` over `card` and fails AA as a foreground. The reasoning for each is recorded in the token's own `$description` in `tokens/semantic/color.dark.json`, which is the canonical source; this file does not restate values that generation owns.

### The mesh palette

The hero's facets are four two-stop gradients, deepest return face to highlight, declared as custom properties on `.kx-hero-polygon` in `apps/web/src/app/brand-hero.css` and re-tinted — not duplicated — under `.dark`. Depth is carried by opacity as well as hue so it survives a flat render: material 0 at `.17`, the default at `.3` (light) / `.34` (dark), material 2 at `.38`, material 3 at `.5`. Links stroke at the link opacity, and the lighter supplied link class at half of it.

**The Scope Rule.** Apply hero brand overrides only to the hero. Never propagate them into library token generation or Create preview/export contracts.

## Typography

Display uses self-hosted Space Grotesk with Inter/system fallbacks; body and controls use self-hosted Inter; numbered navigation, metadata and code use JetBrains Mono. Font provenance lives beside the bundled fonts.

The headline is sized against its own column: the copy wrapper establishes an inline-size container so the longest word always fits, including at 320px with 200% text. Supporting hero text caps at `max-w-xl`. These are website roles, not changes to the shared library type scale.

## Layout

Keep the shared 8px foundation. The hero container caps at `max-w-screen-2xl` with side gutters of 16px, 24px from 640px and 32px from 1024px.

Below 64rem the hero is one column: headline and CTAs first, then the mesh under them at `min(100%, 30rem)`, and `min(100%, 22rem)` below 30rem. At 64rem it becomes `1fr / 1.16fr` with a 1.9rem gap and centred items.

**The Integration Rule.** The mesh breaks its column rather than sitting in it. Its end margin eats the container's own right gutter and then 4rem more — `calc(-1 * (50vw - min(50vw, 48rem)) - 4rem)` — so the bleed grows with the viewport instead of stopping where the container stops. Without that, the mesh shrank as a share of the hero at every width past the container cap, because the section spans the viewport while the artwork was confined to the centred column.

Measured share of the hero's area, mesh box over section box, on this build: 62.6% at 1440, 62.3% at 1600, 61.4% at 1920, 60.2% at 2560 — the 55–65% the owner specified, held across the desktop range rather than at one width. Below 1440 it falls to 52% at 1280 and 42% at 1024, deliberately: that is where the copy column needs the room back.

No facet, link or junction box overlaps the headline, lede, platform line, CTAs or install link at any of those widths. `check:home-systems` independently holds the lede's rendered contrast against whatever the atmosphere puts behind it.

## Elevation & Depth

Brand structure uses flat page surfaces, thin borders and translucent facets rather than a decorative shadow layer. The one soft element is the atmosphere: a blurred radial wash behind the upper mesh, a background gradient on a small box and deliberately not an SVG filter over the whole illustration. Its contribution to the page is held inside a measured band — a floor so the light spot is actually there, a ceiling so it stays light rather than a wash — and both bounds are exercised by negative controls in `scripts/home-systems-negative-controls.mjs`.

Keyboard focus is explicit and measured, not asserted. See **Components**.

## Shapes

Triangulated facets, narrow links and junctions come from the supplied SVG coordinates, preserved in `apps/web/src/components/hero-mesh-source.json`; provenance in `design-assets/polygon/REFERENCE.md`. `scripts/gen-hero-mesh.mjs` derives the render and motion data from it into `hero-mesh.json` and runs with `--check` in CI, so the two cannot drift. The source viewBox `0 0 741.71 860.74` is used unchanged.

**The Source Geometry Rule.** 44 facets, 44 link outlines, 26 junctions, 3 light routes. Nothing invents geometry: the generator classifies the supplied shapes by their source tone, measures each junction's centre and measures the route lengths. `scripts/rebrand-browser.mjs` asserts those counts and that no facet's `d` changes under interaction.

## Components

- **Hero CTAs:** both are the existing library Button at `size="lg"`, one filled and one Outline. They are part of the composition and are not removed to make room for the artwork.
- **Polygon mesh:** the `<svg>` is `aria-hidden` and `role="presentation"` and cannot capture pointer input; only its facets opt back in, with `touch-action: pan-y`, so a touch anywhere else still scrolls the page.
- **The reader's layer:** one focus stop — a `role="group"` with an accessible name and sr-only instructions. Arrow keys rotate by 4°, Home returns to 0°, Space toggles the travelling lights with a `role="status"` announcement, Escape pauses. Dragging a facet rotates at 0.28° per pixel of travel, and the lights keep moving during the drag.
- **Focus indicator:** no rectangle. A 2px stroke over the facets reached 3:1 against what it borders over only 34% of its area in light and 14% in dark, because `--focus` is close in luminance to the indigo shadow faces. The indicator is therefore the wireframe brightening and thickening to `--focus`, which sits on the page rather than on a facet — 6.18:1 in light, 9.70:1 in dark — and does not depend on which facet it crosses. `scripts/hero-light-browser.mjs` measures it differentially: it renders unfocused and focused, takes the changed pixels as the indicator and compares each against its nearest unchanged neighbour, and it reaches focus with Tab rather than `focus()` plus an arrow key, because an arrow key rotates the mesh and would contaminate the diff.
- **Forced colours:** the one place a rectangle is correct. The artwork's strokes are repainted to a single system colour and can no longer carry the indicator, so the group takes a `3px solid Highlight` outline and the decoration is hidden.

**The Motion Permission Rule.** Rotation is the reader's. Nothing rotates the mesh on its own, at any time, in any motion mode.

Ambient motion is a translate/scale breath on the whole body over 19s, a per-facet opacity shimmer around each facet's own depth, and a one-time intro that draws the links and scales the facets in. The travelling lights run in the component's single `requestAnimationFrame` loop, which is suspended offscreen and on a hidden tab, and writes through `setAttribute`/`setProperty` so neither a drag nor a pulse costs a React render. Rotation lives in its own nested group outside the breath, because both want `transform` and sharing one property means one silently winning.

Reduced motion renders a complete static composition: no loop starts, no intro, no breath, no shimmer, and the pulses — the only element with nothing to say when still — are removed. The mesh is left at the supplied artwork's own rest pose, which is a whole illustration rather than a stripped one. `hero-light-browser.mjs` times a light's actual lap against the duration `hero-mesh.json` declares, within 35%, so a geometry change cannot silently move it.

## Do's and Don'ts

### Do:
- Do use the supplied geometry through its generator and keep provenance with the implementation.
- Do keep identity colour and accessible action colour as separate roles.
- Do retain the 8px foundation and let text, controls and navigation reflow.
- Do keep the mesh integrated into the page and clear of the copy, and verify both by measurement.
- Do preserve real component states and Create theme/export behavior.

### Don't:
- Don't introduce Arabian motifs, the excluded coloured reference, or replacement mesh artwork.
- Don't rotate the mesh automatically, in any motion mode.
- Don't restore the grayscale brand brief, the small nine-facet hero, or a rectangular focus outline.
- Don't substitute the K logo for the polygon, or the polygon for the K logo.
- Don't apply hero brand values as replacements for library semantic tokens.
- Don't advertise future Studio features as implemented.
