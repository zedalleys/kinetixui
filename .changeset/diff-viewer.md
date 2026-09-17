---
"@kinetixui/ui": minor
---

Add `DiffViewer` — a side-by-side (`split`) or inline (`unified`) text diff with gutter line numbers, over a hand-rolled LCS line diff. Fifth pick from the `COMPONENT-ADDITIONS.md` Tier 3 backlog, closing it out. Not built on a diff package: the algorithm needs to behave identically across all four platforms, and a ~30-line DP table is easier to keep in lockstep across React/Compose/SwiftUI/Flutter than four bindings to (or ports of) someone else's diff library. `split` mode doesn't pair adjacent remove/add runs onto the same row the way GitHub's split view does — each op renders in its own column, blank on the other side, a documented simplification over that extra alignment heuristic.

Ships on all four platforms with the same feature set and the same LCS algorithm.
