# Operational notes

Current state of the live site and publishing pipeline. `DEPLOY.md` is the
step-by-step setup guide; this file is what's actually running.

_Last updated: 2026-09-03._

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
- `packages/ui/tsconfig.json` excludes `src/stories` from `tsc` (stories import
  `@storybook/react`, an `apps/docs`-only dep).
- Not built in CI. `pnpm build-storybook` builds it locally.

## Component doc "Code" tab

`ComponentPreview` (`apps/web/src/components/component-preview.tsx`) renders the
Code tab as per-platform sub-tabs (React · HTML · SwiftUI · Compose · Flutter),
each with a copy button.

- The **React** snippet is canonical and lives in the demo registry
  (`demoRegistry[name].source`).
- The other platforms come from `apps/web/src/registry/platform-code.ts` —
  keyed by demo name, one map so there's a single source per language. Native
  snippets compose the platform's own primitives with the real
  `@kinetixui/tokens` output (`KinetixColor.color*` for SwiftUI,
  `KinetixTheme.color*` for Compose/Flutter, CSS vars for HTML).
- A component with no `platform-code.ts` entry shows just the React pane.
  Currently populated: button, badge, alert, card, input, textarea, switch,
  checkbox, separator, avatar. Add more by extending that file.

## `/components` gallery

`apps/web/src/app/components/page.tsx` → `<ComponentGallery>`
(`apps/web/src/components/component-gallery.tsx`). Each card renders the
component's canonical demo from the demo registry as a clipped, non-interactive
thumbnail. `ComponentGallery` is a client component **by necessity** —
`demoRegistry` is exported from a `"use client"` module and reads as an empty
proxy from a server component.

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

## CI

`.github/workflows/ci.yml` — builds tokens → ui → registry → site and runs the
`@kinetixui/ui` tests on every push/PR; fails if generated output
(`packages/tokens/dist`, `apps/web/public/r`) is stale. The `@kinetixui/ui`
typecheck step is `continue-on-error`.
