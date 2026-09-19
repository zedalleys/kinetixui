---
"@kinetixui/tokens": minor
"@kinetixui/ui": minor
"@kinetixui/cli": minor
---

Add role tokens on top of `primary`: `action` (+ `action-foreground`), `link`, `focus` and `brand` (+ `brand-foreground`), plus explicit `action-hover` / `action-pressed` for the native ports. `action`, `link` and `focus` default to `primary` / `ring` as live `var()` references in both themes, so an existing theme that only sets `--primary` keeps working, while `--action` can now be overridden on its own to split the interactive colour from `primary`. Components now read the role tokens (`bg-action`, `text-link`) instead of `primary` — no visual change with the default theme — and `Fab` no longer uses a hard-coded blue hover that inverted in dark mode. `kinetixui theme create/build` and the web theme-builder accept the new tokens (optional overrides). SwiftUI, Compose and Flutter get `action`, `actionHover`, `actionPressed`, `brand`, `link` and `focus` colours in their compiled tokens. **Upgrade note:** components using `bg-action` / `text-link` need the matching `@kinetixui/ui/tailwind.config` preset, so update the package when re-adding components.
