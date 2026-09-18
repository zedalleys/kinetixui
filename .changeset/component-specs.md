---
"@kinetixui/cli": minor
---

`kinetixui inspect <name>` now also prints a component's variant axes and their option names (e.g. `variant`: `Primary`/`Secondary`/`Outline`/…, `size`: `sm`/`md`/`lg`/…) for the ~20 components with a real variant matrix, sourced from a new generated `specs/components/<name>.json` contract manifest served alongside the registry.
