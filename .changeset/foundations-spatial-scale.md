---
"@kinetixui/tokens": minor
---

Foundations: the spatial scale is now documented as an **8-unit grid with a 4-unit half-step**, and extended additively. New tokens: `spacing.10`, `12`, `16`, `20`, `24`, `32` (40, 48, 64, 80, 96, 128 — the layout scale; the numbering stays n × 4, matching Tailwind), `radius.xxl` (24), `duration.instant` (100ms) and the `easing.enter`, `easing.exit` and `easing.emphasized` curves. Nothing existing was renamed or changed.

The SwiftUI, Compose and Flutter outputs now also include `KinetixSpacing` (`space0`…`space32`) and `KinetixRadius` (`none`…`full`) alongside `KinetixDuration` / `KinetixEasing` — spacing and radius previously reached only web and Android. `pnpm check:grid` (new, in CI) keeps every spacing token a multiple of 4 and stops the component library gaining new off-grid arbitrary pixel values. See `/docs/foundations`.
