# KinetixUI token engine — design source → code mapping

Source of truth: the KinetixUI design file in Figma, node `3877-10388`
(file `GQXTKKJAPbawd4wcuE77Pf`). Extracted via Figma MCP `get_variable_defs` +
`get_design_context`. Compiled by Style Dictionary v4 (`style-dictionary/build.mjs`).

## Layers

| Layer | File | Origin |
|---|---|---|
| Shadows | `tokens/semantic/shadow.json` | `--shadow-sm/md/lg/xl` + `--shadow-focus*` (focus ring as colour glow) → `extras.css` |
| Text styles | `tokens/semantic/typography.json` | composites → `--text-<style>` (web) + `KinetixType.swift` / `KinetixType.kt` / `app_text.dart` (native `TextStyle`) |
| Primitives — 7 brand ramps + neutral | `tokens/primitives/color.json` | 6 from the Figma *Brand Colors* frame (step labels `0…10` remapped to a `0–1000` integer scale) + a synthesized `azure` action-blue ramp (Tailwind-blue-derived) added for the interactive tokens |
| Primitives — spacing / radius | `tokens/primitives/dimension.json` | Figma `spacing/*`, `Small`/`Button`/`Popup`/`Full` |
| Primitives — type | `tokens/primitives/typography.json` | Figma `fontSize/*`, `lineHeight/*` (Material 3 scale) |
| Semantic — light | `tokens/semantic/color.light.json` | aliases to primitives, named to the **semantic token** contract |
| Semantic — dark | `tokens/semantic/color.dark.json` | **synthesized** (no dark mode in Figma) |
| Semantic — text styles | `tokens/semantic/typography.json` | Figma composite text styles |

## Semantic variable → Figma variable (light theme)

Values are the **current resolved** hex. Several roles diverge from their Figma
origin for WCAG AA — the "notes" column says why. Dark is a fully independent
palette (`color.dark.json`), not a flip of these. The live table on
`/docs/theming` and `apps/web/src/lib/token-contract.ts` mirror this.

| variable `--var` | value | Figma origin | notes |
|---|---|---|---|
| `--background` | `#ffffff` | `surfaceContainerLowest` | |
| `--foreground` | `#050c11` | `onSurface` | |
| `--primary` | `#1d4ed8` | *(was `Primay`, sic — navy `#1b3c53`)* | swapped for an `azure` action blue; the navy read near-black once pushed for contrast. Dark `--primary` = `#60a5fa` (`azure.400`). |
| `--primary-foreground` | `#f0f7ff` | `On Primary` | |
| `--secondary` | `#c7cfc7` | `secondaryContainer` *(was `#f1f3f1`)* | our "secondary" == Figma *container* role; deepened `green.50` → `green.200` so a secondary control reads against the page |
| `--secondary-foreground` | `#465245` | `onSecondaryContainer` *(was `#748873`)* | `green.700`, 5.2:1 on the deepened surface |
| `--muted` | `#f6f6f6` | `surfaceContainer` | |
| `--muted-foreground` | `#6d6d6d` | `onSurfaceVariant` | |
| `--accent` | `#f0f7ff` | `LightBlue` | the hover fill used by Outline/Ghost buttons |
| `--accent-foreground` | `#1d4ed8` | — | **synth** = `primary` |
| `--destructive` | `#c60a0a` | *(Figma `error` `#ec5047` fails AA — 3.3:1)* | `red.500`, clears 5.6–6.1:1 (since 0.4.1) |
| `--destructive-foreground` | `#fef3f2` | `onError` | |
| `--warning` | `#7f5b21` | *(Figma `onWarningContainer` `#f97907` fails AA — 2.6:1)* | `amber.800`, clears 5.8–6.1:1 (since 0.4.2); dark stays bright `amber.400` |
| `--border` / `--input` | `#92b2c8` | `outline` | |
| `--ring` | `#1d4ed8` | — | tracks `--primary`; focus ring drawn via `--shadow-focus` (re-baked per theme) |
| `--radius` | `8px` | `Button` | |

## Synthesized (not in Figma)

| Token | Value | Rationale |
|---|---|---|
| `color.azure.*` ramp | Tailwind-blue-derived, 15 steps | Figma has no bright interactive blue; backs `--primary` / `--ring` / `--accent-foreground` (`azure.700` light, `azure.400` dark) |
| `--card`, `--popover` (+ `-foreground`) | = background / foreground | the semantic contract needs them; Figma has no card/popover tokens |
| `--accent-foreground` | `primary` | readable text on `accent` |
| `--success`, `--success-foreground` | `green.600` / `green.50` | Figma has no success colour; taken from the green ramp, kept distinct from `secondary` |
| `--warning`, `--warning-foreground` | `amber.800` / `#fff8eb` | Figma only exposes `warningContainer` / `onWarningContainer`, and its `onWarningContainer` orange fails AA as text |
| `--chart-6…8` | `blue.300` / `red.600` / `green.700` | 6th–8th data-viz hues for >5-series charts |
| `color.neutral.*` ramp | interpolated | Figma exposes only 3 neutral anchors (`#ffffff`, `#f6f6f6`, `#6d6d6d`) |
| entire **dark** theme | its own palette (`color.dark.json`) — not a flip of light | no dark mode in Figma |
| `radius.lg` (12), `spacing.7` (28) | interpolated | gaps in the Figma scale |

## Cleaned during extraction

- `Primay` → `primary`, `On Primary` → `primary-foreground`, `Outline` → `border`/`input`.
- `letterSpacing` float artifacts (`0.10000000149011612`, `0.15000000596046448`)
  rounded to `0.1` / `0.15`.
- Blue ramp light steps: Figma frame **names** (`#b0d0e5`, `#a1c1d6`) disagree with
  the swatch **label** text (`#F6FBFF`, `#F0F7FF`). The label values are used
  (they match the `blue.100`+ steps, which are internally consistent).

## Regenerate

```bash
pnpm build:tokens      # node style-dictionary/build.mjs — runs SD once per theme
                       # → packages/tokens/dist/{web,ios,android,flutter}
```

Multi-theme note: `build.mjs` runs Style Dictionary **once per theme** (light, then
dark) with separate source sets, because two files defining the same token path
(`color.primary` in both `color.light.json` and `color.dark.json`) collide inside
a single run. Light emits every platform; dark emits only `globals.dark.css`.
