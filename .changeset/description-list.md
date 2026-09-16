---
"@kinetixui/ui": minor
---

Add `DescriptionList`/`DescriptionListItem` — `<dl>` term/detail rows with the site's own spec-sheet skin (mono, uppercase, tracked term labels; a divided rounded shell). Third pick from the `COMPONENT-ADDITIONS.md` Tier 1 backlog — lifted out of two hand-rolled call sites (`ComponentMeta`'s doc-page spec strip and the homepage's "spec" card) into a reusable component; those two call sites were left as-is rather than migrated, which is out of scope here.

`layout="row"` (default, term and value side by side) or `layout="stacked"` (value below a full-width term, for longer values); `showDivider` on each item. Ships on all four platforms per the four-platform rule: `KinetixDescriptionList`/`KinetixDescriptionListItem` on Jetpack Compose, SwiftUI, and Flutter too — each draws its own bottom divider per item rather than a shared `divide-y`, the same documented simplification already established for `List`/`ListItem`.
