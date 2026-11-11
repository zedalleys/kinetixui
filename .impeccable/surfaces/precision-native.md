# Precision Native homepage extension

STATUS: Implemented; independent visual review disposition `ship` on 2026-11-10 for the Precision Native homepage surface. Merge, publication and deployment are not authorized.

THESIS: Let a working component specimen lead discovery, with clear editorial typography and platform source immediately available.

AUTHORITY: The owner approved Precision Native as the homepage's editorial expression. This extends the existing Kinetic Weave identity; it does not replace it. `PRODUCT.md` remains product authority. `DESIGN.md`, maintained separately in PR #550, remains the hero's visual authority. Neither file is changed by this extension. Shared library semantic tokens, native implementation contracts, and Create export behavior remain governed by their existing sources.

OWN-WORLD: Retain Space Grotesk display, Inter body and JetBrains Mono source/metadata. Use semantic page, card, muted, border, foreground and action roles for specimen surfaces. Electric Indigo `#6054F4` remains the identity; interactive foregrounds use the existing accessible semantic action role. Thin dividers, generous section space and restrained card contours give the examples room to read.

STORY: Preserved hero → interactive Switch playground and platform source → component gallery → Motion Lab → token/implementation map and the retained architecture, evidence, installation and supporting material below. Platform availability and catalogue counts continue to come from repository data; this surface makes no new maturity, pricing or Studio capability claims.

FIRST VIEWPORT: Preserve the approved hero and its animated polygon, exact logo, copy, CTAs and installation affordance. The homepage extension begins below it. The logo and polygon are separate assets, never substitutes.

FORM: At widths below `64rem`, the playground is stacked. At `64rem`, its intro becomes two equal columns and its specimen/source frame becomes `minmax(0, .9fr) minmax(0, 1.1fr)`: platform tabs span both columns, specimen and tools occupy the first, source occupies the second, and the footer spans both. Motion Lab also uses the shared `lg-rem` (`64rem`) two-column rule. Keep logical borders and inset positions for RTL; keep source overflow inside the code scroller.

INTERACTION: The Switch has real checked and disabled states that persist across platform changes. The displayed specimen is React; native tabs show their own implementation source and do not run a native view in the browser. Motion Lab demonstrates fluid tabs, interruptible numeric interpolation, a slider value bubble, disclosure, local validation, expanding search, popover speed dial, simulated pending feedback and chart reveal. These are local examples, not backend services or newly exported library APIs.

MOTION: Reuse `--duration-fast`, `--duration-base`, `--duration-slow` and `--easing-enter` with the existing library contract. Surface reveal wrappers remain visible without scroll entrances. New panel/search/feedback/chart animations are disabled under reduced motion; the numeric tween snaps to its exact target when the preference changes or the document becomes hidden. The hero retains its separate approved ambient/static behavior from `DESIGN.md`; historical rotation wording in older briefs is not permission to restore rotation or interactivity.

PROTECTED ASSETS: Preserve `apps/web/src/components/brand-mark.tsx`, `design-assets/identity/v1/kinetixui-mark.svg`, `kinetixui-mark-animated.svg`, and `kinetixui-app-icon.svg`; preserve `design-assets/identity/v1/hero-polygon-source.svg`, `apps/web/src/components/hero-mesh-source.json`, generated `hero-mesh.json`, `hero-polygon.tsx`, and `apps/web/src/app/brand-hero.css`. Current geometry authority and provenance remain `DESIGN.md` and `design-assets/polygon/REFERENCE.md`, including the supplied `OH38WC1.svg`/JPG. Older identity README descriptions of nine facets and drag rotation are historical, not current implementation instructions.

FINISH: See `docs/audits/precision-native/design.md` for the extracted surface rules and verification limits. Screenshots and current local measurement files live in the task's `outputs/` directory outside the repository. Final browser evidence covers eight viewport/theme/text-size combinations, including 320px at 200% text in both themes, with zero axe violations, zero runtime errors and stable platform-panel heights. Independent finish review disposition: `ship`, scoped to this homepage surface. Owner approval remains a separate delivery gate.

SIDECAR: No hand-written `.impeccable/design.json`. The existing polygon-refresh brief identifies it as a generated artifact whose generator is unavailable in this repository. This surface document and its audit are additive Markdown, not a replacement machine-readable global design system.
