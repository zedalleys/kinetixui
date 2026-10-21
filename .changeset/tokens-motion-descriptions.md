---
"@kinetixui/tokens": patch
---

Motion token descriptions now name the tier each one is for, so a reader picking a duration or easing can tell which state change it belongs to. No token value changed: `--duration-*` and `--easing-*` carry exactly the numbers they carried in 0.24.0, and nothing is renamed or removed. The README's minimal usage also loads all four token sheets, including `css/extras`, which defines the focus ring the components draw in place of the browser outline.
