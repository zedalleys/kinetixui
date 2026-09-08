# @kinetixui/tokens

## 0.5.1

## 0.5.0

### Minor Changes

- 3e0dc4b: **New `azure` primitive ramp + `--primary` is an action blue, set independently
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

## 0.4.3

### Patch Changes

- 196d4b0: **`--chart-6`, `--chart-7`, `--chart-8`** added to the token contract (light +
  dark, plus the `chart.6/7/8` Tailwind colours) so stacked / categorical charts
  with more than five series stay distinguishable.
  
  **`ChartContainer`** gains `state` (`"loading" | "empty" | "error"` — renders a
  shimmer / message / alert placeholder), `stateMessage`, and `srTable` (a
  visually-hidden `<table>` of the underlying numbers for screen readers).

## 0.4.2

### Patch Changes

- 7ad6a21: **Chart text alternative.** `ChartContainer` now renders `role="img"` with an
  `aria-label` — pass `label` with a one-line summary of what the chart shows
  (WCAG 1.1.1); it falls back to `"Chart"`. Cartesian recipes already pass
  `accessibilityLayer` for keyboard data-point navigation.
- 32779bc: `ChartContainer` now scrubs two redundant Recharts a11y artefacts from its
  rendered output: the `role="img"` (no `<title>`) that Recharts stamps on every
  sector / dot `<path>` — noise, since the container already carries the text
  alternative — and the unnamed `<svg role="application">` its
  `accessibilityLayer` leaves behind, which now gets the container's label. Clears
  axe `svg-img-alt` on chart pages.
- f44e7a2: **Dark-mode focus ring.** The `--shadow-focus{,-destructive,-success,-warning}`
  composites now carry a real dark set built from the dark `--ring` / semantic
  primitives (`tokens/semantic/shadow.dark.json`). Previously they baked a
  light-theme navy that measured ~1.7:1 against the dark surface — below WCAG 2.2
  SC 1.4.11 (3:1); it now clears 8.8:1. New export
  `@kinetixui/tokens/css/extras/dark` (also bundled into
  `registry/kinetixui/globals.css`); add its `@import` after
  `@kinetixui/tokens/css/extras`.
  
  **NumberInput** — the −/+ stepper buttons now draw a `--ring` inset outline on
  `:focus-visible` so keyboard users can tell which control is focused (they
  previously showed only a container-level ring).
- 183abbf: Light-mode `--warning` moved from the Figma `onWarningContainer` orange
  (`#f97907`) to `amber.800` (`#7f5b21`). The orange was **2.7:1** as `text-warning`
  on the page and **2.6:1** in the `Tag` warning variant — both fail WCAG AA; the
  dark-amber clears 5.8–6.1:1. Dark-mode `--warning` is unchanged (bright
  `amber.400`). `check:contrast` now enforces every warning pair with no
  allow-list.

## 0.4.1

### Patch Changes

- 1fc0e08: Light-mode `--destructive` now resolves to `red.500` (`#c60a0a`) instead of the
  Figma `error` value (`#ec5047`), which failed WCAG AA — 3.33:1 as destructive-
  button text and 3.62:1 as `text-destructive` on the page. It now clears
  5.6–6.1:1. Dark mode is unchanged.
  
  Repository metadata (`repository` / `homepage` URLs) updated for the `zedalleys`
  GitHub org.

## 0.4.0

### Minor Changes

- a2e5706: Token engine now emits additive **SwiftUI-`Color`**
  (`KinetixColorsSwiftUI` / `KinetixColorsSwiftUIDark`) and
  **Flutter-`Color`** (`KinetixColorScheme` / `KinetixColorSchemeDark`)
  semantic colour sets, on **both** the light and dark passes — the real
  dark values the `packages/ui-swiftui` and `packages/ui-flutter`
  `KinetixTheme`s need. The `--chart-1…5` palette is included.
  
  Purely additive: the existing `KinetixColors.swift` / `Theme.swift`
  (UIColor) and `app_theme.dart` / `app_colors.dart` outputs are
  byte-identical and untouched — a rename would collide with the native
  libraries' own `KinetixTheme` / `KinetixColors` types.
  
  `@kinetixui/cli` and `@kinetixui/ui` version alongside (fixed group);
  there is no change to the CLI or the React components.

## 0.3.1

## 0.1.0

### Minor Changes

- 1a727a7: First public release.
  
  - **@kinetixui/tokens** — the KinetixUI token contract: `--*` CSS variables
    (light + dark), `--shadow-*` / `--text-*` composites, a typed `tokens` object,
    and native text styles (`KinetixType.swift`, `KinetixType.kt`, `app_text.dart`).
  - **@kinetixui/ui** — 56 React components on the token contract (CVA + Radix +
    Tailwind), plus the `tailwind.config` preset. Also installable via the shadcn
    registry at `kinetixui.com/r/*.json`.
