---
"@kinetixui/ui": minor
"@kinetixui/angular": patch
---

Icon contract: a replaceable dismiss icon and correct direction.

`Banner` and `Inform` take a `dismissIcon` (any `ReactNode`). The button keeps its "Dismiss" name and sizes the icon to 14px, so your own icon needs neither. Leaving it out keeps lucide's `X`.

Directional icons now turn around in right-to-left layouts: `NavigationBar`'s back chevron, `Pagination`'s previous and next, the `Breadcrumb` separator, and the collapsed `TreeView` and `JsonViewer` chevrons. An expanded disclosure only rotates, and close, check and accordion icons do not mirror.

`@kinetixui/angular`: an icon projected into `[kxDismissIcon]` or `[kxCopyIcon]` is now sized by the slot. Before, a projected `<svg>` with no width rendered at the browser default of 300x150.
