---
"@kinetixui/ui": patch
---

Document every component's React API on its docs page.

Component pages ended at `import { DataGrid } from "@kinetixui/ui"` and a
paragraph about tokens. For a Badge that is enough; for a 792-line grid with
column pinning, range selection and edit-in-place it is not, and "lifecycle
stable" is meant to mean a reader can use the component without opening its
source.

Each page now renders its props — name, type, required, and the description from
the source — from `specs/components/*.json`, which is generated from the
TypeScript, so the table cannot drift from the props the component accepts.

The table is headed **React API** and says so in as many words. SwiftUI, Jetpack
Compose, Flutter and Angular share the design contract — the same variants,
sizes, states and tokens — but each exposes its own idiomatic interface; their
real usage stays in the platform tabs on the example above.
