---
"@kinetixui/cli": minor
"@kinetixui/tokens": minor
"@kinetixui/ui": minor
---

**New `azure` primitive ramp + `--primary` is an action blue, set independently
per theme.** The desaturated navy (`Primay` from Figma) read as near-black once
pushed for contrast, so `--primary` is now a real blue that pops as a button/link
colour. A new `color.azure` ramp (15 steps, Tailwind-blue-derived) backs it;
light and dark map to different steps — two palettes, not one flipped:

- light `--primary` / `--ring` / `--accent-foreground` / `--sidebar-primary` /
  `--sidebar-accent-foreground` / `--sidebar-ring` → `azure.700` `#1d4ed8`
  (6.7:1 on the background, 6.2:1 under `--primary-foreground`).
- dark `--primary` / `--ring` / `--sidebar-primary` / `--sidebar-ring` →
  `azure.400` `#60a5fa` (`#1d4ed8` would be ~2.9:1 on the near-black dark
  surface; `#60a5fa` clears 7.7:1).
- `shadow.focus` re-baked per theme (`#1d4ed8` light, `#60a5fa` dark).

**`--secondary` deepened** `green.50` → `green.200` (`#f1f3f1` → `#c7cfc7`) so a
secondary button/chip actually stands off the white page; `--secondary-foreground`
`green.600` → `green.700` (`#465245`), 5.2:1 on the new surface.

`--chart-1` stays navy (`blue.500`) — the data-viz ramp is tuned for categorical
separation, not brand. `check:contrast` passes AA in both themes. Native token
sets (SwiftUI / Compose / Flutter) and the CLI registry `tokens` style are
regenerated.
