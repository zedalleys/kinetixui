---
"@kinetixui/ui": minor
---

Add `SegmentedControl`/`SegmentedControlItem` — an iOS-style single-select strip. Fifth pick from the `COMPONENT-ADDITIONS.md` Tier 1 backlog. Functionally `ToggleGroup type="single"`: a thin, documented preset over the same Radix primitive (`type="single"` is fixed, not exposed) with `Tabs`' visual treatment — a filled `bg-muted` track and a raised, shadowed active segment — instead of `Toggle`'s individually-outlined-button look.

Ships on all four platforms per the four-platform rule: `KinetixSegmentedControl`/`KinetixSegmentedControlItem` on Jetpack Compose, SwiftUI, and Flutter too, reusing each platform's existing `Tabs` visual treatment and its stateless, caller-owns-the-selected-value shape (no context to thread a shared value through the way Radix's `ToggleGroup` does).
