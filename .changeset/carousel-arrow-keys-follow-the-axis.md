---
"@kinetixui/ui": minor
---

**Carousel: arrow keys follow the axis — BREAKING for a vertical carousel.**

`ArrowLeft`/`ArrowRight` drive a horizontal track, still resolved against the engine's direction so
right-to-left is unchanged, and `ArrowUp`/`ArrowDown` drive a vertical one. A vertical carousel
previously answered the horizontal pair and ignored the vertical pair — the exact inverse of
`@kinetixui/angular`, which has shipped the block pair and documented it since it was written
(`packages/ui-angular/src/lib/carousel.ts:68,352`).

**What a consumer must do.** If you drive a vertical carousel with `ArrowLeft`/`ArrowRight`, move to
`ArrowUp`/`ArrowDown`. Nothing else changes: `onKeyDown` is still composed first, so a consumer who
handled those keys themselves is unaffected; a modifier chord (Alt/Ctrl/Meta+Arrow) still belongs to
the browser on both axes; and a key a nested control has already handled is still not claimed, so a
text field inside a slide keeps its caret keys.

A vertical carousel's keys do not depend on the document's direction. The block axis has no
direction to resolve — this carousel does not vary `writing-mode`, and a vertical track runs top to
bottom — so `ArrowDown` is forward whatever `dir` says.

**No existing test covered the vertical inline keys** before the browser harness this is stacked on:
the suite passed both before and after the key change in isolation, so the behaviour this replaces
was invisible to the tests that were supposed to protect it.
