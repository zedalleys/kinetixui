---
name: KinetixUI polygon brand surfaces
description: Connected grayscale facets around a clear component and theme workflow.
colors:
  brand-background: "hsl(0 0% 100%)"
  brand-foreground: "hsl(0 0% 12%)"
  brand-muted-foreground: "hsl(0 0% 38%)"
  brand-border: "hsl(0 0% 85%)"
  brand-primary: "hsl(0 0% 16%)"
  brand-primary-foreground: "hsl(0 0% 100%)"
  brand-ring: "hsl(0 0% 32%)"
  brand-action-hover: "hsl(0 0% 24%)"
  brand-action-pressed: "hsl(0 0% 8%)"
  dark-brand-background: "hsl(0 0% 8%)"
  dark-brand-foreground: "hsl(0 0% 94%)"
  dark-brand-muted-foreground: "hsl(0 0% 70%)"
  dark-brand-border: "hsl(0 0% 26%)"
  dark-brand-primary: "hsl(0 0% 92%)"
  dark-brand-primary-foreground: "hsl(0 0% 8%)"
  dark-brand-ring: "hsl(0 0% 80%)"
  dark-brand-action-hover: "hsl(0 0% 80%)"
  dark-brand-action-pressed: "hsl(0 0% 100%)"
typography:
  display:
    fontFamily: "Space Grotesk, Inter, system-ui, sans-serif"
    fontSize: "min(clamp(3rem, 6vw, 6.5rem), 17cqi)"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    lineHeight: "1.5rem"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: "1.25rem"
    letterSpacing: "0.1px"
  index:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    lineHeight: "1rem"
rounded:
  field: "4px"
  control: "8px"
  card: "16px"
  roadmap-label: "3px"
spacing:
  foundation: "8px"
  page-sm: "16px"
  page-md: "24px"
  page-lg: "32px"
  hero-gap: "4rem"
  hero-gap-wide: "5rem"
components:
  button-primary:
    backgroundColor: "{colors.brand-primary}"
    textColor: "{colors.brand-primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  motion-toggle:
    backgroundColor: "{colors.brand-background}"
    textColor: "{colors.brand-muted-foreground}"
    rounded: "{rounded.control}"
    padding: "8px"
  roadmap-label:
    textColor: "{colors.brand-muted-foreground}"
    rounded: "{rounded.roadmap-label}"
    padding: "0 4px"
---

# Design System: KinetixUI polygon brand surfaces

## Overview

**Creative North Star: "Connected grayscale facets"**

Connected grayscale facets carry the brand while plain typography and clear controls carry the task. White or charcoal surfaces, thin links and translucent triangles surround the existing component and theme workflows. The visual authority is the owner-supplied OH38WC1.svg and matching JPG; no alternative artwork or Arabian motifs belong to this refresh.

This document governs the implemented homepage, shared website header/footer and Create chrome only. Its brand color names describe local website overrides, not new library tokens. Library public APIs, semantic token contracts, status colors, component states and Create's generated preview/export semantics remain authoritative in their existing sources. Create remains the implemented theme editor; future Studio capabilities remain roadmap.

**Key Characteristics:**
- Grayscale brand surfaces with theme-aware neutral ink.
- Exact source geometry, bounded motion and static secondary meshes.
- Self-hosted Space Grotesk, Inter and JetBrains Mono.
- Responsive spacing, wrapping controls, RTL and visible keyboard focus.

## Colors

### Primary

Neutral ink is the brand action color, inverted to pale ink on charcoal in dark mode. The `brand-primary` pair is the filled CTA treatment; the `dark-brand-*` values are its explicit dark surface override. There is no new chromatic brand accent.

### Neutral

The frontmatter preserves the actual HSL source values. Background, foreground, muted foreground, borders and focus ring each have a light/dark pair. Mesh fills and strokes inherit foreground rather than a separate palette. Action aliases resolve locally to primary and primary foreground. The extracted action-hover/action-pressed variables exist in brand CSS; the actual library Primary Button still uses action opacity (90% hover, 85% pressed), not those aliases.

**The Scope Rule.** Apply neutral brand overrides only to the approved website surfaces; never propagate them into library token generation or Create preview/export contracts.

The override selector is `.kx-polygon-surface` in `apps/web/src/app/globals.css`. It does not override every semantic color: card, input, destructive, success, warning and other inherited library roles retain their own contracts. Do not infer that every preview or component is grayscale.

## Typography

Display uses self-hosted Space Grotesk with Inter/system fallbacks. Body and controls use self-hosted Inter; numbered navigation, metadata and code use JetBrains Mono. Font provenance lives beside the bundled fonts.

The homepage display role uses the frontmatter size expression, a compact line height and a maximum measure of (8em). Its copy wrapper establishes an inline-size container; the (17cqi) cap keeps whole words within the available column, including a (320px) viewport at (200%) text size. Manual hyphenation preserves the intended word forms. Supporting hero text is (1.125rem) with a maximum width of (28rem). Create's title grows from (1.875rem) to (2.25rem) at the existing medium breakpoint. Header/footer wordmarks use (0.9375rem), bold uppercase text and (0.18em) tracking. These are website roles, not changes to the shared library type scale.

## Layout

Keep the shared (8px) foundation. Homepage/header/footer containers cap at (1536px) and use side gutters of (16px), (24px) from (640px), and (32px) from (1024px). Create caps at (96rem) with the same gutter ladder. Header identity/tools and desktop navigation wrap; desktop navigation begins at (768px). Footer columns stay stacked until (1024px), then become a (2fr) identity column and three shrinkable columns.

The hero stacks by default with a (4rem) gap and (5rem) vertical padding. At (64rem), it becomes two equal columns with a (5rem) gap and (6rem) padding. The mesh caps at (34rem) on wide layouts. Below that breakpoint it caps at (24rem), is cropped to (16rem) height and shifts upward (20%). Preserve the existing rem-based composition breakpoints where used; do not mix px/rem ladders for the same responsive property.

At proof-map container widths of (12rem) or less, the grid stacks to a single shrinkable column with automatic rows and no start padding. Outputs and tabs share column one, use automatic row placement, remove fixed row tracks and retain a (.5rem) gap. Chips use automatic rows and the connecting rule disappears. Implementation labels within brand surfaces have zero minimum width and may wrap anywhere. These fallbacks keep proof rows readable with enlarged text without changing their data or meaning.

## Elevation & Depth

Brand structure uses flat page surfaces, thin borders and translucent facets rather than a decorative shadow layer. The source mesh uses foreground opacity: general facets (.08), light facets (.035), deeper facets (.12), two link groups (.24/.13), nodes (.32), and signals (.4). The footer reduces the entire mesh to (.3); Create's cropped heading mesh uses (.25).

Library cards still use their existing raised surface model, half-strength border and `--shadow-md`. Keyboard focus remains explicit: the mesh motion toggle uses a (2px) ring outline offset by (4px); library controls retain their existing focus-shadow tokens. Flat brand framing does not flatten library cards or remove focus rings.

## Shapes

Triangulated facets, narrow links and nodes come from the supplied SVG coordinates, preserved in `apps/web/src/components/polygon-mesh-geometry.json`; see `design-assets/polygon/REFERENCE.md`. The renderer keeps the full base geometry and adds three signal paths along existing connections. It uses the source viewBox (0 0 741.71 860.74).

**The Source Geometry Rule.** Keep the 114 source shapes and only three overlay links; preserve source coordinates and provenance.

Controls keep modest rounding: field, control and card radii in the frontmatter describe incumbent component values, not a newly authored radius scale. The tiny roadmap label retains its compact rectangular shape. Footer mesh rotates (180deg); the cropped Create mesh rotates (90deg). Neither rotation alters the source geometry.

## Components

- **Primary CTA:** the existing library Primary Button, large size, uses action/foreground, its incumbent label type and focus treatment. The homepage locally reduces padding to (12px 16px), caps width at (100%), permits normal text wrapping and gives its label a shrinkable, word-wrapping span. This keeps the CTA usable at (320px) with (200%) text. Preserve library variants and disabled behavior; the local override does not change the library default.
- **Text fields:** retain the existing library input contract: muted foreground edge at (80%), stronger eligible hover, action edge and focus shadow, error semantics, read-only fill and disabled opacity. These are inherited controls, not a new neutral input API.
- **Navigation:** two wrapping header rows, numbered desktop sections, muted inactive text and an active (2px) primary underline. Footer links strengthen on hover and retain visible focus. Header version and roadmap labels remain honest about maturity.
- **Cards and chips:** library cards retain semantic surface/elevation behavior. The header's “soon” label is a compact bordered roadmap marker, not a claim of availability. Static cards do not gain pointer affordances.
- **Polygon mesh:** decorative SVG is hidden from assistive technology and cannot capture pointer input. Only the homepage instance requests animation. Footer and Create heading instances remain static and subordinate to content.

**The Motion Permission Rule.** Animate only the visible homepage mesh while the document is visible, reduced motion is off and the user has not paused it.

The whole connected group drifts by (4px, -4px) over (16s ease-in-out), alternating. Node opacity alternates from (.32) to (.16) over (8s ease-in-out). Exactly three overlay paths use a (.16 .84) dash pattern and (12s linear) cycle, staggered by (0s, -4s, -8s). Base coordinates never morph; links/nodes remain registered to their facets.

The visible “Pause motion” / “Resume motion” control uses the existing `@kinetixui/ui` Toggle and has a minimum height of (2.75rem), pressed state and a localStorage preference under `kx-polygon-motion`; unavailable storage falls back to the current view. Intersection observation, document visibility and the operating system motion preference gate playback. Missing IntersectionObserver leaves the mesh static. Reduced motion removes animation and hides signal overlays and the motion toggle while retaining the complete base mesh. No new animation library, timer loop or particle system is required.

## Do's and Don'ts

### Do:
- Do use the supplied grayscale geometry and keep its provenance with the implementation.
- Do retain the 8px spacing foundation and allow text, controls and navigation to reflow.
- Do preserve real component states and Create theme/export behavior.
- Do keep secondary meshes static and respect reduced motion and the persisted pause choice.

### Don't:
- Don't introduce Arabian motifs, the excluded coloured reference or replacement mesh artwork.
- Don't apply brand surface values as replacements for library semantic tokens.
- Don't advertise future Studio features as implemented.
- Don't add unbounded particles, extra overlay links or animation behind Create controls.
