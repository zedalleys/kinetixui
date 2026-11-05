# Operational notes

Current state of the live site and publishing pipeline. `DEPLOY.md` is the
step-by-step setup guide; this file is what's actually running.

_Last updated: 2026-09-06._

## Hosting — Vercel

- **One project: `kinetixui`** (team `zed-alleys`, Hobby plan). Root Directory
  `apps/web`. Auto-deploys `main` on every push.
- Renamed from `kinetixui-web` — the old `vercel.com/zed-alleys/kinetixui-web`
  URL 404s; use `vercel.com/zed-alleys/kinetixui`.
- Build/install are driven by **`apps/web/vercel.json`**, not the dashboard:
  - install: `cd ../.. && pnpm install --no-frozen-lockfile`
    (plain `--frozen-lockfile=false` is rejected by the pinned pnpm 12)
  - build: `pnpm build:tokens && pnpm --filter @kinetixui/ui build && pnpm --filter @kinetixui/web build`
- `apps/docs` (Storybook) is **not deployed**. `apps/docs/vercel.json` exists for
  an optional second project (see `DEPLOY.md` §5) but none is set up.

## Domains & DNS

| Host | Value |
|---|---|
| `kinetixui.com` | primary, Production. `A @ → 216.198.79.1` |
| `www.kinetixui.com` | **308 permanent redirect → apex**. `CNAME www → cname.vercel-dns.com` |

- Apex is canonical, matching `siteConfig.url` in `apps/web/src/lib/site.ts`.
- DNS is managed at **GoDaddy** (nameservers `ns59` / `ns60.domaincontrol.com`).
  No forwarding rule. `216.198.79.1` is Vercel's current anycast range;
  the older `76.76.21.21` also still works.
- TLS: Let's Encrypt, auto-issued/renewed by Vercel for both hosts.

## Registry endpoint

`https://kinetixui.com/r/<name>.json` is served **static** from
`apps/web/public/r/` (committed). Vercel does not regenerate it — run
`pnpm build:registry` and commit when components change.
`npx @kinetixui/cli add <name>` reads from this endpoint.

## npm packages

Published via Changesets (see `.changeset/README.md`). Release workflow runs on
push to `main`; it opens a **Version Packages** PR when changesets are pending,
and publishes on merge. Needs the `NPM_TOKEN` repo secret.

| Package | Notes |
|---|---|
| `@kinetixui/tokens` | build output for web / iOS / Android / Flutter |
| `@kinetixui/ui` | React component library |
| `@kinetixui/cli` | install CLI. Command name is `kinetixui`; invoke with `npx @kinetixui/cli`. |

- The CLI is **scoped** (`@kinetixui/cli`). The unscoped name `kinetixui` cannot
  be published by the CI token (npm returns `403` regardless of token) while the
  `@kinetixui/*` scope publishes fine. `kinetixui@0.1.0` on npm is deprecated and
  points to `@kinetixui/cli`.

## Storybook

- Stories live in `packages/ui/src/stories/*.stories.tsx`.
- `Button` / `Input` / `Textarea` are hand-written (variant/state matrices).
- Every other component's story is **generated**: `pnpm gen:stories`
  (`scripts/gen-stories.mjs`) parses the demo registry
  (`apps/web/src/registry/demos.tsx`) and emits one self-contained story each.
  Rerun after editing demos.
- Components with meaningful root-level props also get an interactive
  **Playground** story with `argTypes` controls — from the `CONTROLS` map in
  `gen-stories.mjs`, options mirroring each component's CVA variants. Covers the
  single-primitive set (badge, alert, spinner, fab, inform, tag, toggle, rating,
  progress, slider, switch, checkbox, number-input, metric, image, aspect-ratio,
  separator, circular-progress) plus the compound components whose state reads
  well at the root (Accordion, Tabs, ToggleGroup, RadioGroup, Collapsible,
  Select, Popover, HoverCard, Tooltip). Trigger-driven overlays and data-shaped
  components stay demo-only.
- `packages/ui/tsconfig.json` excludes `src/stories` from `tsc` (stories import
  `@storybook/react`, an `apps/docs`-only dep).
- Not built in CI. `pnpm build-storybook` builds it locally.

## Component doc "Code" tab

`ComponentPreview` (`apps/web/src/components/component-preview.tsx`) renders the
Code tab as per-platform sub-tabs — **React · HTML · iOS · Android · Flutter**
(iOS = SwiftUI, Android = Jetpack Compose) — each with a copy button.

- The **React** snippet is canonical and lives in the demo registry
  (`demoRegistry[name].source`).
- The other platforms come from `apps/web/src/registry/platform-code.ts` —
  keyed by demo name, one map so there's a single source per language. The
  `swift` / `kotlin` / `dart` snippets call the real `Kinetix*` component
  libraries 1:1 with the React example; `html` uses the CSS-var contract
  directly. Illustrative, not CI-compiled.
- **All 72 nav components** have an entry. Labels/`PLATFORM_ORDER` live at the
  top of `platform-code.ts`. A handful of web-first patterns (chart, command,
  resizable, sonner, hover-card) carry a `//` note where the platform lacks a
  first-party primitive and a third-party package or composed approach is
  shown instead.

## `/components` gallery

`apps/web/src/app/components/page.tsx` → `<ComponentGallery>`
(`apps/web/src/components/component-gallery.tsx`). Each card's thumbnail is,
in order of preference: a purpose-built static mock from
`component-thumbnails.tsx` (`THUMBNAIL_MOCKS` — used for portal components like
dialog/sheet/menus and near-empty ones like table/chart/image), else the
component's clipped, non-interactive demo from the demo registry, else the title.
`ComponentGallery` is a client component **by necessity** — `demoRegistry` is
exported from a `"use client"` module and reads as an empty proxy from a server
component. Clicking a card goes to `/docs/components/<slug>`, which has a
`loading.tsx` skeleton.

## Tests

`packages/ui` uses **Vitest + Testing Library** (jsdom). `pnpm test` at the
root, or `pnpm --filter @kinetixui/ui test`.

- `src/components-smoke.test.tsx` — globs every `stories/*.stories.tsx` and
  mounts it; a broken component render fails here.
- `src/components-behavior.test.tsx` — targeted assertions for the
  design-source-native components (Button variants / `asChild`, Input
  `aria-invalid`, Accordion open, …).
- `test/setup.ts` shims the DOM APIs jsdom lacks (`matchMedia`,
  `ResizeObserver`, pointer capture, `HTMLMediaElement.play`).
- Test files are excluded from `packages/ui` `tsc` (they pull `vitest` /
  `@testing-library`, dev-only) — same treatment as `src/stories`.

## Rendered gates and negative controls

Four rules, each measured rather than reasoned. They were learned on the
website decoration work that PRs #434 and #447 did, and that work's visual
direction has since been superseded — but none of these four rules was ever
about the decoration. They apply to any rendered gate, the polygon hero gates
included, so they are recorded here rather than left to be closed along with
the PRs that found them.

### A rendered gate can keep passing after it stops observing its subject

A file gate that stops finding its subject usually throws. A **rendered** gate
that stops finding its subject can keep **passing**, because it measures a
relation between two renderings, and two renderings of the wrong thing still
relate to each other.

So a rendered row is not evidence until something has been shown to make it
fail. AE-2A wrote a row comparing two plates, could not make it fail in a
controlled way, and **dropped the row** rather than ship it as decoration. That
is the correct outcome for an uncontrollable row: delete it, do not keep it
green.

### Authored CSS the content scan never sees disappears from the built stylesheet

Tailwind removes a hand-written `@layer components` rule that no file under the
content globs names. Measured: of four primitives authored into `globals.css`
with only one of them referenced, the built CSS under
`apps/web/.next/static/css` carried the other three **zero** times. They would
have passed review, sat in source, and reached no visitor.

Two rules follow:

- Author a utility **with its first consumer**, never ahead of it. Safelisting
  instead pushes CSS nobody uses onto every page.
- A gate asserting that a treatment exists must assert it **in the built
  output**, not in source. Source presence is not shipped presence.

### A harness that mutates built files behind a server needs a served-probe pre-flight

Only when both halves are true: the harness mutates a file under
`apps/web/.next` **and** the gate reads it over HTTP from `next start`. Then the
mutation can be on disk while the browser is served something else, and **every
control in the suite "passes" having tested nothing**. The guard is to prove the
server serves a mutation before trusting any control, and to refuse to run
otherwise (`sha` is the harness's own SHA-256 helper; `basename` from
`node:path`):

```js
// Before the first control: does `next start` actually serve a mutated built file?
const before = readFileSync(cssFile, "utf8");
const beforeSha = sha(cssFile);
writeFileSync(cssFile, before + "\n.probe{color:#123456}\n");
const served = execFileSync("curl", ["-s", `${BASE}/_next/static/css/${basename(cssFile)}`], { encoding: "utf8" });
writeFileSync(cssFile, before);
if (sha(cssFile) !== beforeSha) throw new Error("pre-flight: could not restore byte-for-byte; refusing to run");
if (!served.includes("probe")) throw new Error("pre-flight: the server did not serve the mutation — every control below would be vacuous");
```

**No harness in this repository needs it today**, and that is worth knowing
before anyone adds it. `scripts/seo-negative-controls.mjs` and
`scripts/editorial-negative-controls.mjs` mutate built files, but `check-seo.mjs`
reads `apps/web/.next/server/app/**.html` **from disk** — no server, no gap.
`scripts/docs-column-negative-controls.mjs` runs a server but mutates **source
and rebuilds**, so its mutation is in the build by construction, and its
`withServer` already requires `r.ok` on the page under test rather than merely a
response. A harness that injects a style tag into a live browser context — the
shape `scripts/home-systems-negative-controls.mjs` uses — has no gap either.

So: adopt the recipe when a harness first takes the mutate-built-files-behind-a-
server shape. Do not add it to the four above, where it would guard nothing.

### Built-file mutation cannot reach a prerendered route's markup — unexplained

Open item, recorded because the next person will otherwise spend the same day on
it. For the site footer's route, `index.html`, `index.rsc` and the one server
chunk that renders the footer were each mutated alone and together, on a
verified-fresh server, and **the served markup kept the original every time** —
while a `throw` prepended to that chunk **does** 500 the route, so the chunk is
loaded. The payload the markup actually comes from was never located.

Consequence, which holds whatever the explanation turns out to be: **an
assertion about markup cannot be controlled from built output.** Its control has
to patch the source and rebuild, which is slower and unambiguous. Restore from
the bytes read before mutating, verify SHA-256, and treat a control that did not
come back byte-for-byte as failed however its row read — otherwise the next
control measures a tree nobody authorized.

## CI

`.github/workflows/ci.yml` — builds tokens → ui → registry → site and runs the
`@kinetixui/ui` tests on every push/PR; fails if generated output
(`packages/tokens/dist`, `apps/web/public/r`) is stale. The `@kinetixui/ui`
typecheck step is `continue-on-error`.

Other workflows:
- `native-{compose,swiftui,flutter}.yml` — path-filtered; compile each native
  port (`gradle assembleDebug` / `swift build` / `flutter analyze` + `flutter
  test`).
- `release.yml` — Changesets on push to `main`: opens a **Version Packages** PR
  when changesets are pending, publishes `@kinetixui/{tokens,ui,cli}` to npm on
  merge, and creates the GitHub Release.
- `publish-{compose,swiftui,flutter}.yml` — `workflow_dispatch`, inert until the
  corresponding registry secret is set; dry-run by default.
