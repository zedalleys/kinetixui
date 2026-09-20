---
"@kinetixui/ui": minor
---

`DataGrid` `selectable` can now select whole columns and rows. Ctrl/Cmd+click a column header (or press Ctrl+Space on it) to select the column and keep any other ranges; Shift+click a second header to extend across columns. A plain header click still sorts. Shift+Space on a cell selects its row. Fully selected columns set `aria-selected` on their `columnheader` and pick up the accent fill. Nothing changes for grids without `selectable`; `onSelectionChange` reports these like any other range.
