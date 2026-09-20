# KinetixUI — Platform Accessibility Audit

**Date:** 2026-09-06
**Scope:** `apps/web` (kinetixui.com) in **light and dark**, plus the token
contract that feeds all four component libraries.
**Standard:** WCAG 2.2 AA.

> **Note (2026-09-06, post-audit):** the token contract has moved on since this
> ledger was written — `--primary` / `--ring` are now an `azure` action blue
> (`#1d4ed8` light, `#60a5fa` dark), `--secondary` deepened to `green.200`, and
> `shadow.focus` was re-baked per theme. `scripts/check-contrast.mjs` still
> **PASS**es AA in both themes; the current resolved values live in
> `TOKENS.md`, `apps/web/src/lib/token-contract.ts`, and `/docs/changelog`.
> Hex values in the findings below are as they were at audit time.

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
3. **Rendered axe-core passes** — **done (2026-09-19).** Two layers, both in CI: a jsdom pass (`packages/ui/src/components-a11y.test.tsx`, with `KNOWN` baseline) and a real-browser pass (`scripts/a11y-browser.mjs`, `pnpm check:a11y-browser`, workflow `a11y-browser.yml`) that opens every Storybook story in headless Chromium in **light and dark** with every axe rule on, including colour contrast. `a11y-baseline.json` is **empty**: every story is clean in light and dark. A new violation fails the build. Keyboard interaction, focus trapping/return, forced-colors, reduced motion and the per-component ARIA models (DataGrid, TreeView, Tour, Kanban, MultiSelect, ColorPicker) were covered in follow-up passes the same day — see "Keyboard pass", "Baseline closed out" and "Forced colors, reduced motion, Kanban" below.

## Severity key

| | |
|---|---|
| **Critical** | Blocks a core task for some users; ship-blocker. |
| **Serious** | Fails an AA success criterion on a common path. |
| **Moderate** | Fails AA on a narrower path, or a robustness gap. |
| **Minor** | Below-AA polish, or best-practice deviation. |

---

## A. Token contrast ledger (after fixes)

`node scripts/check-contrast.mjs` → **PASS** (0 tracked text exceptions, see
A2; 5 tracked non-text exceptions — 10 counting both themes — see A3).

### A1. What was wrong

| # | Sev | Finding | Detail |
|---|-----|---------|--------|
| 1 | **Serious** | `scripts/check-contrast.mjs` could not resolve `{color.semantic.*}` refs, so it **silently skipped** `destructive / destructive-foreground` in light mode. The `/docs/accessibility` page cited this script as proof "every pair meets AA in both themes." | Fixed — resolver now flattens the per-mode `semantic` block and follows one hop of indirection. Pair list extended from 10 → 19 text pairs (adds `destructive`, `success`, `warning`, `info`, `sidebar-*` as text; `tertiary` as non-text). |
| 2 | **Serious** | **Light `--destructive` fails AA.** Figma `error` `#ec5047`: **3.33:1** under `destructive-foreground` (destructive Button), **3.62:1** as `text-destructive` on the page (Alert, Field error). | Fixed — light `--destructive` → `red.500` `#c60a0a` = **5.60 / 6.09:1**. Changed in `tokens/semantic/color.light.json` + the `.theme-light` block of `globals.css`; `pnpm build:tokens` re-run. This intentionally stops tracking the Figma `error` value (noted in the token `$description`). |
| 3 | **Serious** | **`--shadow-focus` had no dark variant.** `tokens/semantic/shadow.json` bakes `#1b3c53` navy. In dark mode the focus ring on Button / Input / Select / Textarea / Fab / NumberInput / InputGroup / FileUpload landed at **1.70:1** against the page, **1.56:1** on a card — fails SC 1.4.11 / 2.4.13 (3:1). | **Fixed at the source (was R1).** New `tokens/semantic/shadow.dark.json` + a both-passes `css-extras` build emit `.dark { --shadow-focus* }` from the dark `--ring` / `--destructive` / `--success` / `--warning` primitives → `extras.dark.css`, bundled into `registry/kinetixui/globals.css` and exported as `@kinetixui/tokens/css/extras/dark`. Dark ring now **8.83:1** on the page. Every downstream consumer gets it; the earlier `globals.css` `html.dark` override is removed. |

### A2. Tracked exceptions — none

`check-contrast.mjs`'s `KNOWN_SUBAA` allow-list is now empty. The two light
`--warning` failures below have been fixed:

| Was | Now | Where |
|-----|-----|-------|
| `warning` as text on the page — **2.70:1** | **6.14:1** | `Alert` / `Field` / `Inform` / `Rating` |
| `warning` on `warning-foreground` — **2.56:1** | **5.81:1** | `Tag` `variant="warning"` |

Light `--warning` moved from the Figma `onWarningContainer` orange (`#f97907`)
to `amber.800` (`#7f5b21`) — a muted dark-amber that reads as "caution" and
clears AA. **Dark `--warning` is unchanged** (bright `amber.400`, 11–13:1).

### A3. Non-text cues below 3:1 — acceptable *as designed*

`--accent` (1.08 light / 1.24 dark), `--border` / `--input` (2.2 / 2.7),
`--tertiary` (2.2 / 2.7 — Switch off-track), `--sidebar-border` (1.3 / 2.5).
These are intentionally subtle and, per `components` code, are **never the only
cue** — hover/selected states also draw a `--ring` inset outline, and the Switch
pairs its track with a moving thumb + `aria-checked`. No change. Keep the
"never the only cue" rule when adding components (documented on
`/docs/accessibility`).

**Now CI-enforced, not just documented (2026-09-15):** these five pairs are
the `KNOWN_SUB3` tracked-exceptions set in `check-contrast.mjs`, seeded from
this section — the check was previously report-only for non-text pairs and
couldn't fail the build. Any *new* sub-3:1 non-text pair (not on this list)
now fails `pnpm check:contrast` / CI, the same way `KNOWN_SUBAA` already
gates text pairs. Retheming one of the five on purpose means updating
`KNOWN_SUB3` deliberately alongside this section, not discovering a silent
regression later.

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
| B14 | Minor | `theme-provider` / first paint | `defaultTheme="system"` with `enableSystem` is correct, but verify the pre-hydration theme script doesn't cause a flash that could disorient (it uses `disableTransitionOnChange`, so likely fine — confirm in the live pass). | **Confirmed fine (2026-09-20)** — see below. |

Cross-cutting chart items (loading/empty/error states, legend toggle, pattern
fills, brush/zoom) remain in `COMPONENT-ADDITIONS.md` §2.

### Fixed in a follow-up pass (`a11y/focus-and-audit-followups`)

| # | Sev | Area | Finding | Fix |
|---|-----|------|---------|-----|
| B8 | **Serious** | `@kinetixui/ui` `number-input.tsx` | The **−/+ stepper buttons** used `outline-none` with a `:hover`-only style — no `:focus-visible`; keyboard focus showed only as a container-level `focus-within:shadow-focus`. | Both steppers now draw `focus-visible:bg-accent focus-visible:text-foreground focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring` (the `list.tsx` / `input-group.tsx` pattern). Ships in the next `@kinetixui/ui` release. |
| B9 | Moderate | `/colors` `page.tsx` | hex/rgb/hsl toggle exposed active state via `bg-primary` only; swatch buttons had no `:focus-visible` and no post-copy announcement. | Toggle: `role="group"` + `aria-pressed` + focus ring. Swatches: `focus-visible:border-primary/ring-1` + a descriptive `aria-label`. Added a visually-hidden `aria-live="polite"` "Copied …" region. |
| B13 | Minor | `/colors` `page.tsx` | Ramp jump-list `<nav>` had no accessible name; its links had no focus ring. | `aria-label="Jump to a ramp"` + `focus-visible:ring-2`. |
| B10 | Moderate | `@kinetixui/ui` `chart.tsx` + `/charts` | No text alternative for charts (SC 1.1.1) — colour + position only. (`/charts` Cartesian recipes already passed `accessibilityLayer`.) | `ChartContainer` now renders `role="img"` + `aria-label`, driven by a new `label` prop (falls back to `"Chart"`); `/charts` intro + the Bar recipe show the pattern. |
| B11 | Minor | `Showcase` (`/charts`, `/blocks`) | Heading order skipped h2 — page `<h1>` then `Showcase` `<h3>`. | `Showcase` now renders `<h2>`. |
| B12 | Minor | `mobile-nav.tsx` | Open menu had no `Esc` to close and no focus movement. | `Esc` closes and returns focus to the trigger; opening moves focus to the first link. (Full `inert`-background trap deferred — a `Sheet` swap is the cleaner long-term fix.) |

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
- **First-paint theme (B14, checked 2026-09-20)** — in a production build the `next-themes`
  script is a blocking inline script emitted before any page content, and the CSP
  (`script-src 'unsafe-inline'`) allows it. With no stored choice the page loads
  already dark under a dark system preference and light under a light one, and a
  stored `light` override beats a dark system preference — `<html>` has the right class
  and background on first load in all three cases, so there is no wrong-theme flash.
- **Dark-mode text contrast** — every text pair 5.8:1 or better.
- **`lang="en"`**, `metadataBase`, per-page `<title>` templates.

---

## C. Recommendations carried out of this audit

- **R1 — DONE** (`a11y/focus-and-audit-followups`). `tokens/semantic/shadow.dark.json`
  added; `style-dictionary/sd.config.mjs` runs `css-extras` on both passes and
  `hooks.mjs` takes a `selector`; `extras.dark.css` is emitted, bundled into
  `registry/kinetixui/globals.css`, and exported as
  `@kinetixui/tokens/css/extras/dark`. Dark focus ring: 1.70 → **8.83:1**.
  **Follow-up done (2026-09-20):** `check-contrast.mjs` now checks the 1px edge of
  every `--shadow-focus*` ring against the page in both themes. It immediately
  caught the light `focus-warning` ring still on the old orange `#f97907`
  (**2.70:1**); it is now `amber.800` `#7f5b21` (5.8:1), matching light `--warning`.
- **R2 — DONE.** Light `--warning` → `amber.800` `#7f5b21` (6.1 / 5.8:1). Chosen
  over adding a second `--warning-strong` token to keep the contract
  single-valued. Dark stays bright `amber.400`. `KNOWN_SUBAA` is now empty.
- **R3 — real-browser axe light/dark pass — done** (see above); originally: once the Chrome extension is
  connected (or add `@axe-core/playwright` as a dev dep and a
  `scripts/a11y.mjs` that walks the route list headless — better, since it can
  run in CI next to `check:contrast`).
- **R4 — DONE.** B8 (number-input focus) shipped with a changeset.
- **R5 — partly done.** The chart text alternative (B10) shipped; the remaining chart
  items (loading/empty/error states, legend toggle, pattern fills, brush/zoom) are
  tracked in `COMPONENT-ADDITIONS.md` §2.

## Verification

```
node scripts/check-contrast.mjs      # PASS — 19 text pairs (0 tracked) + 7 non-text pairs (5 tracked), both themes
cd apps/web && node node_modules/next/dist/bin/next build   # clean
```

Files changed for the fixes above:
`scripts/check-contrast.mjs`, `tokens/semantic/color.light.json`,
`apps/web/src/app/globals.css`, `packages/tokens/dist/**` (generated),
`apps/web/src/app/layout.tsx`, `apps/web/src/components/{mobile-nav,mode-toggle,site-header,component-preview,component-meta,component-gallery}.tsx`,
`apps/web/src/app/docs/accessibility/page.mdx`.

## Browser pass findings (2026-09-19)

First run of the browser pass. Storybook's own canvas had no background in either theme (`body { background: var(--background) }` — the tokens are bare HSL channels, so it needed `hsl()`); that produced ~55 false dark-mode contrast failures and is fixed. What remains in `a11y-baseline.json`:

| Rule | Count | Notes |
|---|---|---|
| `button-name` | 14 | icon-only buttons in demo stories without an accessible name — story or component |
| `label` | 12 | inputs without an associated label (mostly demo stories) |
| `aria-input-field-name` | 10 | sliders / comboboxes without names |
| `aria-progressbar-name` | 8 | Progress / CircularProgress stories |
| `scrollable-region-focusable` | 6 | scroll areas not keyboard-reachable — likely real |
| `color-contrast` | 0 | **All fixed.** Banner/Inform `information` text now uses `text-info-on-container`. Button Primary pressed is `bg-primary/85` (4.54:1; 80% was 4.11) and Secondary pressed is solid like hover (90% was 3.97). `check:contrast` now also models text on partially-transparent fills (`ALPHA_TEXT_PAIRS`), so this class of bug — a state that dims its fill toward the page — fails CI statically. |
| other | 14 | `aria-required-children/parent`, `nested-interactive`, `select-name`, duplicate banner landmarks (two Banners in one story) |

Dark mode has **no** contrast failures once the canvas background is correct.

## Keyboard pass findings (2026-09-19)

`packages/ui/src/components-keyboard.test.tsx` (29 tests) exercises focus, Tab order, arrow keys, Escape and RTL. The Radix-based components (Dialog, DropdownMenu, Popover, Tabs, RadioGroup, Checkbox, Switch, Slider) passed without changes, including focus trap/return and RTL arrow mirroring. The hand-built widgets did not:

| Component | Finding | Status |
|---|---|---|
| `Tour` | `role="dialog" aria-modal` with no accessible name, no focus move on open, no Tab trap, no focus restore | **Fixed** |
| `MultiSelect` | opened by keyboard but focus stayed on the combobox, so arrow keys never reached the option list — could not choose an option without a mouse | **Fixed** (search field is focused on open; focus returns to the combobox on close) |
| `DataGrid` | sortable headers and editable cells were not focusable; editing was double-click only | **Fixed** (Tab, Enter / Space, Enter / F2, Esc) |
| `DataGrid` | no arrow-key movement between cells; column reorder / resize pointer-only | **Fixed** — roving-tabindex ARIA grid model (arrows, Home/End, Ctrl corners, PageUp/Down, RTL-aware, virtualization-aware), `aria-rowindex` / `aria-colindex` / `aria-rowcount`, Alt+arrows reorder and Shift+arrows resize with a live-region announcement |
| `ColorPicker`, `Slider` | `aria-label` was on the Radix slider root, but the element with `role="slider"` is the thumb, so every slider was unnamed | **Fixed** |
| `TreeView` | none — follows the WAI-ARIA tree pattern | — |

Also corrected the accessibility docs page, which claimed every interactive component is a Radix primitive with correct keyboard behaviour by default. Forced-colors, reduced-motion and `KanbanBoard` keyboard drag were then covered in the browser pass — see the next sections.

## Baseline closed out (2026-09-19)

The browser baseline went 58 → **0** and the jsdom `KNOWN` list to empty. Two kinds of fix:

**Component defects**
- `Banner` used `role="banner"` (the page's site-header landmark) for a notice strip — two banners on one page is invalid. Removed the role.
- `List`: a pressable row was `role="button"` standing in for `role="listitem"`, so a list's children weren't all listitems. Now a listitem containing the button.
- `DiffViewer`: rows had no cells (`role="cell"` / `columnheader` added). `JsonViewer`: nested `treeitem`s weren't in a `role="group"`.
- `FileUpload`: the dropzone was a `role="button"` containing a real Button (nested-interactive) and an unlabeled hidden input. It is now a plain drop surface; the Browse button is the single keyboard/AT target.
- `ScrollArea` viewport and `VirtualList` were scrollable but not keyboard-focusable.
- `ColorPicker` hex field had no label and its 2D square had no `aria-valuenow`; `MarkdownEditor` put its label on the wrapper instead of the textarea; `MultiSelect` gained Backspace-removes-last-chip.

**Demos** (Storybook stories are generated from `apps/web/src/registry/demos.tsx`, which also drives the live previews on the site, so the site's own demos are fixed too): icon-only ToggleGroup items, Checkbox/Switch/Select/Slider/Progress/CircularProgress/NumberInput/InputOTP/NativeSelect/MultiSelect/MarkdownEditor demos now carry accessible names, and the code snippets shown on the docs pages teach the same pattern.

## Forced colors, reduced motion, Kanban (2026-09-19)

The browser pass (`scripts/a11y-browser.mjs`) gained three checks with no baseline, run on every story where relevant:

| Check | Finding | Status |
|---|---|---|
| Forced colors: every focus stop keeps a visible outline (798 stops) | `InputOTP`'s active slot and the `Chart` SVG had no indicator (ring / transparent outline only) | **Fixed** |
| Reduced motion: no loop faster than 3s | `MessageBubble` typing dots; `Spinner`, `FileUpload` spinner, `Skeleton` and the chart placeholder had no `motion-reduce` handling | **Fixed** (skeleton/placeholder/dots stop; spinners slow to 3s per turn) |
| `KanbanBoard` keyboard drag (Space / arrows) within and across columns | passes | — |

Gotcha found along the way: `tailwind-merge` treats a bare `outline` and `outline-2` in one class list as conflicting and drops one, so a forced-colors outline written that way silently vanished. Use one arbitrary property (`forced-colors:[outline:2px_solid]`).

## DataGrid range selection (2026-09-20)

`selectable` adds ARIA multi-selection to the grid: Shift+arrows / Shift+click extend a rectangle from the anchor cell, Ctrl/Cmd+A selects all, Ctrl/Cmd+C copies it as tab-separated text, Esc clears; `aria-multiselectable` on the grid, `aria-selected` on every cell, a live region announcing the count, and `onSelectionChange`. Opt-in, so nothing changes for existing grids. Re-sorting or changing the row count clears the selection (it refers to displayed rows). Follow-up (same day): drag-select and disjoint ranges — Ctrl/Cmd+click, or Ctrl+Space from the keyboard, keeps the current range and starts another; Ctrl/Cmd+C copies all of them (blank line between), and `onSelectionChange` reports every range. Verified with a real-pointer drag and Ctrl+click in the browser pass. Not included: auto-scroll while dragging, header (whole row/column) selection.
