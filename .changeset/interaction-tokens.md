---
"@kinetixui/tokens": minor
"@kinetixui/ui": minor
---

Add an `interaction` token category — `target.minimum` (44px), `target.default` (40px), `focus.width` (1px), `focus.offset` (2px), `press.opacity` (0.8), `drag.threshold` (4) — behavioral values that sit alongside the existing theme-independent `motion`/`opacity` primitives rather than colors or spacing. Two are wired into real consumers in this slice: `focus.width` now backs the `spread` of every `shadow.focus*` entry (compiled CSS is unchanged — same `0 0 0 1px …`, now token-backed instead of a magic number), and `drag.threshold` drives `KanbanBoard`'s `PointerSensor` activation distance via `tokens.interaction.drag.threshold` from `@kinetixui/ui`'s new runtime dependency on `@kinetixui/tokens`. The rest (`target.*`, `focus.offset`, `press.opacity`) are defined but not yet wired to a component — see `/docs/tokens`'s "Interaction tokens" section for why each one is or isn't, and what a follow-up slice would need. Web/tokens only in this slice; the native ports don't consume `interaction.*` yet.
