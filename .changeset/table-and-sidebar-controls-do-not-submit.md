---
"@kinetixui/ui": patch
---

`DataTable`'s pagination controls and `SidebarTrigger` no longer submit a form they are rendered inside.
`Button` renders a native button and sets no `type`, which makes it a submit button, so paging a table of
editable rows inside a form submitted the form, as did opening the sidebar. Both now set `type="button"`
before the props spread, so a consumer who wants another type can still pass one. Measured at one
submission per press before the change, none after; `Modal`'s footer buttons and `NotificationCenter`'s
trigger were checked in the same sweep and were already safe.
