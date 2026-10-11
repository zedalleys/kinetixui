---
"@kinetixui/angular": minor
---

Add the listboxes: `kx-select` (with `kxSelectTrigger`, `kx-select-value`, `kx-select-content`, `kx-select-item`, `kx-select-group`, `kx-select-label`, `kx-select-separator`), `kx-command` (with `kxCommandInput`, `kx-command-list`, `kx-command-empty`, `kx-command-group`, `kx-command-item`, `kx-command-separator`, `kx-command-shortcut`, and `kx-command-dialog`) and `kx-multi-select`. All three keep focus on the field and move `aria-activedescendant`, never onto a disabled or filtered-out option; select and multi-select are form controls. Command filters locally and sends its query nowhere. Combobox is documented as a recipe (a popover holding a command), not a component. Angular stays Preview.
