---
"@kinetixui/cli": minor
---

Add `kinetixui lint [path]` — scans for hardcoded hex colors and arbitrary spacing values in Tailwind utilities and inline styles that should probably be semantic tokens instead. With no path, scans the `components`/`ui` aliases from `kinetixui.json`. Reports `file:line` with a suggestion, skips comments, and is anchored to real Tailwind/style contexts so it doesn't fire on unrelated `#`-prefixed strings (anchor links, URL fragments). Exits non-zero on any hit unless `--no-fail` is passed, so it's CI-safe. Doesn't cover unknown/deprecated tokens, accessibility, or cross-platform inconsistencies yet — each needs infrastructure this doesn't have (a live token list, a real a11y engine, or doesn't apply to a single-platform project).
