---
"@kinetixui/ui": patch
---

Overlays now open with the direction of the section that opened them.

`KinetixDirectionProvider` used to direct only what rendered inside it. Overlays portal to `<body>`, so a
Dialog, Sheet, Popover or Tooltip opened from an RTL section inherited `<html dir>` instead and rendered LTR
(Select, DropdownMenu and Menubar were already right, because Radix stamps `dir` on them). The provider now
also owns a `<div dir>` under `<body>`, and every overlay in the library portals into it: Dialog, AlertDialog,
Modal, Sheet, Drawer, Popover, Tooltip, DatePicker, MultiSelect, Select, DropdownMenu, ContextMenu, Menubar
and Tour. Nothing changes without a provider, or when direction is set only on `<html>`: overlays still portal
to `<body>` and inherit it. Nested providers work, the nearest one wins, and an explicit `container` on a
portal still wins over both.

New: `useKinetixPortalContainer()` returns the host, for a custom portal that should follow the same rule.

The documentation site's preview direction control relied on a workaround for this: it wrote `<html dir>`,
mirroring the whole site from one demo. It is now scoped to the preview.
