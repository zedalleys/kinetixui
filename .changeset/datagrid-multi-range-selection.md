---
"@kinetixui/ui": minor
---

`DataGrid` `selectable` now supports drag-select and separate ranges. Drag across cells to select a rectangle; Ctrl/Cmd+click (or Ctrl+Space from the keyboard) keeps the current range and starts another, Shift+click / Shift+arrows extend the newest one, and Ctrl/Cmd+C copies every range as tab-separated text with a blank line between them. `onSelectionChange` now also reports `ranges` (all of them; `rows` / `columns` still describe the newest). `DataGridSelection` and the new `DataGridRange` type are exported from the package.
