# KinetixUI

**One token architecture, in motion across every platform.**

KinetixUI turns a single design source into living tokens and components for
**React, SwiftUI, Jetpack Compose, and Flutter** — one source of truth,
multi-platform output, a React component library, a shadcn custom registry, and
Storybook docs.

Free while in beta. Advanced tooling ships later as **KinetixUI Pro**.

## Monorepo layout

```
kinetixui/
├─ tokens/                     DTCG token source (extracted from the design source)
│  ├─ primitives/              color ramps · spacing · radius · type
│  └─ semantic/                shadcn-named aliases (light + dark) · text styles
├─ style-dictionary/
│  ├─ build.mjs                entrypoint — runs SD once per theme (light, dark)
│  ├─ sd.config.mjs            Style Dictionary v4 config factory — 5 platform targets
│  └─ hooks.mjs                custom transforms + TS format
├─ packages/
│  ├─ tokens/                  @kinetixui/tokens — build output for all platforms
│  │  └─ dist/{web,ios,android,flutter}
│  └─ ui/                      @kinetixui/ui — React + CVA + Radix + Tailwind
├─ registry/
│  ├─ registry.json            shadcn custom registry manifest
│  └─ kinetixui/               registry source files (ui/ · lib/ · globals.css)
├─ public/r/                   built static registry — /r/button.json …
└─ apps/
   ├─ docs/                    Storybook 8 (@storybook/react-vite)
   └─ web/                     kinetixui.com — Next.js App Router, built on @kinetixui/ui
```

## Scripts

| Command | Does |
|---|---|
| `pnpm build:tokens` | `node style-dictionary/build.mjs` → `packages/tokens/dist/{web,ios,android,flutter}` (11 files) |
| `pnpm build:ui` | bundle `@kinetixui/ui` (tsup) |
| `pnpm build:registry` | `shadcn build` → static registry JSON in `public/r/` |
| `pnpm dev:web` | kinetixui.com dev server on :3000 |
| `pnpm storybook` | Storybook dev server on :6006 |
| `pnpm build` | Turborepo: tokens → ui → registry |

## Consume the registry

```bash
npx shadcn@latest add https://kinetixui.com/r/button.json
```

## Status

- ✅ **Token engine** — `pnpm build:tokens` runs clean; 11 files across web / iOS /
  Android / Flutter, values verified (px on web, dp on Android, `Color(0x…)` on
  Compose/Flutter, `UIColor` on Swift, light `:root` + dark `.dark`).
- ✅ **Components** — `Button` (6 × 4 × 5), `Input`, `Textarea`; CVA + Radix,
  registry items, Storybook stories.
- ✅ **kinetixui.com** — landing, docs (MDX), component pages with live previews,
  Colors, Themes, ⌘K, light/dark.
- 🟡 7 more components scaffolded (`select`, `checkbox`, `radio-group`, `switch`,
  `badge`, `tag`, `dialog`) — each carries its design-source node id.
- 🟡 No CI yet; `pnpm build:web` not run in a clean environment.
- See `TOKENS.md` for every deviation from the raw design tokens.
