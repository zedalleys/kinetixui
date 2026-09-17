---
"@kinetixui/ui": minor
---

Add `KanbanBoard` — draggable cards across columns with keyboard DnD, built on `@dnd-kit`'s "multiple containers" sortable pattern. No DnD primitive existed in this package at all; hand-rolling accessible pointer/touch/keyboard drag-and-drop with collision detection and live reordering from scratch would take far longer than this component's own logic and likely be worse than a battle-tested library, so `@dnd-kit` is a new dependency.

Uses a custom collision detection strategy (`pointerWithin` → `rectIntersection` fallback, re-scoped to `closestCenter` against just the hovered column's cards when the initial hit is the column itself) — this is dnd-kit's own documented fix for a specific multi-container gotcha: each column is both a `useDroppable` (so an empty column, or the space below its last card, is still a valid drop target) and wraps a `SortableContext`, and a column's rect is a strict superset of its cards' rects, so plain `closestCorners`/`closestCenter` alone almost always reports the column itself as the collision and item-level reordering never fires.

A **seventh standing non-port** (documented at `/docs/contributing`): no equivalent dependency exists in the native packages, and hand-rolling accessible drag-and-drop from scratch on three more platforms is a far bigger lift than porting the component's own logic. Each platform reaches for its own idiomatic drag primitive instead (Compose drag gestures, SwiftUI `.draggable`/`.dropDestination`, Flutter `Draggable`/`DragTarget`).
