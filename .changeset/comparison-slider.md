---
"@kinetixui/ui": minor
---

Add `ComparisonSlider` — a drag handle wiping between two stacked layers (before/after image, a redesign preview). Second pick from the `COMPONENT-ADDITIONS.md` Tier 2 backlog. Built on Radix's `Slider` for the drag/keyboard/ARIA behavior (a plain 0–100 value), but fully custom-drawn — Radix's own `Range` fill can't be reused as the divider line since it's Radix's own inline `width` style, which would win over any Tailwind width class, so the line is a separate element positioned from the same value instead.

Ships on all four platforms per the four-platform rule: `KinetixComparisonSlider` on Jetpack Compose, SwiftUI, and Flutter too, each using the same "duplicate the layers, clip one of them from the handle position" technique the web's CSS `clip-path` uses. The Compose and SwiftUI ports only support dragging the handle itself, not clicking anywhere on the track to jump (the web's Radix `Slider` supports both) — a documented scope-down, not a silent gap; Flutter's plain `GestureDetector` gets both for free.
