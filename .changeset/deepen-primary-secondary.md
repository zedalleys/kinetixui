---
"@kinetixui/cli": patch
"@kinetixui/tokens": patch
"@kinetixui/ui": patch
---

**Light `--primary` / `--secondary` deepened one ramp step for contrast** — same
navy and sage hues, no hue shift:

- `--primary`, `--ring`, `--accent-foreground`, `--sidebar-primary`,
  `--sidebar-accent-foreground`, `--sidebar-ring`: `blue.500` → `blue.600`
  (`#1b3c53` → `#163042`). `--primary` on the background goes 11.55:1 → 13.68:1;
  `--primary-foreground` on `--primary` 10.70:1 → 12.67:1.
- `--secondary`: `green.50` → `green.100` (`#f1f3f1` → `#e3e7e3`) so the surface
  actually reads as a control against the page.
- `--secondary-foreground`: `green.600` → `green.700` (`#5d6d5c` → `#465245`) —
  the marginal 4.95:1 pair now clears ~6.6:1.
- `shadow.focus` re-baked from `#1b3c53` to `#163042` to match the new `--ring`.

Dark theme is unchanged. Native token sets (SwiftUI / Compose / Flutter) and the
CLI registry `tokens` style are regenerated to match.
