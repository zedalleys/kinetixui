# KinetixUI — Platform Accessibility Audit

**Date:** 2026-09-06
**Scope:** `apps/web` (kinetixui.com) in **light and dark**, plus the token
contract that feeds all four component libraries.
**Standard:** WCAG 2.2 AA.

## Method

1. **Token contrast** — `scripts/check-contrast.mjs` resolves every semantic
   colour (light + dark) to primitive hex and checks the foreground/surface
   pairs components actually render. The script had a resolver bug (below); it
   was fixed and extended as part of this audit, so its output is now the
   authoritative ledger.
2. **Source review** — every page under `apps/web/src/app`, the shared chrome
   (`site-header`, `site-footer`, `mobile-nav`, `mode-toggle`, `docs` layout),
   and the `@kinetixui/ui` components for: landmark/heading structure, focus
   visibility, keyboard operability, names on icon-only controls, state exposed
   to AT (`aria-pressed` / `aria-expanded`), colour-only signalling, and
   `prefers-reduced-motion` coverage.
3. **Live render pass (axe-core, light + dark)** — **pending.** The Claude
   Chrome extension was not connected when this ran; the dev server
   (`localhost:3100`) is up and ready. This pass adds automated DOM coverage and
   visual confirmation; nothing below depends on it.

## Severity key

| | |
|---|---|
| **Critical** | Blocks a core task for some users; ship-blocker. |
| **Serious** | Fails an AA success criterion on a common path. |
| **Moderate** | Fails AA on a narrower path, or a robustness gap. |
| **Minor** | Below-AA polish, or best-practice deviation. |

---

## A. Token contrast ledger (after fixes)

`node scripts/check-contrast.mjs` → **PASS** (2 tracked exceptions, see A2).

### A1. What was wrong

| # | Sev | Finding | Detail |
|---|-----|---------|--------|
| 1 | **Serious** | `scripts/check-contrast.mjs` could not resolve `{color.semantic.*}` refs, so it **silently skipped** `destructive / destructive-foreground` in light mode. The `/docs/accessibility` page cited this script as proof "every pair meets AA in both themes." | Fixed — resolver now flattens the per-mode `semantic` block and follows one hop of indirection. Pair list extended from 10 → 19 text pairs (adds `destructive`, `success`, `warning`, `info`, `sidebar-*` as text; `tertiary` as non-text). |
| 2 | **Serious** | **Light `--destructive` fails AA.** Figma `error` `#ec5047`: **3.33:1** under `destructive-foreground` (destructive Button), **3.62:1** as `text-destructive` on the page (Alert, Field error). | Fixed — light `--destructive` → `red.500` `#c60a0a` = **5.60 / 6.09:1**. Changed in `tokens/semantic/color.light.json` + the `.theme-light` block of `globals.css`; `pnpm build:tokens` re-run. This intentionally stops tracking the Figma `error` value (noted in the token `$description`). |
| 3 | **Serious** | **`--shadow-focus` has no dark variant.** `tokens/semantic/shadow.json` bakes `#1b3c53` navy. In dark mode the focus ring on Button / Input / Select / Textarea / Fab / NumberInput / InputGroup / FileUpload lands at **1.70:1** against the page, **1.56:1** on a card — fails SC 1.4.11 / 2.4.13 (3:1). The other focus mechanism (`focus-visible:ring-ring`, used by checkbox/radio/switch/menus/list rows) was already fine (8.8:1 dark). | **Partially fixed** — `apps/web/src/app/globals.css` now re-points `--shadow-focus{,-destructive,-success,-warning}` at the theme-aware `--ring` / semantic tokens under `html.dark`. **Upstream gap remains:** the token package still emits a light-only value, so consumers of the raw registry `globals.css` don't get the fix. → Recommendation R1. |

### A2. Tracked exceptions (allow-listed in `check-contrast.mjs`, still fail CI if a *new* pair regresses)

| Sev | Pair | Ratio (light) | Where it renders |
|-----|------|---------------|------------------|
| **Serious** | `warning` as text on the page | **2.70:1** | `Alert` / `Field` / `Inform` / `Rating` — `text-warning` |
| **Serious** | `warning` on `warning-foreground` | **2.56:1** | `Tag` `variant="warning"` (orange text on pale-orange fill) |

`--warning` light is `#f97907`. Dark mode is fine (11–13:1). This needs a design
decision on the value, not a one-liner — see **R2**. Until then, `--warning`
should be treated as icon / large-text-only in light mode.

### A3. Non-text cues below 3:1 — acceptable *as designed*

`--accent` (1.08 light / 1.24 dark), `--border` / `--input` (2.2 / 2.7),
`--tertiary` (2.2 / 2.7 — Switch off-track), `--sidebar-border` (1.3 / 2.5).
These are intentionally subtle and, per `components` code, are **never the only
cue** — hover/selected states also draw a `--ring` inset outline, and the Switch
pairs its track with a moving thumb + `aria-checked`. No change. Keep the
"never the only cue" rule when adding components (documented on
`/docs/accessibility`).

---

## B. Page & component findings

### Fixed in this pass

| # | Sev | Area | Finding | Fix |
|---|-----|------|---------|-----|
| B1 | **Serious** | `apps/web/src/app/layout.tsx` | No **skip link** — every page starts with a 2-row header (~7 nav links + tools) with no way to bypass it (WCAG 2.4.1). | Added a `sr-only` → `focus:not-sr-only` "Skip to content" link targeting `<main id="main-content">`. |
| B2 | Moderate | `component-gallery.tsx` (`/components`) | Cards had **hover styling only, no `:focus-visible`** — keyboard focus was invisible on a 72-item grid. | Every card + filter control now draws `focus-visible:ring-2 ring-ring ring-offset-2`. |
| B3 | Moderate | `mobile-nav.tsx` | Menu toggle had `aria-label` but no **`aria-expanded` / `aria-controls`**; panel had no id; `<nav>` unlabelled; button had no focus ring. | Added `aria-expanded`, `aria-controls="mobile-nav-panel"`, `aria-label="Mobile"` on the nav, and a focus ring. |
| B4 | Minor | `mode-toggle.tsx` | Rendered a **visible** `<span>Toggle theme</span>` next to the icon in a `size="icon"` button that also has `aria-label` — double-labelled and visually clipped. | `<span className="sr-only">`. |
| B5 | Minor | `site-header.tsx` | Primary `<nav>` had no accessible name (two `<nav>`s across breakpoints). | `aria-label="Primary"`. |
| B6 | Minor | `component-preview.tsx` | The preview/code `Tabs.List` and the platform `Tabs.List` were both unnamed. | `aria-label="View preview or code"` / `aria-label="Platform"`. |
| B7 | Minor | `component-meta.tsx` | `<dl>` spec strip had no accessible name. | `aria-label="Component metadata"`. |

### Not fixed — recommended (ranked)

| # | Sev | Area | Finding | Recommendation |
|---|-----|------|---------|----------------|
| B8 | **Serious** | `@kinetixui/ui` `number-input.tsx` | The **−/+ stepper buttons** use `outline-none` with a `:hover`-only style — no `:focus-visible`. Keyboard focus shows only as a container-level `focus-within:shadow-focus`, so you can't tell which control is focused; the middle `<input>` has the same issue. | Add `focus-visible:bg-accent focus-visible:text-foreground focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring focus-visible:outline-none` to both buttons (matches the pattern already in `list.tsx` / `input-group.tsx`). Ships to consumers → needs a `ui` rebuild + changeset. Patch is a 1-line class add per button. |
| B9 | Moderate | `/colors` `page.tsx` | The **hex/rgb/hsl format toggle** exposes its active state with `bg-primary` only — no `role="group"` / `aria-pressed`. Swatch copy-buttons have **no `:focus-visible`** and reveal their selected ring on `onMouseEnter` only (no `onFocus`). No `aria-live` confirmation after copy. | Mirror the pattern used in the new gallery filter (`role="group"` + `aria-pressed`); add `focus-visible:ring-2 ring-ring`; add an `onFocus`/`onBlur` alongside the mouse handlers; add a visually-hidden `aria-live="polite"` "Copied <value>" region. |
| B10 | Moderate | `charts-content.tsx` + `@kinetixui/ui` `chart.tsx` | Recharts is rendered **without `accessibilityLayer`** and with **no text alternative** — charts are not keyboard-navigable and convey data by colour + position only (SC 1.1.1, 2.1.1, 1.4.1). | Pass `accessibilityLayer` to every chart; give `ChartContainer` a `role="img"` + `aria-label` summary prop; offer an optional visually-hidden `<table>` fallback of the series data. Tracked as a cross-cutting item in `COMPONENT-ADDITIONS.md` §2. |
| B11 | Minor | `/charts`, `/blocks` | Heading order **skips h2** — page `<h1>` then `Showcase`/block `<h3>`. | `Showcase` should render `<h2>` (or the pages should introduce an h2 section head, which `/colors` and `/components` already do via `SectionHead`). |
| B12 | Minor | `mobile-nav.tsx` | The open menu is a plain `{open && <div>}` — **no `Esc` to close, no focus move** into/out of the panel, background not inert. | Close on `Esc`; move focus to the first link on open and back to the toggle on close; `inert` the page behind it (or switch to the `Sheet` primitive, which already does all three). |
| B13 | Minor | `/colors` `page.tsx` | The ramp jump-list `<nav>` (`<a href="#blue">…`) has no accessible name. | `aria-label="Jump to a ramp"`. |
| B14 | Minor | `theme-provider` / first paint | `defaultTheme="system"` with `enableSystem` is correct, but verify the pre-hydration theme script doesn't cause a flash that could disorient (it uses `disableTransitionOnChange`, so likely fine — confirm in the live pass). | Confirm in axe/visual pass B (pending). |

### Confirmed good (no action)

- **Landmarks** — `<header>` / `<nav>` / `<main>` / `<footer>` all present;
  `<main>` now has an id/skip target.
- **`prefers-reduced-motion`** — `globals.css` has a thorough block: every
  keyframe animation (`kx-underline`, `kx-grid-bg`, marquee, fan wires, caret,
  flow bars, `[data-reveal]`, hero enter) is disabled or frozen. Component
  transitions are `transition-colors` only.
- **Icon-only controls** — `Button size="icon"`, `Fab`, `mobile-nav`, GitHub
  link, dialog/modal/inform close buttons, number-input steppers all carry an
  `aria-label`.
- **Radix under everything interactive** — menus, dialogs, tabs, combobox,
  disclosures inherit correct roles, focus trapping, type-ahead, `Esc`.
- **Dark-mode text contrast** — every text pair 5.8:1 or better.
- **`lang="en"`**, `metadataBase`, per-page `<title>` templates.

---

## C. Recommendations carried out of this audit

- **R1 — give `shadow.json` a dark set.** Add `shadow.dark.json` (or a `$extensions`
  mode) with `focus*` rings built from the dark `--ring` / semantic values, and
  wire a dark output in `style-dictionary/build.mjs` so
  `packages/tokens/dist/web/extras.css` emits a `.dark { --shadow-focus… }`
  block. Removes the app-level override in `globals.css` and fixes every
  downstream consumer. Also add the four `shadow-focus*` composites to
  `check-contrast.mjs`'s non-text pass so a regression is caught.
- **R2 — decide the light `--warning` value.** Options, cheapest first:
  (a) darken to ~`amber.800` `#7f5b21` (6.1:1) — reads brown, loses the orange;
  (b) keep `#f97907` as a large-text/icon token and add `--warning-strong`
  (dark amber) for `Tag` / body text; (c) invert the `Tag` warning variant to a
  pale fill + dark-amber text. Then remove the two entries from `KNOWN_SUBAA`.
- **R3 — run the axe-core light/dark pass** once the Chrome extension is
  connected (or add `@axe-core/playwright` as a dev dep and a
  `scripts/a11y.mjs` that walks the route list headless — better, since it can
  run in CI next to `check:contrast`).
- **R4 — apply B8** (number-input focus) with a changeset; it's the only
  `@kinetixui/ui` code change and it's a one-liner per button.
- **R5 — chart accessibility** (B10) — see `COMPONENT-ADDITIONS.md` §2.

## Verification

```
node scripts/check-contrast.mjs      # PASS — 19 text pairs, both themes, 2 tracked
cd apps/web && node node_modules/next/dist/bin/next build   # clean
```

Files changed for the fixes above:
`scripts/check-contrast.mjs`, `tokens/semantic/color.light.json`,
`apps/web/src/app/globals.css`, `packages/tokens/dist/**` (generated),
`apps/web/src/app/layout.tsx`, `apps/web/src/components/{mobile-nav,mode-toggle,site-header,component-preview,component-meta,component-gallery}.tsx`,
`apps/web/src/app/docs/accessibility/page.mdx`.
