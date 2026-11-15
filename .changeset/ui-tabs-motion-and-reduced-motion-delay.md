---
"@kinetixui/ui": minor
---

Selectable indicator motion on Tabs, and reduced motion now caps delays as well as durations.

`Tabs` gains a motion choice — classic, fluid or none — exported as `TABS_MOTION` and the `TabsMotion` type, with `TabsListProps` now public. Nothing is removed and the default behaviour is unchanged.

The shared Tailwind preset's `prefers-reduced-motion: reduce` floor capped `animation-duration` and `transition-duration` but said nothing about the delays, so a reader who asked for less motion waited the full delay for content others saw immediately — an animation with a 700ms delay still fired `animationend` at 719ms. The floor now zeroes `animation-delay` and `transition-delay` too, which brings that case down to 13ms. Normal-motion behaviour is untouched.
