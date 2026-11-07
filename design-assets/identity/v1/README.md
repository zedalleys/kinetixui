# KinetixUI — Kinetic Weave identity (draft)

The three-ribbon K is the logo. The hero illustration is the owner's supplied
`189 [Converted].svg`, preserved separately as `hero-polygon-source.svg`.
Do not substitute the logo for the hero artwork.

## Implemented

- Navigation, footer, favicon and Open Graph artwork use the Kinetic Weave mark.
  Inline logo gradients have instance-specific IDs.
- The hero keeps the supplied SVG's nine facets, outlined cage and six junction
  nodes. The faces use luminous cyan highlights, translucent glass and deeper
  teal/indigo shading; the overlaid cage uses
  the theme's brand role. A blurred radial circle fades behind it.
- Pointer capture supports click and drag rotation with a bounded ±28° range.
  Arrow keys rotate in 5° steps; Home restores the initial view.
  Touch dragging yields to vertical page scrolling. Pointer cancellation releases
  the interaction. Rotation updates CSS variables without React renders per move.
- Idle suspension and traveling light autoplay in a continuous loop. They pause
  offscreen, in hidden tabs, during dragging, or using Space / Escape on the
  focused artwork. There are no visible motion controls or control captions;
  keyboard instructions remain available to assistive technology. Reduced motion removes
  autoplay; deliberate drag and keyboard rotation remain available.
- Marketing copy, platform support disclosures, installation links and derived
  counts remain intact. The interactive token-to-platform map follows the hero.
- Additive DTCG ramps drive light/dark roles and generated CSS/TS, SwiftUI,
  Compose and Flutter outputs. Angular consumes the shared CSS contract.
  Existing primitive names, semantic names and status colors remain available.
  Forced light previews and the Create theme baseline follow the new values.
- Generated marketing SVGs use the new palette without changing their claims.

## Color roles

| Role | Light | Dark |
| --- | --- | --- |
| Identity | Electric Indigo `#6054F4` | Soft Violet `#A78BFA` |
| Action / links / focus | Accessible Indigo `#5143DB` | Soft Violet `#A78BFA` |
| Action foreground | Cloud White `#F6F7FC` | Deep Canvas `#0C1229` |
| Foreground | Midnight Navy `#17233D` | Cloud White `#F6F7FC` |
| Background | White `#FFFFFF` | Deep Canvas `#0C1229` |
| Illustration accent | Electric Cyan `#28C7D9` | Electric Cyan `#28C7D9` |

Action is deeper than the identity color so text on its 90% hover and 85%
pressed fills still clears AA. Cyan is decorative, not body text on white.
Focus shadows and native interaction states are generated from their source
values and checked against the same semantic roles.

## Consumer migration

This changes default appearance, not token names or platform support.
Consumers with pinned colors or copied styles retain their overrides; check
those overrides against the new surfaces. No old blue/azure primitives were
renamed or recolored. The preset codec's original default-brand sentinel is
retained so existing saved presets continue to decode consistently.
Regenerate with `pnpm build:tokens` and the three `vendor:*` scripts; do not
hand-edit platform token outputs. Release/package versions are unchanged.

## Verification and remaining merge gates

See `verification/VERIFICATION.md` for the tested revision, actual website
screenshots and limits. PR #514 remains draft and must not be merged or released
until the owner reviews the visuals and required CI passes. Connected Figma
libraries and already published external marketing material have not been
modified by this code change.
