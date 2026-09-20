---
"@kinetixui/ui": minor
---

`DataGrid` gains opt-in range selection: pass `selectable` (and optionally `onSelectionChange`) and Shift+arrows or Shift+click extend a rectangle of cells from the anchor, Ctrl/Cmd+A selects everything, Ctrl/Cmd+C copies the range as tab-separated text (each column's `value()`), and Esc clears it. The grid gets `aria-multiselectable` and every cell `aria-selected`, and the count is announced. Off by default, so existing grids are unchanged. Re-sorting or changing the row count clears the selection; disjoint (Ctrl+click) selection and drag-select are not included.
