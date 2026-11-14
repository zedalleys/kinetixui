# Precision Native: implemented surface record

Recorded 2026-11-10 from the homepage implementation. Independent final visual review disposition: `ship`, scoped to the Precision Native homepage surface. This does not authorize merge or deployment.

## Overview

**Surface direction: "Precision Native."**

A working component leads the homepage's discovery story. An editorial heading introduces the specimen, the reader changes its state, and each platform's implementation source stays close enough to compare. The gallery and Motion Lab follow before the retained system map and source evidence.

This is a surface extension, not a global design-system replacement. `PRODUCT.md` remains product authority; existing `DESIGN.md` remains hero authority and is maintained by PR #550. This record does not amend either. Library tokens, platform semantics and Create exports retain their existing authority. The approved Kinetic Weave logo, identity and animated polygon are protected.

Implementation sources: `apps/web/src/app/page.tsx`, `apps/web/src/app/precision-native.css`, `apps/web/src/components/systems/explorer-tabs.tsx`, `apps/web/src/components/motion-lab.tsx`, `apps/web/src/components/motion-patterns.tsx`, and `apps/web/src/lib/use-animated-number.ts`.

## Colors

Use existing semantic CSS custom properties rather than a parallel palette:

| Token | Concrete surface usage |
| --- | --- |
| `--background` | Playground section background. |
| `--card` | Playground shell and gallery tile surface. |
| `--muted` | Playground canvas at `.35` alpha; gallery previews at `.3`. |
| `--foreground` / `--muted-foreground` | Headings/state text and supporting explanations; slider bubble uses foreground with background text. |
| `--border` | Section, specimen and source-column dividers. |
| `--primary` | Existing semantic action colour, chart bars and caret; selection uses `.2` alpha with foreground text. |
| `--destructive` | Local validation error text. |
| `--ring` | Explicit disclosure focus outline, `2px` with `4px` offset. |

The protected identity remains Electric Indigo `#6054F4`. It is not a replacement for accessible semantic action text. Theme-dependent values remain defined in the existing semantic token sources; this audit introduces no new colour tokens.

## Typography

Retain the self-hosted Space Grotesk display, Inter body/control and JetBrains Mono metadata/source roles. Section titles use the display family, semibold weight, `text-4xl` increasing to `text-5xl` at the existing medium breakpoint, with balanced wrapping and approximately `-0.03em` tracking. The playground/gallery headings use `1.04` line height; Motion Lab uses the existing tight line-height utility. Lab subsection titles use `text-2xl` semibold. Supporting copy is muted, generally small/body text, with introductory copy growing at medium widths.

The slider's visual number uses tabular figures and is hidden from assistive technology. The slider thumb exposes the exact accessible value; the animated display does not repeatedly announce intermediate values.

## Layout

Retain the shared 8px foundation, `max-w-screen-2xl` container and `16px` / `24px` / `32px` page gutters. The homepage section wrapper applies `clamp(3rem, 7vw, 6rem)` block padding through the surface's `--kx-section-gap`; Motion Lab uses its explicit `py-20` / `md:py-28` spacing. The playground canvas pads with `clamp(1.5rem, 5vw, 4rem)`.

**The 64rem Rule.** Below `64rem`, keep specimen, tools and source in reading order as a stacked flow. At `64rem`, use two intro columns and a `.9fr / 1.1fr` playground split. Tabs span both columns; specimen and tools fill the left, source spans their rows on the right, footer spans the full width. Motion Lab's heading/content grids use the same `lg-rem` threshold. Do not substitute a fixed pixel threshold for this text-sensitive rule.

Source panels share one grid cell with a hidden reserve of the tallest panel. The reserve is `aria-hidden`, inert and visually hidden. This keeps platform changes from moving content below without hard-coding a clipping height. Zero minimum column sizing and an internal source scroller prevent wide code from growing the page. Logical source borders and slider bubble placement follow RTL. Chart reveal direction reverses in RTL.

## Elevation & Depth

Surface hierarchy uses semantic fills, thin borders and whitespace. This extension adds no decorative shadow system. Hero atmosphere and site-wide cursor glow remain under existing authority; popover elevation remains the shared library's behavior.

## Shapes

The playground shell retains `rounded-2xl`; gallery tiles use a `1rem` radius and semantic card fill. Slider bubbles use the existing medium radius. These website compositions do not redefine library corner tokens or protected logo/polygon geometry.

## Components

| Component | Implemented behavior and motion |
| --- | --- |
| Switch playground | Real controlled Switch, persistent checked/disabled state across platform tabs, and explicit state text. React is the live browser specimen; other platforms expose source. |
| Gallery | Retained component spotlight, semantic card/preview fills and display headings; catalogue count remains derived. |
| Fluid tabs | Existing library `motion="fluid"` tabs retain keyboard interaction and selection visibility. |
| Slider and number | Bubble follows the exact value using logical inset; visual number interpolates linearly from its current value, retargets on changes, and reads `--duration-base` with a 300ms fallback. |
| Disclosure | Button exposes expanded state and controlled panel ID; panel arrives with a 4px translate/fade using `--duration-fast` and `--easing-enter`. |
| Local validation | Labelled email input, `aria-invalid`, associated polite feedback and explicit explanation that nothing is sent or saved. Feedback fades using the fast enter tokens. |
| Expanding search | Labelled local filter over six example names, matching-count status, initial input focus, Escape/close returning focus to the trigger; fast enter animation. This is not catalogue-wide search. |
| Speed dial | Existing Fab/Popover owns dismissal and focus. Ordinary action buttons update local status; no item is persisted. Plus rotation uses the fast duration and is removed under reduced motion. |
| Pending feedback | Disabled busy button, spinner and status while a local 900ms timer runs. No network request; timer is cleaned up on unmount. |
| Chart reveal | Six illustrative bars, accessible text values and replay button; clip reveal uses `--duration-slow` and `--easing-enter`. It animates on mount and replay, without an automatic repeating loop. |

Reduced motion disables the new CSS panel, feedback, search and chart animations. Number interpolation snaps to target for reduced motion, changes to that preference, hidden documents, unchanged/non-finite input and zero-duration operation, and cancels its frame/listeners on cleanup. Shared primitives retain their own existing reduced-motion contract. Semantic controls and final content remain available in the reduced form. Forced colours explicitly replaces the specimen divider with `CanvasText`; other controls rely on their shared forced-colour behavior.

The homepage's reveal wrappers are visible with no entrance animation under this surface scope. This does not remove the protected hero's ambient motion: hero decoration, offscreen suspension and reduced-motion rest pose remain governed by current `DESIGN.md`. Older surface/identity notes that mention reader rotation do not override its later decoration-only decision.

## Do's and Don'ts

- Keep platform claims, source links, maturity qualifications and component counts derived from their existing manifests.
- Keep the specimen useful without motion and preserve its state while comparing source.
- Preserve the exact Kinetic Weave logo and polygon as separate assets. Protected files include `apps/web/src/components/brand-mark.tsx`; `design-assets/identity/v1/kinetixui-mark.svg`, `kinetixui-mark-animated.svg`, `kinetixui-app-icon.svg`, `hero-polygon-source.svg`; `apps/web/src/components/hero-mesh-source.json`, generated `hero-mesh.json`, `hero-polygon.tsx`; and `apps/web/src/app/brand-hero.css`. Current source provenance is `design-assets/polygon/REFERENCE.md` and the supplied `OH38WC1.svg`/JPG.
- Do not promote local demo actions into claims of production services or native views running in the browser.
- Do not replace semantic action colours with identity hex values or change library/export contracts to style this page.
- Do not hand-create `.impeccable/design.json`: it is generated, and the existing brief says its generator is unavailable here.

Verification evidence and limits: the task's external `outputs/` directory contains final viewport/theme screenshots, `browser-results.json` and `performance.json`. The final browser run records eight combinations: 1440, 390 and 320px in light/dark plus 320px at 200% text in both themes. All have zero axe violations, zero runtime errors and equal explorer heights across all five tabs. The gate also exercises LTR/RTL overflow, local interactions, search Escape and FAB focus return. Existing homepage and protected-identity browser gates passed.

The independent finish reviewer returned `ship` with no material findings in the reviewed homepage scope after inspecting valid desktop/mobile light/dark evidence and source. Static captures do not prove smoothness or complete assistive-technology behavior. Local performance measurements describe a desktop browser without a deployed device/network baseline or field sample; they are diagnostic only. Merge, publication and deployment remain separate owner-controlled actions.
