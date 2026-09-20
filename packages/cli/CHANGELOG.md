# @kinetixui/cli

## 0.20.1

No changes in this release.

## 0.20.0

No changes in this release.

## 0.19.0

No changes in this release.

## 0.18.0

### Minor Changes

- 5d5fdcf: Add role tokens on top of `primary`: `action` (+ `action-foreground`), `link`, `focus` and `brand` (+ `brand-foreground`), plus explicit `action-hover` / `action-pressed` for the native ports. `action`, `link` and `focus` default to `primary` / `ring` as live `var()` references in both themes, so an existing theme that only sets `--primary` keeps working, while `--action` can now be overridden on its own to split the interactive colour from `primary`. Components now read the role tokens (`bg-action`, `text-link`) instead of `primary` — no visual change with the default theme — and `Fab` no longer uses a hard-coded blue hover that inverted in dark mode. `kinetixui theme create/build` and the web theme-builder accept the new tokens (optional overrides). SwiftUI, Compose and Flutter get `action`, `actionHover`, `actionPressed`, `brand`, `link` and `focus` colours in their compiled tokens. **Upgrade note:** components using `bg-action` / `text-link` need the matching `@kinetixui/ui/tailwind.config` preset, so update the package when re-adding components.

## 0.17.0

### Minor Changes

- 10daf9c: `kinetixui inspect <name>` now shows a component's first release and status, its parts (the component and its sub-components) with the props each declares itself, and skips the empty "Variants" header for components with no variant matrix. Backed by component specs, which now exist for every component (previously only the 18 that define a `cva()` variant matrix) and are extracted from the TypeScript types.

## 0.16.1

### Patch Changes

- e5ea973: Fix five issues found in a code-review pass over the commands added this session (`inspect`/`doctor`/`parity`/`theme`/`lint`):
  
  - **`theme create`/`theme build`**: the `name` argument now goes through the same charset validation every other user-supplied identifier in this CLI already uses (`assertThemeName`, mirroring `assertComponentName`). Previously it was interpolated straight into a filesystem path with no checks — `kinetixui theme create ../../../tmp/evil` could read/write outside `kinetixui-themes/` entirely.
  - **`inspect`**: a malformed `kinetixui.json` no longer aborts the command mid-output with a raw `JSON.parse` error — it now prints a warning on the "Installed" line and continues, matching how `doctor` already handles the identical case.
  - **`doctor`**: now actually checks the `utils` alias (`@/lib/utils`), which was silently skipped before even though `doctor` claims to verify every alias resolves. `utils` points at a file, not a directory like the other three aliases, so it gets its own extension-aware existence check.
  - **`lint`**: the default scan (`components` + `ui` alias dirs) no longer walks the `ui` subtree twice when it's nested inside `components`, the default layout — directories are now deduped by containment before any recursive walk starts, not just after the fact at the per-file level.
  - **`lint`**: hardened the spacing-utility regex so the leading `-?` scopes the whole alternation, not just the padding/margin branch — makes negative arbitrary-value coverage (`-top-[10px]`, `-inset-[6px]`) an explicit, intentional part of the pattern rather than an accidental side effect of how `\b` anchoring happened to behave (verified: both the old and new pattern already caught these cases, so this is a correctness hardening, not a bug fix for a real miss).

## 0.16.0

### Minor Changes

- 8518a03: Add `kinetixui lint [path]` — scans for hardcoded hex colors and arbitrary spacing values in Tailwind utilities and inline styles that should probably be semantic tokens instead. With no path, scans the `components`/`ui` aliases from `kinetixui.json`. Reports `file:line` with a suggestion, skips comments, and is anchored to real Tailwind/style contexts so it doesn't fire on unrelated `#`-prefixed strings (anchor links, URL fragments). Exits non-zero on any hit unless `--no-fail` is passed, so it's CI-safe. Doesn't cover unknown/deprecated tokens, accessibility, or cross-platform inconsistencies yet — each needs infrastructure this doesn't have (a live token list, a real a11y engine, or doesn't apply to a single-platform project).

## 0.15.0

### Minor Changes

- 062a321: Add `theme create <name>` and `theme build <name>` — scaffold a local token override file (`kinetixui-themes/<name>.csv`) and compile it to a drop-in CSS `:root` override block plus a WCAG AA contrast report. Ports the same hex/HSL/contrast math the `/theme-builder` web tool already uses, so the two produce identical output for the same input. CSS output only for now — native (SwiftUI/Compose/Flutter) theme compilation is a separate, larger undertaking and isn't attempted here.

## 0.14.0

### Minor Changes

- 1da762e: Add `kinetixui parity [components...]` — a table of which native platforms carry each component (or a filtered subset), plus a status tag for anything `beta`/`deprecated`. Pulled straight from the registry index (`platform-parity.json`/`component-status.json`, embedded by `pnpm build:registry`), so it can't drift from what the docs site shows.

## 0.13.0

### Minor Changes

- d839098: Add `kinetixui inspect <name>` (show a registry item's description, dependencies, files, and whether it's installed in the current project) and `kinetixui doctor` (check `kinetixui.json`, its aliases, the Tailwind CSS target, registry reachability, and whether anything in your `ui` directory still matches a registry name — exits non-zero on failure, so it's CI-safe).
- 8ceb0aa: `kinetixui inspect <name>` now also prints a component's variant axes and their option names (e.g. `variant`: `Primary`/`Secondary`/`Outline`/…, `size`: `sm`/`md`/`lg`/…) for the ~20 components with a real variant matrix, sourced from a new generated `specs/components/<name>.json` contract manifest served alongside the registry.

## 0.12.0

No changes in this release.

## 0.11.0

No changes in this release.

## 0.10.0

No changes in this release.

## 0.9.0

No changes in this release.

## 0.8.0

No changes in this release.

## 0.7.0

No changes in this release.

## 0.6.5

### Patch Changes

- b1a1fab: Fix `kinetixui --version` reporting a stale hardcoded "0.3.0" instead of the actual published package version. The version is now read from `package.json` and inlined at build time, so it can't drift out of sync with a release again.

## 0.6.4

No changes in this release.

## 0.6.3

### Patch Changes

- ff37bef: Release plumbing: publish via npm **trusted publishing** (OIDC) instead of a long-lived `NPM_TOKEN`. Each package has a trusted publisher (this repo + `release.yml`) configured on npmjs.com; `pnpm publish` exchanges the GitHub Actions OIDC token for a short-lived registry token. No package contents change.

## 0.6.2

### Patch Changes

- ce4184f: The release now publishes via `pnpm -r publish --provenance` (a directory publish) instead of `changeset publish` (which packs to a tarball first — that path drops provenance). Git tags are created with `changeset git-tag`. This is the release that should finally carry an npm provenance attestation.

## 0.6.1

### Patch Changes

- 7f749b9: Publishes now carry an npm **provenance** attestation.
  
  `changeset publish` in this pnpm workspace shells out to `pnpm publish`, which didn't pick up the `NPM_CONFIG_PROVENANCE` workflow env var — so 0.5.1 / 0.6.0 shipped without attestations. `publishConfig.provenance: true` in each package's `package.json` is the tool-agnostic switch; it only fires in CI (OIDC), which is the only place these publish.

## 0.6.0

## 0.5.1

### Patch Changes

- bec7a0c: Security hardening.
  
  - **`@kinetixui/cli`** — validates the registry base URL (http/https only), every component / registry-dependency name, and every npm dependency spec before it reaches a fetch URL or the package manager, and refuses to write a file outside the project root. A hostile registry or a checked-in `kinetixui.json` can no longer steer where files land or what gets installed.
  - **`@kinetixui/ui`** — `chart.tsx` sanitises the identifiers and colour values it interpolates into its inline `<style>` (strips everything but `[\w-]` from identifiers; drops colour values carrying characters that could close the declaration, the rule, or the element).
  
  Published with npm provenance for the first time.

## 0.5.0

### Minor Changes

- 3e0dc4b: **New `azure` primitive ramp + `--primary` is an action blue, set independently
  per theme.** The desaturated navy (`Primay` from Figma) read as near-black once
  pushed for contrast, so `--primary` is now a real blue that pops as a button/link
  colour. A new `color.azure` ramp (15 steps, Tailwind-blue-derived) backs it;
  light and dark map to different steps — two palettes, not one flipped:
  
  - light `--primary` / `--ring` / `--accent-foreground` / `--sidebar-primary` /
    `--sidebar-accent-foreground` / `--sidebar-ring` → `azure.700` `#1d4ed8`
    (6.7:1 on the background, 6.2:1 under `--primary-foreground`).
  - dark `--primary` / `--ring` / `--sidebar-primary` / `--sidebar-ring` →
    `azure.400` `#60a5fa` (`#1d4ed8` would be ~2.9:1 on the near-black dark
    surface; `#60a5fa` clears 7.7:1).
  - `shadow.focus` re-baked per theme (`#1d4ed8` light, `#60a5fa` dark).
  
  **`--secondary` deepened** `green.50` → `green.200` (`#f1f3f1` → `#c7cfc7`) so a
  secondary button/chip actually stands off the white page; `--secondary-foreground`
  `green.600` → `green.700` (`#465245`), 5.2:1 on the new surface.
  
  `--chart-1` stays navy (`blue.500`) — the data-viz ramp is tuned for categorical
  separation, not brand. `check:contrast` passes AA in both themes. Native token
  sets (SwiftUI / Compose / Flutter) and the CLI registry `tokens` style are
  regenerated.

## 0.4.3

### Patch Changes

- 196d4b0: **`--chart-6`, `--chart-7`, `--chart-8`** added to the token contract (light +
  dark, plus the `chart.6/7/8` Tailwind colours) so stacked / categorical charts
  with more than five series stay distinguishable.
  
  **`ChartContainer`** gains `state` (`"loading" | "empty" | "error"` — renders a
  shimmer / message / alert placeholder), `stateMessage`, and `srTable` (a
  visually-hidden `<table>` of the underlying numbers for screen readers).

## 0.4.2

### Patch Changes

- 7ad6a21: **Chart text alternative.** `ChartContainer` now renders `role="img"` with an
  `aria-label` — pass `label` with a one-line summary of what the chart shows
  (WCAG 1.1.1); it falls back to `"Chart"`. Cartesian recipes already pass
  `accessibilityLayer` for keyboard data-point navigation.
- 32779bc: `ChartContainer` now scrubs two redundant Recharts a11y artefacts from its
  rendered output: the `role="img"` (no `<title>`) that Recharts stamps on every
  sector / dot `<path>` — noise, since the container already carries the text
  alternative — and the unnamed `<svg role="application">` its
  `accessibilityLayer` leaves behind, which now gets the container's label. Clears
  axe `svg-img-alt` on chart pages.
- f44e7a2: **Dark-mode focus ring.** The `--shadow-focus{,-destructive,-success,-warning}`
  composites now carry a real dark set built from the dark `--ring` / semantic
  primitives (`tokens/semantic/shadow.dark.json`). Previously they baked a
  light-theme navy that measured ~1.7:1 against the dark surface — below WCAG 2.2
  SC 1.4.11 (3:1); it now clears 8.8:1. New export
  `@kinetixui/tokens/css/extras/dark` (also bundled into
  `registry/kinetixui/globals.css`); add its `@import` after
  `@kinetixui/tokens/css/extras`.
  
  **NumberInput** — the −/+ stepper buttons now draw a `--ring` inset outline on
  `:focus-visible` so keyboard users can tell which control is focused (they
  previously showed only a container-level ring).
- 183abbf: Light-mode `--warning` moved from the Figma `onWarningContainer` orange
  (`#f97907`) to `amber.800` (`#7f5b21`). The orange was **2.7:1** as `text-warning`
  on the page and **2.6:1** in the `Tag` warning variant — both fail WCAG AA; the
  dark-amber clears 5.8–6.1:1. Dark-mode `--warning` is unchanged (bright
  `amber.400`). `check:contrast` now enforces every warning pair with no
  allow-list.

## 0.4.1

### Patch Changes

- 1fc0e08: Light-mode `--destructive` now resolves to `red.500` (`#c60a0a`) instead of the
  Figma `error` value (`#ec5047`), which failed WCAG AA — 3.33:1 as destructive-
  button text and 3.62:1 as `text-destructive` on the page. It now clears
  5.6–6.1:1. Dark mode is unchanged.
  
  Repository metadata (`repository` / `homepage` URLs) updated for the `zedalleys`
  GitHub org.

## 0.4.0

## 0.3.1

## 0.3.0

### Minor Changes

- fe501e3: Add `kinetixui list` to enumerate every component in the registry, and an `--all` flag on `kinetixui add` to install all of them in one command.

> Published as `@kinetixui/cli` since 0.2.0. The `0.1.0` release under the
> unscoped name `kinetixui` is deprecated; the installed command is still
> `kinetixui` (run via `npx @kinetixui/cli`).

## 0.2.0

### Minor Changes

- b51e6e6: Add the `kinetixui` CLI (`packages/cli`) — a first-party install tool for the
  component registry:
  
  - **`kinetixui init`** — writes `kinetixui.json` (your import aliases, global
    CSS path, `src/` layout) and pulls in the token contract.
  - **`kinetixui add <name...>`** — resolves registry dependencies
    transitively, installs the npm packages a component needs with whichever
    package manager your project already uses (pnpm / yarn / bun / npm,
    detected from the lockfile), and writes source files into your configured
    directories. `--overwrite` to replace existing files.
  - Own config format (`kinetixui.json`) and own registry-item `$schema`
    (`https://kinetixui.com/schema/registry-item.json`) — no other tool's CLI
    or config file needed to consume the registry.
