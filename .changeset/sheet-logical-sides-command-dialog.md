---
"@kinetixui/ui": patch
---

Sheet: add `side="start"` and `side="end"`, which follow the reading direction, scroll side panels whose content is taller than the viewport, and add `closeLabel` to name the built-in close button. CommandDialog: add a `title` (the dialog was unnamed), an optional `description`, a `trigger` so focus returns to the opener on close, and `commandProps` for the inner Command; anchor it near the top so filtering no longer moves the search field. Export the `CommandProps` type.
