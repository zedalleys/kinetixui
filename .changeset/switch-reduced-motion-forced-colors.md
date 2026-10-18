---
"@kinetixui/ui": patch
---

Switch: carry its own reduced-motion form (`motion-reduce:transition-none`) so a registry install, which has no preset floor, no longer slides the thumb for a reduced-motion reader; and draw the thumb in `CanvasText` (`GrayText` when disabled) under forced colours, where it used to vanish into its track so on and off looked the same. Timing is unchanged: the thumb, track and halo stay on `instant` (100ms, `selection-control`).
