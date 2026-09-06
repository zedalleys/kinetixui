---
"@kinetixui/cli": patch
"@kinetixui/tokens": patch
"@kinetixui/ui": patch
---

Light-mode `--destructive` now resolves to `red.500` (`#c60a0a`) instead of the
Figma `error` value (`#ec5047`), which failed WCAG AA — 3.33:1 as destructive-
button text and 3.62:1 as `text-destructive` on the page. It now clears
5.6–6.1:1. Dark mode is unchanged.

Repository metadata (`repository` / `homepage` URLs) updated for the `zedalleys`
GitHub org.
