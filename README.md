# Strata Design System

Cross-platform design system compiled from **Figma "Personal Design System"**
(node `3877-10388`) — one token source of truth, multi-platform output, a React
component library, a shadcn custom registry, and Storybook docs.

## Monorepo layout

```
strata design system/
├─ tokens/                     DTCG token source (extracted from Figma)
│  ├─ primitives/              color ramps · spacing · radius · type
│  └─ semantic/                shadcn-named aliases (light + dark) · text styles
├─ style-dictionary/
│  ├─ build.mjs               entrypoint — runs SD once per theme (light, dark)
│  ├─ sd.config.mjs           Style Dictionary v4 config factory — 5 platform targets
│  └─ hooks.mjs               custom transforms + TS format
├─ packages/
│  ├─ tokens/                  @strata/tokens — build output for all platforms
│  │  └─ dist/{web,ios,android,flutter}
│  └─ ui/                      @strata/ui — React + CVA + Radix + Tailwind
│     ├─ src/components/       button.tsx (full) · input.tsx (stub) · …
│     ├─ src/stories/          Button.stories.tsx (CSF3)
│     ├─ tailwind.config.ts    maps utilities → token contract
│     └─ components.json       shadcn config
├─ registry/
│  ├─ registry.json            shadcn custom registry manifest
│  └─ strata/                  registry source files (ui/ · lib/ · globals.css)
├─ public/r/                   built static registry — /r/button.json …
└─ apps/docs/                  Storybook 8 (@storybook/react-vite)
   └─ .storybook/              main.ts · preview.ts (links token CSS)
```

## Scripts

| Command | Does |
|---|---|
| `pnpm build:tokens` | `node style-dictionary/build.mjs` → `packages/tokens/dist/{web,ios,android,flutter}` (11 files) |
| `pnpm build:registry` | `shadcn build` → static registry JSON in `public/r/` |
| `pnpm build:ui` | bundle `@strata/ui` (tsup) |
| `pnpm storybook` | Storybook dev server on :6006 |
| `pnpm build` | Turborepo: tokens → ui → registry → storybook |

## Consume the registry

```bash
npx shadcn@latest add https://strata.design/r/button.json
```

## Status (first pass)

- ✅ Token engine: `pnpm install && pnpm build:tokens` runs clean — 11 files generated
  across web / iOS / Android / Flutter, values verified (px on web, dp on Android,
  `Color(0x…)` on Compose/Flutter, `UIColor` on Swift, light `:root` + dark `.dark`).
- ✅ `Button`: full 6 × 4 × 5 CVA matrix, Radix `Slot`, registry item, CSF3 stories with cross-platform code blocks.
- 🟡 `Input` + 8 more components: stubs with the exact Figma node id and variant matrix to fill. Method: `button.tsx`.
- 🟡 `@strata/ui` bundle, `build:registry`, and Storybook dev server: wired but not yet run in CI.
- See `TOKENS.md` for every deviation from the raw Figma variables.
