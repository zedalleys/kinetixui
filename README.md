# KinetixUI

**One token architecture, in motion across every platform.**

KinetixUI turns a single design source into living tokens and components for
**React, SwiftUI, Jetpack Compose, and Flutter** — one source of truth,
multi-platform output, a component library **on all four platforms** at parity,
a portable component registry, and Storybook docs.

Free while in beta. Advanced tooling ships later as **KinetixUI Pro**.

## Monorepo layout

```
kinetixui/
├─ tokens/                     DTCG token source (extracted from the design source)
│  ├─ primitives/              color ramps · spacing · radius · type
│  └─ semantic/                semantic token aliases (light + dark) · text styles
├─ style-dictionary/
│  ├─ build.mjs                entrypoint — runs SD once per theme (light, dark)
│  ├─ sd.config.mjs            Style Dictionary v4 config factory — web + iOS + Android + Flutter
│  └─ hooks.mjs                custom transforms + formats (TS, SwiftUI Color, Dart Color, type scales)
├─ packages/
│  ├─ tokens/                  @kinetixui/tokens — build output for all platforms
│  │  └─ dist/{web,ios,android,flutter}
│  ├─ ui/                      @kinetixui/ui — React + CVA + Radix + Tailwind
│  ├─ ui-compose/              Jetpack Compose port (Gradle; no package.json) — /docs/compose
│  ├─ ui-swiftui/              SwiftUI port (SwiftPM; no package.json) — /docs/swiftui
│  ├─ ui-flutter/              Flutter port (Dart; no package.json) — /docs/flutter
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
| `pnpm build:tokens` | `node style-dictionary/build.mjs` → `packages/tokens/dist/{web,ios,android,flutter}` (colours light + dark, theme, type scale, dimensions) |
| `pnpm vendor:compose` / `vendor:swiftui` / `vendor:flutter` | copy the generated native token files into `packages/ui-{compose,swiftui,flutter}` (run after `build:tokens`) |
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

- ✅ **Token engine** — `pnpm build:tokens` clean; web / iOS / Android / Flutter
  output, with a real light **and** dark pass for the native semantic themes.
  Web CSS is HSL channels (opacity modifiers work); `--chart-1…5` added.
- ✅ **React — `@kinetixui/ui`**, the source of truth: `Button` / `Input` /
  `Textarea` (design-source-native API) + the rest ported onto the token
  contract. **72-item** component registry; published to npm + the CLI registry.
- ✅ **Native ports at parity** — Jetpack Compose (`packages/ui-compose`, 69
  composables), SwiftUI (`packages/ui-swiftui`, 68 views) and Flutter
  (`packages/ui-flutter`, 68 widgets) each carry a 1:1 port of the React
  surface on the same token contract. Standing non-ports: `Form`,
  `NavigationMenu`, `Combobox`. Each has its own CI workflow
  (`native-{compose,swiftui,flutter}.yml`: `gradle assembleDebug` /
  `swift build` / `flutter analyze`). The **four-platform rule** — a new
  component isn't done until all four have a CI-verified port — is at
  `/docs/contributing`.
- ✅ **kinetixui.com** — every component doc route (72 component pages) with
  live previews, Colors, Themes, ⌘K, light/dark. `pnpm build:web` passes; all static.
  The Code tab has per-platform sub-tabs — React · HTML · iOS (SwiftUI) ·
  Android (Compose) · Flutter — with copy, for every component
  (`apps/web/src/registry/platform-code.ts`). Native snippets compose each
  platform's own primitives with the real `@kinetixui/tokens` output.
- ✅ **`@kinetixui/cli`** — first-party install tool (`packages/cli`), command
  name `kinetixui`. `init`
  scaffolds `kinetixui.json` + the token contract; `add <name>` resolves
  registry dependencies, installs npm deps with the detected package manager,
  and writes source into your configured directory. No other tool's CLI
  required — every doc page's install snippet reads `npx @kinetixui/cli add <name>`.
- ✅ **Storybook** — a story for every component, with the a11y addon.
  `Button` / `Input` / `Textarea` are hand-written (variant/state matrices);
  the rest are generated from the canonical demo registry by `pnpm gen:stories`
  (`scripts/gen-stories.mjs` → `packages/ui/src/stories/*.stories.tsx`).
- ✅ **Tests** — `pnpm test` (Vitest + Testing Library, jsdom). Every story is
  smoke-mounted (`packages/ui/src/components-smoke.test.tsx`) plus targeted
  behaviour tests for the design-source-native components.
- ✅ **Accessibility** — Radix primitives (keyboard + ARIA), `focus-visible`
  `--ring` outlines, `pnpm check:contrast` (in CI) audits every token pair
  against WCAG AA. See `/docs/accessibility` for the details and the one
  documented trade-off.
- ✅ CI — GitHub Actions builds tokens → ui → registry → site and runs the
  `@kinetixui/ui` tests on every push/PR; fails if generated output
  (`packages/tokens/dist`, `apps/web/public/r`) is stale. Three additional
  path-filtered workflows compile the native ports
  (`native-{compose,swiftui,flutter}.yml`).
- Deploy: [`DEPLOY.md`](DEPLOY.md) is the setup guide; [`NOTES.md`](NOTES.md) is
  the current live state (Vercel project, DNS, npm layout, Storybook, CI).
- See [`TOKENS.md`](TOKENS.md) for every deviation from the raw design tokens.
