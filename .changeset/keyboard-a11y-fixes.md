---
"@kinetixui/ui": patch
---

Keyboard and screen-reader fixes found by a new keyboard/focus/RTL test suite: `Tour` now has an accessible name, moves focus into its card, traps Tab and restores focus on close; `MultiSelect` can be operated from the keyboard (focus goes to the search field on open and back to the combobox on close); `DataGrid` sortable headers and editable cells are reachable with Tab and operable with Enter / Space / F2 / Esc; `Slider` and `ColorPicker` put their accessible name on the thumb (the `role="slider"` element) instead of the root. `DataGrid` still has no arrow-key cell navigation.
