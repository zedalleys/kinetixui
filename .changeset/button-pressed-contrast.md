---
"@kinetixui/ui": patch
---

Fix Button pressed-state contrast: Primary `active` is now `bg-primary/85` (was `/80`, 4.11:1 → 4.54:1) and Secondary `active` is solid `bg-secondary-foreground`, same as hover (was `/90`, 3.97:1). Both now clear WCAG AA. `check:contrast` gained alpha-aware pairs so a dimmed state can't regress below AA unnoticed.
