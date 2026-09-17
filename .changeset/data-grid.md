---
"@kinetixui/ui": minor
---

Add `DataGrid` — the "product on its own" the `COMPONENT-ADDITIONS.md` Tier 3 entry called for: a row-virtualized grid (the same fixed-row-height windowing `VirtualList` uses) with column resize, drag-to-reorder, left/right pin, single-column sort, and double-click-to-edit cells. `DataTable` stays the `@tanstack/react-table`-backed option for a plain sortable/paginated table; reach for `DataGrid` once the row count or column-manipulation needs outgrow it. Rendered as ARIA `grid`/`row`/`columnheader`/`gridcell` divs rather than a real `<table>`, since sticky pinned columns and a sticky header row need that flexibility. Deliberately out of scope: column *virtualization* (rare enough at typical column counts not to be worth it) and multi-column sort.

Ships on all four platforms. Column resize, drag-to-reorder, and column pin are web-only — none of Compose, SwiftUI, or Flutter have a touch-friendly drag-a-column-border gesture convention, and a sticky column needs a custom layout none of their scroll containers give for free. Native ports carry the three features that map directly onto each platform's own primitives instead: row virtualization (`LazyColumn`, a `LazyVStack` pinned-header `ScrollView`, `ListView.builder`), tap-to-sort headers, and tap-to-edit cells that commit on the keyboard's submit action rather than the web's blur-also-commits.
