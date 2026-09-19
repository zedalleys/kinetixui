---
"@kinetixui/cli": minor
---

`kinetixui inspect <name>` now shows a component's first release and status, its parts (the component and its sub-components) with the props each declares itself, and skips the empty "Variants" header for components with no variant matrix. Backed by component specs, which now exist for every component (previously only the 18 that define a `cva()` variant matrix) and are extracted from the TypeScript types.
