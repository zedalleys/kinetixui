---
"@kinetixui/ui": minor
---

`DataGrid` with `selectable` now scrolls while you drag-select. Hold the button at or past the top, bottom, left or right edge of the grid and it scrolls toward the pointer (faster the further out you go) and keeps extending the range; releasing stops it, and the last cell reached becomes the active one so Shift+arrows continue from it. The growable area excludes the sticky header and pinned columns. Horizontal auto-scroll is skipped under RTL. Nothing changes for grids without `selectable`.
