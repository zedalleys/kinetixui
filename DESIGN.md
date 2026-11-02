---
name: KinetixUI original-brand polygon hero
description: An animated SVG network accent for the website, using the existing brand, logo, and component tokens.
colors:
  background: "hsl(var(--background))"
  foreground: "hsl(var(--foreground))"
  primary: "hsl(var(--primary))"
  primary-foreground: "hsl(var(--primary-foreground))"
  muted-foreground: "hsl(var(--muted-foreground))"
  border: "hsl(var(--border))"
  ring: "hsl(var(--ring))"
spacing:
  foundation: "8px"
  page-sm: "16px"
  page-md: "24px"
  page-lg: "32px"
typography:
  display:
    fontFamily: "Space Grotesk, Inter, system-ui, sans-serif"
    lineHeight: 1.04
  body:
    fontFamily: "Inter, system-ui, sans-serif"
---

# KinetixUI website and Create — animated polygon visual language

## Non-negotiable brand contract

Preserve the existing KinetixUI wordmark, Layers logo mark, and all semantic design-token colors.
In particular, the canonical action blue is defined by the imported KinetixUI token CSS;
there is NO black/grayscale brand re-theme and NO alternate cyan/teal palette.
Do not override --primary, --foreground, --ring or --action on any website container.
Do not alter library tokens, component exports, Create user-generated themes, or previews.
Do not introduce Arabian, Islamic, or other decorative motifs.

## Homepage hero

One simple headline: One design system. Every platform.
One short explanatory sentence, one real library primary CTA, and one secondary Create text link.
The right half contains a new SVG constellation assembled from original triangular facets,
edges, connector trails, and nodes inspired by the user's low-poly reference.
It must NOT display the imported OH38WC1.svg geometry unchanged in the hero.
Dynamic strokes, breathing facets and subtle node scaling use the existing primary blue.
The SVG is decorative, outside the accessibility tree and does not intercept pointers.

Animations are bounded CSS animations, not frame-by-frame React state updates.
The persisted pause control is an existing KinetixUI Toggle, operable by keyboard.
Pause when offscreen, when the tab is hidden, when the user pauses, and whenever
prefers-reduced-motion requests reduced motion. In that mode a useful static SVG remains.
Provide real contrast, RTL, mobile, 200% text and overflow verification.

## Other website surfaces

The shared website header retains its exact existing logo markup and brand color contract.
The header remains lightweight and readable; the footer can use the existing accent surface.
The Create editor remains a neutral working canvas, preserving generated preview isolation.
Existing source-geometry motifs may remain as static low-contrast accents in secondary surfaces;
the hero specifically uses the new original constellation.

## Product integrity

Preserve the published KinetixUI component APIs, existing 8px spacing foundation,
actual platform support language and the current Create export contracts.
The visual change does not claim future Create Studio features are shipped.

## Evidence

Update the PR #509 visual preview and run homepage and Create browser gates against the
current code. Release changes require a separate owner-approved merge.
