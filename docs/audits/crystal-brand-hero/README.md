# KinetixUI Brand Refresh — Crystal Polygon (2026-11-02)

## Decision and scope

The owner approved a turquoise/cyan/navy brand palette and a homepage based on the approved crystal-polygon hero concept, retaining the EXISTING KinetixUI logo.

This phase implements the branding throughout the website via body class kx-brand-site. Shared navigation, docs, marketing and Create's outer interface inherit the new colors; user-generated Create themes remain independent.

This phase does NOT automatically republish or overwrite the MIT component library's token artifacts. Cross-platform source-token migration requires a full audit across DTCG, React, Angular, SwiftUI, Compose and Flutter and a separate release review. Public component APIs are unchanged.

## Brand roles

- Navy #123A58 — headlines and dark context
- Primary teal around #00757D — AA-safe links, focus rings and actions
- CTA gradient #007A83 to #007F88 — white text
- Cyan #20CBD0 — decorative SVG illumination
- Sky #45B5DE — mesh edges and facets
- Ice #BCEEF8 — light crystal facets
- Mist #E7FAFD — airy atmospheric backgrounds

Decorative cyan must not be used as small body text. Dark mode uses a separately tested light-teal primary.

## Approved hero

- Keep actual KinetixUI logo and current navigation, not invented pricing or login links.
- Headline: Build dynamic interfaces with KinetixUI.
- Short supporting paragraph; two truthful CTAs to installation and platform demonstrations.
- Only confirmed library platforms: React, Angular, SwiftUI, Jetpack Compose, Flutter.
- Original inline SVG crystal with translucent triangular facets, hubs, orbital connectors, glowing light paths and bounded CSS animations.
- Motion pauses on user request, background tabs, offscreen, and reduced-motion preference.
- At narrow viewports, content and CTAs precede the entirely visible vector illustration.
- 8px spacing, focus-visible, RTL and no-overflow guarantees remain.

## Evidence requirements

- Production build, typecheck, component tests and complete Chromium accessibility/browser matrix.
- Visual captures for desktop, mobile and dark mode, including 200% text/RTL checks.
- No unsupported Vue/Figma integration claims.
- Original component exports and user-generated theme contracts unchanged.

## Image evidence

Screenshots in this folder are real Chromium captures of a local production build. The isolated build reuses dependency node_modules from an older checkout; its package-version label may be stale and must not be interpreted as the published npm registry version.

No merge, website deployment or package publication is authorized by this file.
