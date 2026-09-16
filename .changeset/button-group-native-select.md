---
"@kinetixui/ui": minor
---

Add `ButtonGroup`/`ButtonGroupSeparator`/`ButtonGroupText` and `NativeSelect`/`NativeSelectOption`/`NativeSelectOptGroup` — the third and fourth picks from the "missing components" gap flagged in the infra/design-system audit against shadcn/ui's current matrix.

`ButtonGroup` visually joins a row or column of independent `Button`s into a connected, segmented-control-style cluster. Ships on all four platforms per the four-platform rule: `KinetixButtonGroup` family on Jetpack Compose, SwiftUI, and Flutter too (each with a documented simplification — no cross-child border/radius override mechanism on those platforms, so only the group's outer corners are squared).

`NativeSelect` is a styled wrapper around the browser's own `<select>`, for callers who want the OS-native picker instead of `Select`'s custom popover. This is a **standing non-port** (React/HTML only, alongside `Form`/`NavigationMenu`/`Combobox`): `Select` already wraps each native platform's own picker mechanism (Material3 `DropdownMenu`, SwiftUI `Menu`, Flutter `MenuAnchor`), so there's no further "more native" fallback to build there — see `/docs/contributing`.

`Item` (a fifth candidate from the same gap list) was evaluated and deliberately skipped: its API is functionally near-identical to the existing `List`/`ListItem` (leading/title/description/trailing/disabled/onSelect), and shipping both would just create API confusion.
