---
"@kinetixui/ui": minor
---

Add `Timeline` — ordered events down a rail (dot, connector, time, content). Sixth pick from the `COMPONENT-ADDITIONS.md` Tier 1 backlog, the first of the two remaining M-effort items. `alternating` lays content left/right of a centered rail (desktop); the default is a single left-aligned rail. Same rail/dot/connector technique as `Stepper`, but for a history/activity log rather than a progress indicator — an array of arbitrary events instead of complete/current/upcoming states.

Ships on all four platforms per the four-platform rule: `KinetixTimeline` on Jetpack Compose, SwiftUI, and Flutter too. Compose/SwiftUI reuse `Stepper`'s documented connector simplification (a fixed minimum height instead of React's dynamic `flex-1` stretch — neither platform has a cheap equivalent without a custom layout); Flutter's `IntrinsicHeight` + `Expanded` gets a genuine dynamic-stretch connector, matching the web exactly.
