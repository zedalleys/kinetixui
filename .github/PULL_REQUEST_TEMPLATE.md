## What and why

<!-- One or two sentences. Link the issue if there is one. -->

## Platforms affected

<!-- KinetixUI is a shared design language with native implementations. Tick what this touches. -->

- [ ] Tokens / foundations (`tokens/`, `style-dictionary/`)
- [ ] Web · React (`packages/ui`)
- [ ] iOS · SwiftUI (`packages/ui-swiftui`)
- [ ] Android · Compose (`packages/ui-compose`)
- [ ] Flutter (`packages/ui-flutter`)
- [ ] Docs site (`apps/web`) / CLI / tooling only

<!-- Adding or changing a component? See the four-platform rule in /docs/contributing: React first, then the
     native ports (or a `platformNote` in components.manifest.json explaining a deliberate gap). -->

## Checklist

- [ ] Uses design tokens — no hardcoded colors, and spacing stays on the 8-unit grid (4-unit half-step)
- [ ] States, dark mode and RTL considered (logical properties on web; native layout direction on native)
- [ ] Accessible name, keyboard and focus behavior considered; accessibility not claimed on automated checks alone
- [ ] Changeset added for a change to `@kinetixui/ui`, `@kinetixui/tokens` or `@kinetixui/cli` (`pnpm changeset`)
- [ ] Docs and the site updated alongside the code; no example uses an API that does not exist
- [ ] `components.manifest.json` updated (and `pnpm gen:manifest`) if a component or its platforms changed
- [ ] Generated files regenerated, not hand-edited (`pnpm build:tokens`, `pnpm build:registry`, `pnpm vendor:*`)

## Verification

<!-- What you ran and saw. Native changes can only be compile-checked in CI — say so if that is the case. -->

- [ ] `pnpm test`, `pnpm typecheck`, `pnpm lint`
- [ ] `pnpm check:contrast`, `check:rtl`, `check:grid`, `check:manifest`, `check:releases` (as relevant)
