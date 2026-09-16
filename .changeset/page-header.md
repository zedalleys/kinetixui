---
"@kinetixui/ui": minor
---

Add `PageHeader` — title + optional breadcrumb + description + action cluster + optional tabs row, closed off with a bottom border. Third pick from the `COMPONENT-ADDITIONS.md` Tier 2 backlog, and the last S-effort item on it. `breadcrumb`/`actions`/`tabs` are plain slots — `PageHeader` doesn't re-implement `Breadcrumb`, `Button`, or `Tabs`, callers compose their own into it.

Ships on all four platforms per the four-platform rule: `KinetixPageHeader` on Jetpack Compose, SwiftUI, and Flutter too, each with the same plain-slot shape and closed off with the platform's own `Separator`.
