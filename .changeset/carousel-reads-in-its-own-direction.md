---
"@kinetixui/ui": patch
---

`Carousel` now runs in the reading direction, so a right-to-left carousel is laid out and keyed right to left.

The carousel passed its engine only `axis`, never `direction`. In a right-to-left document the track therefore still travelled left — measured in Chromium, the transforms in RTL were identical to LTR (`-336px` through `-1344px`) — so the first slide sat on the left, "Next" moved away from the reading direction, and ArrowLeft went back when it pointed at the next slide. `@kinetixui/angular`'s carousel had already documented the contract ("Horizontal slides run in the reading direction… ArrowLeft is Next") and React implemented none of it.

The carousel now resolves its own direction from the rendered element — the nearest `[dir]` first, then the computed direction, which is `@kinetixui/angular`'s `isRtl` rule for rule — and passes it to the engine, so in RTL the track travels toward positive x and slide 1 sits on the right. Arrow keys are mapped through the same resolved direction (Angular's `inlineKey`): ArrowLeft advances in RTL, ArrowRight in LTR, each read at the press. A `dir` flipped on an ancestor after mount re-lays the track out, which a language switcher needs and which no resize would otherwise trigger. A vertical carousel keeps the keys it already had, and a consumer's own `opts.direction` still wins.

**No API change.** Guarded by `scripts/react-carousel-direction.mjs` in a real browser, because which way a track travels is a layout question and jsdom performs no layout.
