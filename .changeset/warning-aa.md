---
"@kinetixui/cli": patch
"@kinetixui/tokens": patch
"@kinetixui/ui": patch
---

Light-mode `--warning` moved from the Figma `onWarningContainer` orange
(`#f97907`) to `amber.800` (`#7f5b21`). The orange was **2.7:1** as `text-warning`
on the page and **2.6:1** in the `Tag` warning variant — both fail WCAG AA; the
dark-amber clears 5.8–6.1:1. Dark-mode `--warning` is unchanged (bright
`amber.400`). `check:contrast` now enforces every warning pair with no
allow-list.
