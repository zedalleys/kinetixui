# KinetixUI

**One token architecture, in motion across every platform.**

KinetixUI turns a single design source into living tokens and components for
**React, SwiftUI, Jetpack Compose, and Flutter** — one source of truth,
multi-platform output, a React component library, a portable component registry, and
Storybook docs.

Free while in beta. Advanced tooling ships later as **KinetixUI Pro**.

## Monorepo layout

```
kinetixui/
├─ tokens/                     DTCG token source (extracted from the design source)
│  ├─ primitives/              color ramps · spacing · radius · type
│  └─ semantic/                semantic token aliases (light + dark) · text styles
├─ style-dictionary/
│  ├─ build.mjs                entrypoint — runs SD once per theme (light, dark)
│  ├─ sd.config.mjs            Style Dictionary v4 config factory — 5 platform targets
│  └─ hooks.mjs                custom transforms + TS format
├─ packages/
│  ├─ tokens/                  @kinetixui/tokens — build output for all platforms
│  │  └─ dist/{web,ios,android,flutter}
│  ├─ ui/                      @kinetixui/ui — React + CVA + Radix + Tailwind
│  └─ cli/                     @kinetixui/cli — first-party install CLI (init / add)
├─ registry/
│  ├─ registry.json            component registry manifest
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
| `pnpm build:cli` | bundle the `@kinetixui/cli` package (tsup) |
| `pnpm build:registry` | `shadcn build` → static registry JSON in `public/r/` |
| `pnpm dev:web` | kinetixui.com dev server on :3000 |
| `pnpm storybook` | Storybook dev server on :6006 |
| `pnpm build` | Turborepo: tokens → ui → registry |

## Consume it

```bash
# registry — own the code
npx @kinetixui/cli add button

# npm — versioned dependency
npm i @kinetixui/tokens @kinetixui/ui
```

Publishing is Changesets-driven: `pnpm changeset` to describe a change; on merge
to `main` the Release workflow opens a **Version Packages** PR, and merging that
publishes to npm (needs the `NPM_TOKEN` repo secret). `apps/web` / `apps/docs`
are private and never published.

## Status

- ✅ **Token engine** — `pnpm build:tokens` clean; 11 files across web / iOS /
  Android / Flutter. Web CSS is HSL channels (opacity modifiers work); `--chart-1…5`
  added.
- ✅ **Components — 66 in `@kinetixui/ui`**, full component parity: `Button` /
  `Input` / `Textarea` (design-source-native API) + 63 ported onto the token
  contract (Accordion … Tooltip, plus Calendar, Carousel, Chart, Command,
  Context Menu, Data Table, Drawer, Form, Input OTP, Menubar, Navigation Menu,
  Resizable, Sidebar, AudioPlayer, CircularProgress, Image, Inform, Rating,
  Spinner, List, Stepper, Fab, TabBar, NavigationBar, FileUpload, AvatarGroup,
  DatePicker, CodeBlock, Metric, NumberInput, Quote, Footer, TableOfContents).
  **72-item** component registry.
- ✅ **kinetixui.com** — every component doc route (72 component pages) with
  live previews, Colors, Themes, ⌘K, light/dark. `pnpm build:web` passes; all static.
- ✅ **`@kinetixui/cli`** — first-party install tool (`packages/cli`), command
  name `kinetixui`. `init`
  scaffolds `kinetixui.json` + the token contract; `add <name>` resolves
  registry dependencies, installs npm deps with the detected package manager,
  and writes source into your configured directory. No other tool's CLI
  required — every doc page's install snippet reads `npx @kinetixui/cli add <name>`.
- ✅ **Storybook** — a story for every component. `Button` / `Input` / `Textarea`
  are hand-written (variant/state matrices); the rest are generated from the
  canonical demo registry by `pnpm gen:stories`
  (`scripts/gen-stories.mjs` → `packages/ui/src/stories/*.stories.tsx`).
- ✅ CI — GitHub Actions builds tokens → ui → registry → site on every push/PR,
  and fails if generated output (`packages/tokens/dist`, `apps/web/public/r`) is stale.
- Deploy: see `DEPLOY.md` (Vercel + GoDaddy).
- See `TOKENS.md` for every deviation from the raw design tokens.
