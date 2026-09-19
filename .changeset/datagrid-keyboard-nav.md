---
"@kinetixui/ui": minor
---

`DataGrid` now follows the ARIA grid keyboard pattern. The grid is a single tab stop with roving focus: arrow keys move between cells (the header row included, mirrored under RTL), `Home` / `End` go to the row ends and `Ctrl`+`Home` / `Ctrl`+`End` to the grid corners, `PageUp` / `PageDown` move by a page, and focus scrolls virtualized rows into view. Column reorder and resize now work from the keyboard (`Alt`+`←/→` and `Shift`+`←/→` on a header, announced in a live region), and rows and cells carry `aria-rowindex` / `aria-colindex` with `aria-rowcount` / `aria-colcount` so screen readers report the right position in a virtualized grid. Behaviour change: every editable cell and sortable header used to be its own tab stop; the grid is now one tab stop.
