# Messaging

## Hierarchy

1. **Headline** — One token architecture, in motion across every platform.
2. **Subhead** — One DTCG source generates every platform's token output.
   React, SwiftUI, Jetpack Compose and Flutter each implement the same component
   contract natively; Angular is in preview.
3. **Differentiator** — Coverage is verified against source in CI, not asserted.
4. **Proof** — Generated parity data, per-platform native workflows, guardrails
   that have caught our own false claims.
5. **CTA** — `npx @kinetixui/cli@latest add button`

The count is never the lead. "98 components" is a footnote to "and we can prove
where each of them actually runs".

## Value propositions

Each has problem / promise / proof / CTA. Proof must be a repository fact.

### 1. Cross-platform consistency without one codebase
- **Problem:** web and mobile drift the moment they are maintained separately.
- **Promise:** one semantic token contract, compiled to each platform's native format.
- **Proof:** `tokens/` → Style Dictionary → `packages/tokens/dist/{web,ios,android,flutter}`; one value edit moves every platform.
- **CTA:** `/docs/tokens`

### 2. Native implementations, not wrappers
- **Problem:** cross-platform UI usually means a web view in a native shell.
- **Promise:** each platform's components are written in that platform's idiom.
- **Proof:** SwiftUI views, Compose composables, Flutter widgets and Angular
  standalone components — separate source trees, each compiled by its own CI.
  Angular is directives on native elements (`<button kxButton>`), not React wrapped.
- **CTA:** homepage flagship demo

### 3. Token-driven architecture
- **Problem:** design tokens stop at the web boundary.
- **Promise:** the same DTCG source produces Swift, Kotlin and Dart constants too.
- **Proof:** `KinetixSpacing`, `KinetixRadius`, `KinetixShadow`, `KinetixColors`
  and the Material/Cupertino theme adapters — usable **without** any Kinetix widget.
- **CTA:** `/docs/flutter`

### 4. Verifiable platform truth
- **Problem:** every design system claims parity; almost none verify it.
- **Promise:** a claim without source fails the build.
- **Proof:** `check:platform-source`, `check:block-source`, `check:platform-code` —
  each shipped after catching a real false claim in this repository.
- **CTA:** `/docs/platforms`

### 5. Accessibility and RTL as infrastructure
- **Problem:** both are retrofitted, per platform, badly.
- **Promise:** enforced centrally, tested per platform.
- **Proof:** WCAG AA contrast gate in CI; browser axe over 19 pages × 2 themes ×
  3 widths; `check:rtl` logical-property guardrail; direction-aware behaviour
  tests on Compose, Flutter and Angular.
- **CTA:** `/docs/accessibility`, `/docs/rtl`

### 6. Developer workflow and CI guardrails
- **Problem:** design systems rot quietly between releases.
- **Promise:** the guardrails are the product's maintenance plan.
- **Proof:** generated manifests, drift checks on every generated artefact,
  per-platform native workflows, contrast/typography/grid/icon checks.
- **CTA:** `/docs/contributing`

## Voice

Technical, specific, transparent, unhurried. Engineering-led.

**Write like this:**
> We found our platform counts were wrong. `direction-provider` claimed SwiftUI,
> Compose and Flutter and had no implementation on any of them. We added a check
> that verifies every claim against source, and the counts moved from 91/90/91
> to 90/89/90.

**Not like this:**
> Excited to announce our revolutionary new parity engine! 🚀

Banned: game-changing, revolutionary, seamless, effortless, best-in-class,
"the future of", fake urgency, emoji-led headlines, any parity claim without a number.

## Reusable openers

- "Here is a bug we shipped, and the guardrail we added because of it."
- "X claims to be cross-platform. Here is how to check whether it is."
- "The interesting part of a design system is not the components."
