---
"@kinetixui/ui": minor
---

Add `MultiSelect` — a `Combobox` that keeps multiple `Tag` chips, with a `creatable` free-entry mode. Sixth pick from the `COMPONENT-ADDITIONS.md` Tier 2 backlog. Built directly on `Popover` + `Command` + `Tag` rather than staying a doc-only recipe like `Combobox`. The trigger is `role="combobox"` on a plain `div`, not a `<button>` — `Tag`'s own remove control is a real `<button>`, and a `<button>` can't nest inside a `<button>` (invalid HTML); using `PopoverAnchor` + manual open-state instead of `PopoverTrigger` avoids that while keeping the whole thing keyboard-operable.

Ships on all four platforms per the four-platform rule: `KinetixMultiSelect` on Jetpack Compose, SwiftUI, and Flutter too, each built directly on that platform's own anchored-popover primitive with its own `Input`/`Tag` components — no new text-entry or chip mechanism. Filtering is a plain substring check on every native platform (the web version's search is driven by `cmdk`'s own filtering, which has no native equivalent to lean on). SwiftUI's chip row scrolls horizontally rather than wrapping to multiple lines — SwiftUI has no built-in flow layout the way Compose's `FlowRow` or Flutter's `Wrap` are, a documented simplification, not a silent one.
