---
"@kinetixui/angular": patch
---

README: the minimal-usage stylesheet now loads all four token sheets. It omitted `@kinetixui/tokens/css/extras`, which defines `--shadow-focus`, so a button had no focus ring once `.kx-btn:focus-visible` removed the outline; and it omitted `css/extras/dark`, so the dark focus ring used the light composite. No code change.
