# Phase 0.9.1 — CLI registry dependency fix

**Fixes F1 from** [`PHASE-0.9-LIVE-VERIFICATION.md`](./PHASE-0.9-LIVE-VERIFICATION.md) · **Date:** 2026-09-29
**Nothing was published, released, deployed or merged.** No npm package, no GitHub Release, no tag, no PR,
no deploy.

## Root cause

`scripts/gen-registry.mjs` decided each item's `dependencies` two ways, and both were wrong:

1. **It matched against a hand-written list of package names.** A list cannot fail — it can only be
   incomplete. `@kinetixui/tokens` was never on it, and two entries on it (`@hookform/resolvers`, `zod`)
   matched nothing any component imports.
2. **It scanned the component file only.** Then, ten lines later, it attached
   `registry/kinetixui/lib/utils.ts` to the same item whenever the component imported `@/lib/utils` — without
   scanning that file. `lib/utils.ts` imports `clsx` and `tailwind-merge`.

The result: **91 of 97 items delivered a file whose two npm dependencies they never declared.**
`npx @kinetixui/cli add card` exited 0, printed "Done.", installed nothing, and left a project that could
not resolve either package. `button` looked healthier only by accident — `class-variance-authority` depends
on `clsx` — and still failed on `tailwind-merge`.

Nothing caught it because nothing compared the declaration against the **delivered set**. Every check looked
at the part of the graph someone had remembered to scan.

### A second instance of the same class, found by fixing it properly

Deriving imports instead of matching a list surfaced one more: `kanban-board.tsx` contains
`import { tokens } from "@kinetixui/tokens"` and reads `tokens.interaction.drag.threshold` at runtime. The
package was absent from the allowlist, so the item never declared it. That is now declared too.

`button.tsx` also contains the string `@kinetixui/tokens`, in a doc comment on line 22. It is **not** an
import and is correctly not declared — the extraction matches import specifiers, not mentions.

## Implementation

One change to `scripts/gen-registry.mjs`, in two parts.

**The allowlist is gone.** Imports are derived:

```js
const RUNTIME_PROVIDED = new Set(["react", "react-dom"]);
const IMPORT_RE = /(?:^|[\s;}])(?:from|import)\s+["']([^"']+)["']/g;

function packageOf(specifier) {            // "@scope/name/sub" -> "@scope/name"; "name/sub" -> "name"
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

function npmImportsOf(code) { /* skips ".", "@/", "node:", and RUNTIME_PROVIDED */ }
```

**Dependencies are computed from the delivered set, after it is assembled** — so adding a file to an item
can never again leave its imports undeclared:

```js
const deps = new Set(npmImportsOf(code));           // the component, from memory: what actually ships
for (const f of filesArr) {                          // everything else the item delivers
  if (f.path === `registry/kinetixui/ui/${file}`) continue;
  for (const pkg of npmImportsOf(readFileSync(`${ROOT}/${f.path}`, "utf8"))) deps.add(pkg);
}
```

No per-component branch, no `if (name === "card")`, no second list. The ordering change — build `filesArr`
first, derive dependencies from it second — is what makes the bug structurally unavailable rather than
merely fixed.

### Dependency semantics: no reliance on transitive resolution

| Package | Relationship | Declared |
| --- | --- | --- |
| `clsx` | Imported **directly** by `lib/utils.ts` | **Yes**, on all 91 items that deliver it |
| `tailwind-merge` | Imported **directly** by `lib/utils.ts` | **Yes**, on all 91 |
| `class-variance-authority` | Imported directly by 21 components | **Yes**, on those 21 |
| `@kinetixui/tokens` | Imported directly by `kanban-board.tsx` | **Yes**, on that 1 |
| `react`, `react-dom` | Runtime a React consumer already has | **No**, deliberately — the entire exclusion set |

`class-variance-authority` depends on `clsx`, which is why `button` used to build in some projects. That
transitive route is **not** relied on: `clsx` is declared because a delivered file imports it, on all 91
items, including the 70 that do not use `cva` at all.

### What changed in the metadata

Comparing the regenerated registry against `ded39f7`:

| | |
| --- | --- |
| Items before / after | **97 / 97** — none added, none removed |
| Packages **added** | `clsx` ×91 · `tailwind-merge` ×91 · `@kinetixui/tokens` ×1 |
| Packages **removed** | **none** — nothing regressed |
| Distinct packages declared across the registry | 46, all real npm names |
| Over-declarations (declared but not imported) | **0** |

The item count stayed 97 because canonical source did not change — only its dependency metadata did.

## Tests

### The durable invariant

`scripts/check-registry-deps.mjs`, wired as `pnpm check:registry-deps` and added to `ci.yml` immediately
after `Build registry`, so it checks what would be served.

It asserts, for every payload under `apps/web/public/r/`:

- **Nothing missing** — every npm package imported by any file the item delivers is declared. This is the
  bug; a missing one means a consumer whose build fails.
- **Nothing extra** — no package is declared that nothing imports. These files are generated from imports,
  so an extra one means the output was hand-edited or the generator grew a special case, which is how the
  hand-maintained list came to exist.
- **Source parity** — `registry/registry.json` and the served payloads agree, or one is stale.

It checks the **served payloads** rather than re-deriving from repository sources, because those payloads
carry each file's full text: the imports compared are the ones a consumer will really have to resolve.

```
check:registry-deps ok — 97 item(s), 97 payload(s); every npm import in every delivered file is declared.
  91 deliver lib/utils.ts · clsx 91 · tailwind-merge 91 · class-variance-authority 21 · @kinetixui/tokens 1
```

### The test suite

`scripts/release/test/registry-deps.test.mjs` — **14 tests**, run by `pnpm test:release`. Written against the
architecture, not the incident:

| Test | Guards |
| --- | --- |
| Real registry reports no problems | The invariant, on live data |
| Source and served output agree | Staleness |
| Every item delivering more than one file declares all their imports | **The exact class of bug**, as a rule over auxiliary files rather than a check on `card` |
| No item declares an unimported package | Hand-editing and special cases |
| Fixture with an undeclared import **fails** | That the auditor is not vacuous |
| Same fixture, declared, **passes** | That it is not merely strict |
| Fixture with an extra package **fails** | The other direction |
| React is never required of a consumer | The exclusion set |
| Subpath specifiers reduce to the installable name | `date-fns/locale/en-US` → `date-fns` |
| Relative, `@/` and `node:` specifiers ignored | Not npm packages |
| Type-only and side-effect imports counted | They still have to resolve |
| Checker and generator share one exclusion set | That the checker can never be more permissive than the writer |
| Generator has no hand-written package list | That the root cause cannot return |

### Mutation test

The generator was reverted to scanning the component file only — the original defect — and the registry
regenerated:

```
check:registry-deps  ->  exit 1, 91 problem(s)
  ✖ accordion: delivers components/ui/accordion.tsx, lib/utils.ts which import clsx, tailwind-merge,
    but does not declare them. A consumer running `add accordion` would not be able to build.
  ✖ alert-dialog: … (and 89 more)

pnpm test:release     ->  2 failed
```

Restored, and the regenerated output is **byte-identical** to the pre-mutation state
(`registry/registry.json` and all of `apps/web/public/r`).

## All-97 dependency audit

Every served payload, inspected programmatically:

| Measure | Count |
| --- | --- |
| Items checked | **97** |
| Payload files present | 97 (index listed 97, none missing, none orphaned) |
| Items containing `lib/utils.ts` | **91** |
| Items requiring `clsx` | **91** |
| Items requiring `tailwind-merge` | **91** |
| Items requiring `class-variance-authority` | **21** |
| Items requiring `@kinetixui/tokens` | **1** |
| **Items with unresolved external imports** | **0** ✅ |
| Items declaring an unimported package | **0** |

## Consumer-build evidence

Three clean temporary consumers outside the repository, each with **only** `@kinetixui/cli@0.23.3` (the
**published** package from npm, unmodified), `react` and `react-dom` installed. `clsx`, `tailwind-merge` and
`class-variance-authority` were **never installed by hand**. Components chosen for differing dependency
graphs.

| Component | `init` | `add` | CLI installed automatically | Build | Render |
| --- | --- | --- | --- | --- | --- |
| `button` | exit 0 | exit 0 | `@radix-ui/react-slot`, `class-variance-authority`, `clsx`, `tailwind-merge` | **PASS** (118,189 B) | `<button data-slot="button" data-variant="Primary" …>` |
| `card` | exit 0 | exit 0 | `clsx`, `tailwind-merge` | **PASS** (104,852 B) | `<div class="rounded-xl border bg-card …">` |
| `kanban-board` | exit 0 | exit 0 | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, **`@kinetixui/tokens`**, `clsx`, `tailwind-merge` | **PASS** (359,474 B) | `<div role="group" class="flex items-start gap-4 …">` |

Each wrote `components/ui/<name>.tsx` **and** `lib/utils.ts`, resolved `tokens` first as a registry
dependency, and exited 0. **Every generated import resolved** — which is the success criterion, not the
exit code.

`kanban-board` additionally proves the `@kinetixui/tokens` declaration works end to end: the consumer
installed it from npm and the component's runtime read of `tokens.interaction.drag.threshold` resolved.

**The published CLI was not modified or rebuilt.** The same 0.23.3 that failed in Phase 0.9 now installs the
complete set, which is the direct evidence that this defect lived entirely in served metadata.

## Documentation changes

| File | Change |
| --- | --- |
| `apps/web/src/app/docs/installation/page.mdx` | The Phase 0.9 workaround — a callout telling users to `npm i clsx tailwind-merge` — is **removed**. It described a defect, and keeping it would have made a defect permanent documentation. The page now states what the CLI actually installs (all four for `button`), explains *why* `clsx` and `tailwind-merge` are there, and names the check that keeps it true |
| `apps/web/src/app/docs/cli/page.mdx` | **No change.** *"installs the npm packages it needs"* was the claim Phase 0.9 classified QUALIFICATION REQUIRED. It is now simply true, which is what the fix was for |
| `packages/cli/README.md` | **No change**, same reason |

Phase 0.9's claim 4 (`FALSE`) and claims 5–6 (`QUALIFICATION REQUIRED`) are all now accurate as written, in
source.

## Deployment requirement

| Requirement | Needed? | Why |
| --- | --- | --- |
| **Website deployment** (`apps/web`) | **YES** | `apps/web/public/r/*.json` is what the CLI downloads, and `DEPLOY.md` is explicit: *"There is no separate 'registry' deployment — `apps/web/public/r/*.json` is served by the Next site."* Until `apps/web` deploys, production serves the old metadata |
| **npm publication** | **NO** | Proven, not assumed: the unmodified published `@kinetixui/cli@0.23.3` installs the complete set once the metadata is right. No published package's contents changed — verified by diffing the change set against every allowlisted package directory: zero hits |
| **Changeset / version bump** | **NO** | Nothing publishable changed. `apps/web` is `private: true` |

**Deployment is website-only.** One deploy of `apps/web` and production `/r/*` serves corrected metadata to
every existing CLI installation, with no user action and no new CLI version.

## Remaining blocker

**F1 is FIXED IN SOURCE — AWAITING DEPLOYMENT.** It is not closed: production still serves the defective
metadata, and this session is not authorized to deploy.

**F3 is unchanged.** `kinetixui.com` is still denied by this container's egress policy (`403`,
`x-deny-reason: host_not_allowed`), so the live activation path remains unverified. After the deploy, the
checklist in `PHASE-0.75-PUBLIC-SURFACE.md` plus one command closes both:

```bash
cd "$(mktemp -d)" && npm init -y >/dev/null
npx @kinetixui/cli@latest init --yes && npx @kinetixui/cli@latest add card
grep -E '"(clsx|tailwind-merge)"' package.json   # both should be present
```

**Phase 0 is not complete.**
