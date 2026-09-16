---
"@kinetixui/ui": minor
---

Add `NotificationCenter`/`NotificationCenterTrigger`/`NotificationCenterContent`/`NotificationItem` — a bell trigger opening a popover list of read/unread items with a "mark all read" action. Fourth pick from the `COMPONENT-ADDITIONS.md` Tier 2 backlog. Built directly on `Popover` (re-exported as the root) rather than a new open-state mechanism; `NotificationItem` follows `ListItem`'s interactive-row convention. Read-state (`unread`/`unreadCount`/`onMarkAllRead`) stays the caller's, the same as every other controlled component in this library.

Ships on all four platforms per the four-platform rule: `KinetixNotificationCenter` family on Jetpack Compose, SwiftUI, and Flutter too, each built on that platform's own anchored-popover primitive (`KinetixDropdownMenu`, `.popover`, `KinetixPopover`/`MenuAnchor`) rather than a hand-rolled overlay.
