---
"@kinetixui/tokens": patch
---

Light `--shadow-focus-warning` now uses `amber.800` (`#7f5b21`, 5.8:1) instead of the old Figma orange `#f97907` (2.70:1), which failed WCAG 1.4.11 as a focus indicator. It matches the light `--warning` colour. `check:contrast` now checks the edge of every `--shadow-focus*` ring against the page in both themes, so a regression fails CI.
