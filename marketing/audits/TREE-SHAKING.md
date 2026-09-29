# `@kinetixui/ui` and tree-shaking — architecture audit

**Date:** 2026-09-28 · **Commit:** `d9c9aba` (Phase 0.5) · **Measured with:** esbuild 0.28.2,
`--bundle --minify --format=esm`, `react`/`react-dom` external
**Status:** the claim is corrected; the **architecture is not changed** by this audit. The packaging fix
is deferred to a dedicated engineering task — see [Recommendation](#recommended-architecture).

## Why this document exists

The readiness audit measured that importing a single component from `@kinetixui/ui` costs roughly two
thirds of the whole library. That is a packaging fact with a marketing consequence: "tree-shakeable" is a
claim any reader can disprove in two minutes with a bundler, on a project whose entire positioning is that
its claims survive checking.

**One useful finding up front: no public surface ever made the claim.** A full search of the repository
for `tree.?shak`, `sideEffects`, `bundle size`, `only what you use` and `dead code` across every `.md`,
`.mdx`, `.ts`, `.tsx` and `.json` found no marketing claim of tree-shaking for `@kinetixui/ui`. The only
hits were an internal comment in `data-table.tsx` about `@tanstack/react-table`'s own opt-in `features`
API (accurate, and about a dependency), and the `sideEffects` fields in three manifests (correct
metadata, not a claim). So nothing had to be retracted. What was missing was the opposite: any statement
of the limitation. The package README now carries one.

## Measured baseline

A clean project, `@kinetixui/ui@0.23.3` installed from npm, React external.

| Import | Minified | Gzipped | Share of the whole library |
| --- | --- | --- | --- |
| `import { Button } from "@kinetixui/ui"` | **677,991 B** | 205,562 B | **66.8 %** |
| `import * as all from "@kinetixui/ui"` | 1,014,740 B | — | 100 % |

For contrast, the same measurement on the package that got its packaging right:

| Import | Minified |
| --- | --- |
| `import { KINETIX_ALERT_SEVERITIES } from "@kinetixui/iot/functions"` | **195 B** |
| `import { BatteryIndicator } from "@kinetixui/iot/react"` | 22,534 B |
| everything from both `@kinetixui/iot` subpaths | 26,209 B |

195 bytes against 678 kilobytes is a 3,477× difference in the cost of "I want one thing", and both
packages are in this monorepo, built by the same toolchain, on the same day.

## Current architecture

```
packages/ui/
  package.json      "type": "module", "sideEffects": false
                    exports:  "."                  -> ./dist/index.js
                              "./tailwind.config"  -> ./tailwind.config.ts
                              "./package.json"
  dist/
    index.js        292 KB — ONE pre-bundled ES module containing all 97 exports
    index.d.ts      116 KB
  src/
    components/     96 files, shipped in the tarball for the copy-the-source path
```

Two properties matter, and only together:

1. **`dist/` is a single module.** All 97 component implementations are concatenated into one file.
2. **There are no per-component subpath exports.** `.` is the only JavaScript entry.

## Why `sideEffects: false` is not enough

`sideEffects: false` is a *permission*, not a mechanism. It tells the bundler "you may delete an unused
import from this package without worrying that evaluating it does something observable." It does not give
the bundler anything smaller to reach for.

Tree-shaking operates on the **module graph**. The unit a bundler can include or exclude is a module. When
97 components live in one module, importing any one of them makes that module reachable, and a reachable
module is emitted — its top-level imports included. `@kinetixui/ui/dist/index.js` imports
`react-resizable-panels`, `@dnd-kit/*`, `vaul`, `sonner`, `embla-carousel`, `cmdk`, `react-day-picker`,
`input-otp` and about thirty Radix packages at module scope, because some component in the file needs each
of them. Ask for `Button` and all of that arrives with it.

The esbuild metafile is unambiguous about it:

```
140,476 bytes  node_modules/@kinetixui/ui/dist/index.js     ← all of it, for one Button
 56,000 bytes  node_modules/react-resizable-panels/…
 38,678 bytes  node_modules/@dnd-kit/core/…
 29,491 bytes  node_modules/vaul/…
 19,674 bytes  node_modules/sonner/…
 18,367 bytes  node_modules/embla-carousel/…
        …      343 inputs in total, across ~40 transitive UI dependencies
```

`140,476 of 140,476` bytes of the package's own module are included. Nothing was shaken, because there was
nothing shakeable at that granularity.

A bundler *can* do better within a single module in some cases — statement-level elimination of unreferenced
top-level declarations. It cannot do so across an import that the module performs for its own reasons, and
it is those imports, not the component code, that dominate the 678 KB.

## Why `@kinetixui/iot` behaves differently

Same monorepo, same bundler, opposite result — and the reason is structural, not effort:

```
packages/iot/
  exports:  "."           -> ./dist/index.js
            "./functions" -> ./dist/functions/index.js     ← React-free, enforced in CI
            "./react"     -> ./dist/react/index.js
  dist/
    index.js, functions/index.js, react/index.js
    chunk-*.js  × 3   ← shared code split out
```

Three entry points with code splitting. A consumer who wants classification logic imports
`@kinetixui/iot/functions` and the React half is never in the graph — which is why one function costs
195 bytes and why `check:iot-dist` can assert the functions subpath contains no React at all.

Note what this does *not* require: per-component entries. Three well-chosen boundaries produced a
3,477× improvement for the common case. The lesson for `ui` is about boundaries, not about granularity for
its own sake.

## What the package already offers instead

This is worth stating plainly, because it is the honest and genuinely attractive answer today: **the
registry path has none of this problem.**

```bash
npx @kinetixui/cli add button
```

writes `button.tsx` into the consumer's repo and installs only that component's own npm dependencies. A
project that adds four components carries four components. The npm package is the convenience path; the
registry is the lean one. The README now says which is which, rather than implying the npm package is both.

## Recommended architecture

In increasing order of cost. **None is performed by this audit.**

### 1. Per-component subpath exports — recommended

```json
"exports": {
  ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
  "./button": { "types": "./dist/button.d.ts", "import": "./dist/button.js" },
  "./dialog": { … }
}
```

Built by pointing the bundler at every `src/components/*.tsx` as an entry with splitting on, exactly as
`packages/iot` already does. `.` stays as it is, so **nothing breaks for existing consumers** — this is
purely additive, which is what makes it the recommendation.

- **Effort:** one build-config change, plus generated `exports` (97 entries — generate them from the
  filesystem; a hand-written map is a drift source and this repository has eight CI checks whose existence
  is owed to hand-written lists).
- **Payoff:** `import { Button } from "@kinetixui/ui/button"` costs Button and Button's dependencies.
- **Risk:** low. See below.

### 2. Preserve modules on the existing entry

Emit `dist/` as one file per source module rather than one bundle, keeping `.` as the only entry. Then
`import { Button } from "@kinetixui/ui"` shakes correctly with no consumer change at all — the nicest
outcome for users, since nobody has to learn a new import path.

- **Effort:** moderate. Requires the build to stop bundling, which changes output file count from 2 to
  ~100 and makes `requireFiles` and the artifact validation list longer.
- **Payoff:** the best, because it needs nothing from consumers.
- **Risk:** medium — more moving parts in the packed artifact, and `dist/index.js` stops being a single
  reviewable file.

### 3. Split by domain, as `iot` did

A few coarse entries (`/forms`, `/overlays`, `/data`, `/layout`) rather than 97. Less precise than (1) but
far fewer entries to maintain.

- **Payoff:** most of the win for a fraction of the surface area.
- **Risk:** low, but the boundaries are a judgement that will be re-litigated.

### Not recommended

- **Dropping `sideEffects: false`.** It is correct and it helps; it is simply not sufficient.
- **Splitting the package into `@kinetixui/ui-button` etc.** 97 packages, 97 version lines, 97 changelogs.
- **Marketing around the current architecture.** Nothing about it supports a size claim.

## Migration risks

| Risk | Which option | Note |
| --- | --- | --- |
| A subpath that resolves in the bundler but not in Node, or vice versa | 1, 2 | The existing packed-consumer smoke test in `scripts/release/artifacts.mjs` installs each tarball into a clean project and imports it. It must be extended to exercise **each** new subpath, or the coverage that currently protects one entry point silently protects one out of ninety-eight. |
| `requireFiles` falls out of step with the real output | 1, 2 | `release/publish-packages.json` lists required tarball paths and the preflight enforces them. 97 entries must be generated, not typed. |
| Duplicated shared code across entries | 1, 3 | Code splitting solves it; splitting must actually be on, and a chunk count assertion is cheap insurance. |
| Type resolution breaks for `moduleResolution: node` consumers | 1 | Subpath `types` need per-entry `.d.ts`. Worth an explicit typecheck against both `node` and `bundler` resolution. |
| Two ways to import the same component diverge | 1, 3 | `.` must keep re-exporting everything, and a test should assert the subpath and root exports are the same object. |
| Tailwind `content` globs stop matching | all | Consumers glob `./node_modules/@kinetixui/ui/dist/**/*.js`; more files still match, but the docs example should be re-verified rather than assumed. |
| A registry component and its npm counterpart drift | none | Unchanged by any option — the registry path is generated from the same source and already drift-checked. |

The lowest-risk sequencing is **(1) additively, behind the existing `.` entry**, with the smoke test
extended to every subpath in the same change. That keeps every current consumer on a path that is already
proven while the new one earns its coverage.

## What may and may not be claimed today

| Claim | Verdict |
| --- | --- |
| "`@kinetixui/ui` is tree-shakeable" | **No.** Measurably false at component granularity. |
| "Import only what you need from `@kinetixui/ui`" | **No.** Implies the same thing. |
| "`sideEffects: false`, so bundlers can drop what you don't use" | **No.** True of the flag, false of the outcome; more misleading than the bare claim because it sounds technical. |
| "Copy only the components you need, with the CLI" | **Yes.** That is what the registry does. |
| "`@kinetixui/iot/functions` is React-free and costs bytes, not kilobytes" | **Yes.** 195 B measured, and CI asserts the React-free boundary. |
| "`@kinetixui/tokens` ships one typed object" | **Yes** — and say the size (~8 KB minified), because the object is atomic. |
| "Per-component entry points are planned" | Only once the work is scheduled. It is not, yet. |

## Reproducing this

```bash
mkdir /tmp/shake && cd /tmp/shake && npm init -y >/dev/null
npm i @kinetixui/ui@0.23.3 react@19 react-dom@19
echo 'import { Button } from "@kinetixui/ui"; console.log(Button);' > one.js
echo 'import * as all from "@kinetixui/ui"; console.log(all);'      > all.js
npx esbuild one.js --bundle --format=esm --minify --external:react --external:react-dom \
  --outfile=one.out.js --metafile=meta.json
npx esbuild all.js --bundle --format=esm --minify --external:react --external:react-dom --outfile=all.out.js
wc -c one.out.js all.out.js
node -e 'const m=require("./meta.json");const i=m.outputs["one.out.js"].inputs;
  console.log(Object.entries(i).sort((a,b)=>b[1].bytesInOutput-a[1].bytesInOutput).slice(0,10));'
```
