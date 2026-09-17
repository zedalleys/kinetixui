---
"@kinetixui/ui": minor
---

Add `VirtualList` — a windowed-rendering primitive: only the rows visible in the scroll viewport (plus `overscan`) actually mount, so a list of thousands of items costs the same as rendering a couple dozen. Second pick from the `COMPONENT-ADDITIONS.md` Tier 3 backlog, and a prerequisite for a future `DataGrid` or any `Command`/`Combobox`/`Select` with a large option list. Web is fixed-row-height only — variable-height virtualization needs a per-row measurement pass, out of scope for this primitive (that's `@tanstack/react-virtual`'s job).

Ships on all four platforms with no fixed-height limitation on native: Compose's `LazyColumn`, SwiftUI's `List`, and Flutter's `ListView.builder` each already only build the rows near the viewport, so these ports just wrap the platform's own windowing rather than porting the web's scrollTop/ResizeObserver math.
