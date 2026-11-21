# M1 generated-code acceptance: a real consumer production build

`consumer-fixture.test.ts` typechecks the generated source and bundles a browser entry with
esbuild against symlinked workspace directories. That proves the source compiles. It does not
prove a consumer can install the package shape KinetixUI publishes and run their own framework
production build, and it does not compare what the built page renders against the project the
editor saved.

`scripts/create-studio-consumer-build.mjs` closes that distance. Run it after the fixture test,
which writes the generated source it consumes:

```sh
pnpm build:tokens
pnpm --filter @kinetixui/ui build
KINETIX_CREATE_EXPORT_FIXTURE=/tmp/kinetix-create-export-m1 \
  pnpm --filter @kinetixui/web exec vitest run src/lib/create-studio
CREATE_EXPORT_FIXTURE=/tmp/kinetix-create-export-m1 \
CREATE_CONSUMER_DIR=/tmp/kinetix-create-consumer-build \
CREATE_ARTIFACTS=.impeccable/review/create-studio \
  node scripts/create-studio-consumer-build.mjs
```

## What it does

1. **Packs** `@kinetixui/ui` and `@kinetixui/tokens` with `pnpm pack`. Only files the packages
   actually ship are visible to the consumer; a symlink exposes the whole working tree, including
   paths `files` excludes.
2. **Installs** those tarballs with `pnpm install` into an isolated consumer project, alongside
   React, TypeScript, Tailwind and Vite. React, TypeScript, Tailwind, PostCSS and Autoprefixer
   versions are read from `apps/web/package.json` so they cannot drift; Vite and
   `@vitejs/plugin-react` are pinned in the script, because the bundler is the consumer's own
   choice rather than a repository dependency.
3. **Typechecks** the generated source with the consumer's own `tsc` under `strict`.
4. **Builds** with `vite build` — a real minified production build through Rollup — and rejects an
   implausibly small chunk, so a build that emitted nothing cannot satisfy the rendering checks by
   rendering nothing.
5. **Reads the rendered structure** of the built output in Chromium and asserts it against the
   saved document (`source-document.json`) at `390, 767, 768, 959, 960, 1440` — every breakpoint
   boundary the document declares, and each side of it. For each node it reads the accessible name
   or text the document declares, and for layout nodes with overrides the rendered
   `grid-template-columns`, `flex-direction`, `gap`, `padding` and frame `width`.
6. **Proves the instrument can fail**, with three negative controls that each break one protected
   behaviour, assert the gate reddens *for that reason*, and restore the fixture:
   - generated imports that do not resolve must fail the production build (the failure must name
     the unresolvable specifier);
   - a saved property lost from the output must be caught by the rendered reading (the failure
     must name the node that lost it);
   - a discarded responsive configuration must be caught at the desktop breakpoint (the failure
     must name the overridden node).

   After the controls, the restored fixture is read again and must pass, so no control can be
   credited to a gate that simply fails everything.

The breakpoint cascade, the adapter defaults and the spacing scale are re-stated inside the gate,
read from `tokens/primitives/dimension.json` rather than from the lowering code. A gate that
imports the module it measures cannot detect that module getting the cascade wrong.

## What it does not claim

- It installs **packed workspace tarballs, not published npm versions**. It is not a release or
  publication certification. Nothing here is published or deployed.
- Chromium only. Structure is read through the accessibility tree and computed style, **not**
  compared pixel by pixel. `visual` verification remains **0 on all five platforms**.
- The claim this gate earns is exactly: **generated code builds successfully in a clean consumer
  project, and what it renders matches the saved project** at the measured widths.
- The consumer install was verified locally with pnpm 10.28.0; CI runs it with the pnpm version
  `pnpm/action-setup` installs for the repository.

## Companion unit gate

`export-persistence.test.ts` gates the invariant this build rests on: the generated code is a
function of the **saved** document, not of the live session. It asserts byte-identical source,
theme and instructions after the serialization boundary a save crosses and after a real save and
reopen through `StudioService` on `FileStore`, that reopening reproduces every node identity,
property and override, and that every saved text value, frame name and declared breakpoint is
observable in the generated output. Those invariants held before the tests were written; they were
simply ungated.
