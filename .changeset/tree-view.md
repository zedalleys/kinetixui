---
"@kinetixui/ui": minor
---

Add `TreeView`/`TreeItem` — nested expand/collapse rows with keyboard roving tabindex and optional checkboxes. Fifth pick from the `COMPONENT-ADDITIONS.md` Tier 2 backlog. Hand-rolled (Radix has no tree primitive to build on): `role="treeitem"` sits on each item's own container rather than a separate "row" element, so a nested item's `closest('[role="treeitem"]')` correctly walks up to its real ancestor; visible items are queried live from the DOM on every arrow-key press, since collapsed subtrees simply don't render — no separate registration bookkeeping needed to stay in sync with expand/collapse state. `checkable` checkboxes are independent per item — no automatic parent-selects-all-children / indeterminate propagation, a documented simplification, not a silent one.

Ships on all four platforms per the four-platform rule: `KinetixTreeView`/`KinetixTreeNode` on Jetpack Compose, SwiftUI, and Flutter too — data-driven (a plain tree of nodes) rather than the React composition API, since recursion over a data structure is far simpler than threading state through arbitrarily-nested children on those platforms. The native ports are tap-to-expand/select only; the web version's keyboard roving-tabindex arrow-key navigation isn't ported, a documented scope-down since touch is the primary interaction model there.
