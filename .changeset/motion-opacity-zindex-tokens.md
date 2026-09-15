---
"@kinetixui/tokens": minor
"@kinetixui/ui": minor
---

Add three new DTCG token primitives — `duration`/`easing` (motion), `opacity`, and `z-index` — grounded in the values already hardcoded across the component library (`duration-200/300/500/1000`, `ease-linear`/`ease-in-out`, `opacity-0/50/70/100`, `z-[1]/z-10/z-20/z-40/z-50`), rather than invented from scratch. Compiled to `--duration-*`/`--easing-*`/`--opacity-*`/`--z-index-*` CSS custom properties, `KinetixMotion.swift`/`.kt`/`.dart` on the three native platforms, and new `packages/ui`'s `tailwind.config.ts` utilities (`duration-fast`, `ease-standard`, `opacity-disabled`, `z-overlay`, etc.) that every component that previously hardcoded these values now uses directly.

A handful of pre-existing values that don't cleanly match a token step (`disabled:opacity-40` in `AudioPlayer`, `opacity-60` in `DropdownMenu`/`Select`, the `Calendar` nav buttons' resting `opacity-50`) are left as literals with a comment rather than silently normalized to the nearest token — that's a design call for later, not a rename.
