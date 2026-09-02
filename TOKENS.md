# KinetixUI token engine — design source → code mapping

Source of truth: the KinetixUI design file in Figma, node `3877-10388`
(file `GQXTKKJAPbawd4wcuE77Pf`). Extracted via Figma MCP `get_variable_defs` +
`get_design_context`. Compiled by Style Dictionary v4 (`style-dictionary/build.mjs`).

## Layers

| Layer | File | Origin |
|---|---|---|
| Primitives — 6 brand ramps + neutral | `tokens/primitives/color.json` | Figma *Brand Colors* frame, step labels `0…10` remapped to a `0–1000` integer scale |
| Primitives — spacing / radius | `tokens/primitives/dimension.json` | Figma `spacing/*`, `Small`/`Button`/`Popup`/`Full` |
| Primitives — type | `tokens/primitives/typography.json` | Figma `fontSize/*`, `lineHeight/*` (Material 3 scale) |
| Semantic — light | `tokens/semantic/color.light.json` | aliases to primitives, named to the **shadcn** contract |
| Semantic — dark | `tokens/semantic/color.dark.json` | **synthesized** (no dark mode in Figma) |
| Semantic — text styles | `tokens/semantic/typography.json` | Figma composite text styles |

## shadcn variable → Figma variable

| shadcn `--var` | value | Figma variable | notes |
|---|---|---|---|
| `--background` | `#ffffff` | `surfaceContainerLowest` | |
| `--foreground` | `#050c11` | `onSurface` | |
| `--primary` | `#1b3c53` | `Primay` *(sic)* | **typo in Figma** — renamed `primary` here |
| `--primary-foreground` | `#f0f7ff` | `On Primary` | renamed `primary-foreground` |
| `--secondary` | `#f1f3f1` | `secondaryContainer` | shadcn "secondary" == Figma *container* role |
| `--secondary-foreground` | `#748873` | `onSecondaryContainer` | |
| `--muted` | `#f6f6f6` | `surfaceContainer` | |
| `--muted-foreground` | `#6d6d6d` | `onSurfaceVariant` | |
| `--accent` | `#f0f7ff` | `LightBlue` | the hover fill used by Outline/Ghost buttons |
| `--accent-foreground` | `#1b3c53` | — | **synth** = `primary` |
| `--destructive` | `#ec5047` | `error` | Figma keeps `error` as its own value, *not* `red.500` `#c60a0a` |
| `--destructive-foreground` | `#fef3f2` | `onError` | |
| `--border` / `--input` | `#92b2c8` | `outline` | |
| `--ring` | `#1b3c53` | — | Figma focus state = 2px `Primay` border |
| `--radius` | `8px` | `Button` | |

## Synthesized (not in Figma)

| Token | Value | Rationale |
|---|---|---|
| `--card`, `--popover` (+ `-foreground`) | = background / foreground | shadcn contract needs them; Figma has no card/popover tokens |
| `--accent-foreground` | `primary` | readable text on `accent` |
| `--success`, `--success-foreground` | `green.600` / `green.50` | Figma has no success colour; taken from the green ramp, kept distinct from `secondary` |
| `--warning`, `--warning-foreground` | `#f97907` / `#fff8eb` | Figma only exposes `warningContainer` / `onWarningContainer` |
| `color.neutral.*` ramp | interpolated | Figma exposes only 3 neutral anchors (`#ffffff`, `#f6f6f6`, `#6d6d6d`) |
| entire **dark** theme | walk ramps to dark end, swap fg/bg | no dark mode in Figma |
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
