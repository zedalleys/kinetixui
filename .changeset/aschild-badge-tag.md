---
"@kinetixui/ui": minor
---

Add `asChild` support to `Badge` and `Tag`, so both can render as a single wrapped element (e.g. `<Badge asChild><a href="/new">New</a></Badge>`) instead of always forcing a `<div>`/`<span>`. `Toggle` and `ToggleGroup` already supported `asChild` transparently via their underlying Radix primitives — no change needed there, just confirming for the record.

`Tag`'s `onRemove` dismiss button still works with `asChild`: it nests inside the slotted element (Radix `Slot` can only render one root node). Avoid pairing `asChild` + `onRemove` with an `<a>` child specifically, since a nested `<button>` inside an anchor is invalid HTML.
