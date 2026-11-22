---
"@kinetixui/ui": minor
---

**Carousel: a reader reaches only the slides they can see, and hears where they are.**

Five accessibility repairs, each bringing React into line with a contract `@kinetixui/angular` has shipped
and documented since it was written. All five were measured as present on `main` before this change, so
none of them is a regression in the carousel work that precedes it.

- **Slides out of view are `inert`.** Previously Tab walked into every off-screen slide: with a link in
  each of five slides the tab order read `slide 1 → 2 → 3 → 4 → 5 → Previous → Next`, so a keyboard reader
  passed through four slides they could not see before reaching the buttons that would have shown them.
- **Focus follows the view.** Focus inside a slide that leaves the view moves to the first slide now in
  view, instead of being dropped to the page when the slide it was in became inert.
- **Each slide is named "N of M"**, unless the consumer names it.
- **A reader's own move is announced once**, politely, from a region scoped to the carousel — "Slide 2 of
  5", naming the SELECTED slide, as `@kinetixui/angular` already does. A carousel showing several slides at
  once names the selected one rather than the visible range: the range is not final until the engine's
  physics settle, about 1.7s after the slide has visibly arrived, so a range read at any particular moment
  is a different range. Initialization, a resize, a direction flip and an autoplay plugin's tick are all
  silent; a burst of presses or a flung drag announces once, naming where the track came to rest. A press
  that turns out to be a click rather than a drag, and a press against the endpoint of a non-looping
  carousel, announce nothing and leave nothing behind for a later movement to be mistaken for the
  reader's.
- **The region has an accessible name**, defaulting to "Slides" and deferring to a consumer's own
  `aria-label` or `aria-labelledby`. An unnamed `role="region"` is not exposed as a landmark at all, so the
  carousel could not be reached by landmark navigation.

**BREAKING for a vertical carousel's keys.** Arrow keys now follow the AXIS: `ArrowLeft`/`ArrowRight` on a
horizontal track (still resolved against the engine's direction, so RTL is unchanged), and
`ArrowUp`/`ArrowDown` on a vertical one. A vertical carousel previously answered the horizontal pair and
ignored the vertical pair — the exact inverse of Angular. A consumer who drove a vertical carousel with
`ArrowLeft`/`ArrowRight` must move to `ArrowUp`/`ArrowDown`; nothing else changes, and `onKeyDown` is still
composed first, so a consumer who handled those keys themselves is unaffected.

No other public API changes. `CarouselItem` now renders `tabIndex={-1}`, `aria-label` and (when out of view)
`inert`; a consumer's own `aria-label` still wins, and `tabIndex={-1}` adds no tab stop.
