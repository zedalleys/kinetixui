# Angular: Preview → Stable

`@kinetixui/angular` is **Preview**. This file says what Stable means, how it is measured, and the waves
of work between here and there. The measurement is executable — `pnpm check:angular-graduation`, run in
CI — and this document describes it; where the two disagree, the script is right.

Publication is distribution, not maturity. The package is on npm and stays Preview.

## Current truth (computed, 2026-10-03, main `476f316` + this change)

| | Count | Source |
|---|---|---|
| Implemented | 43 of 98 | `components.manifest.json` |
| Native-equivalent | 2 (`direction-provider`, `form`) | manifest `platformGuidance`, each with its reason |
| Planned | 53 | manifest `platformGuidance` (`type: "planned"`, with a `wave`) |
| `catalogComplete` | false | manifest |
| Evidence (verification.json) | build 43 · interaction 43 · accessibility 43 · rtl 2 · largeText 0 · reducedMotion 0 · visual 0 | generated from the tests |
| Rendered visual/state gate | 8 components in full (`check:selection-visual`: checkbox, radio-group, switch, segmented-control; `check:entry-visual`: input, textarea, native-select, tabs) and card partially (`check:card-visual`, resting surface only) | `scripts/visual-gates.mjs` |

The counts the brief remembered (43 / 2 / 53, Preview, catalogue incomplete) are still current. Every
interaction and accessibility claim comes from jsdom unit suites; Angular has no real-browser accessibility
(axe), RTL, large-text or reduced-motion evidence yet.

## What Stable means

Not "nothing planned". A package can reach 98 of 98 with components no browser has ever rendered. Stable
means the **implemented** catalogue has demonstrated maturity, measured against the other web
implementation, React, which is Stable and uses the same instruments:

> For every component Angular implements, Angular holds every claimable evidence kind React holds for that
> component — and where React's evidence for a kind comes from a real browser, Angular's does too.

The bar is relative, so it rises as React's evidence does, without anyone editing the contract.

## The matrix

`gate` criteria must all be met before `maturity` may be `stable`. `always` criteria must hold at every
maturity — they are statements about today, and CI fails the moment one is false.

| Dimension | Criterion | Kind | Today |
|---|---|---|---|
| Catalogue | No Angular entry is still planned | gate | **open** — 53 planned |
| Catalogue | Every native-equivalent / composition entry carries its reason | always | met |
| Catalogue | `catalogComplete` is true only when nothing is planned | always | met |
| Build / distribution | Every implemented component compiles in CI (ng-packagr, strict templates) | gate | met — 43/43 |
| Build / distribution | CI builds the package, checks the public API snapshot, runs the tests and this guard; the clean-consumer install + AOT build runs (`angular-package.yml`) | always | met |
| Behaviour | Every implemented component has `interaction` evidence | gate | met — 43/43 |
| Behaviour | `interaction` wherever React has it | gate | met — 14/14 |
| Accessibility | Every implemented component has `accessibility` evidence | gate | met — 43/43 (jsdom) |
| Accessibility | `accessibility` wherever React has it | gate | met — 43/43 |
| Accessibility | …from a real browser wherever React's is (axe in Chromium, `a11y-browser.mjs`) | gate | **open** — 0/43 |
| RTL | `rtl` wherever React has it | gate | **open** — 1/6 (input, radio-group, slider, switch, textarea missing) |
| Large text | `largeText` wherever React has it | gate | **open** — 0/11 (React gained native-select and tabs in Visual Slice 3, so the bar rose) |
| Large text | …from a real browser (`large-text.mjs`) | gate | **open** — 0/11 |
| Motion | `reducedMotion` wherever React has it | gate | **open** — 0/1 (switch) |
| Motion | …from a real browser (`motion.mjs`) | gate | **open** — 0/1 |
| Visual | A rendered visual/state gate covers Angular wherever one covers React | gate | **open** — 8/9: card is measured for Angular, but only its resting surface (Angular has no interactive Card), which `visual-gates.mjs` records as `partial` and the guard does not count |
| Visual | Every registered visual gate exists and runs in CI | always | met |
| Visual | A visual gate claims Angular only for components Angular implements | always | met |
| Documentation | The package README's counts, component list and Preview label match the manifest and evidence | always | met (it was stale — 31 components, 69 symbols — and is corrected in this change) |
| CI | The guard itself: fails if `maturity` is `stable` with any gate criterion open | — | in `ci.yml` |

5 of 13 gate criteria are met. Angular stays Preview.

`published` is reported but is not a criterion. Neither is `visual` from verification.json: that kind
means comparison against stored reference images, which KinetixUI does not keep on any platform.

### What the guard is proven to catch

Run against deliberately broken inputs during this change (none committed):

- `maturity: "stable"` in the manifest → fails, naming each of the 8 open criteria.
- `catalogComplete: true` with 53 planned → fails.
- The previous README (31 components, 69 symbols, 12 components missing from the list) → fails.
- `check:selection-visual` removed from `a11y-browser.yml` → fails.
- Visual Slice 3: `check:entry-visual` registered in `visual-gates.mjs` before its CI step existed → failed
  ("Every visual gate the registry lists exists and is run in CI"), which is how the step was added. Card
  registered for Angular without the `partial` mark → the visual-parity criterion would have read 9/9; with
  it, 8/9.

## The waves

Derived from the manifest's own `wave` tags (`inputs` 3, `layout` 11, `navigation` 8, `overlays` 17,
`data` 7, `advanced` 7), reordered by dependency. The single largest block of open criteria is about the
43 components that already exist, not the 53 that do not — so the evidence instrument comes first, before
more unverified components are added.

### Wave A — browser evidence for what exists, plus the remaining inputs

**Components:** `input-group`, `input-otp`, `rating` (3), and evidence for the existing 43.

**Why first:** 7 of the 8 open criteria are evidence gaps on implemented components. The rendered-subject
pattern this change introduced (`selection-render.spec.ts`: Angular renders the DOM, Chromium paints it
with the package stylesheet) generalises to an Angular browser harness: render every implemented
component's usage examples, then run axe, the large-text pass, an RTL pass and the motion pass over them.

| | |
|---|---|
| Behavioural contracts | input-group: addon focus delegates to the input; input-otp: one slot per character, paste fills, Backspace walks back, arrow keys move; rating: a radiogroup, arrows change the value, Home/End |
| Accessibility | axe in Chromium over every implemented component, light and dark (closes 43 browser-a11y gaps) |
| RTL | rendered `dir="rtl"` checks for input, radio-group, slider, switch, textarea (React's set) — slider value direction, switch thumb side |
| Large text | the 9 controls React measures at 2× default font size: no clipping, control scales with its label |
| Motion | switch thumb: rendered midpoint, collapses under reduced motion (Angular now suppresses it in CSS) |
| Visual | Angular interactive Card (a link or button card with hover, pressed, selected and focus), then drop `partial` for card in `visual-gates.mjs` — `check:card-visual` already measures Angular's resting card (Visual Slice 3), so this closes the last visual gap |
| Verification | new `kx-verify:` markers only on passages that drive Angular symbols, so verification.json counts what is proven |
| Proof it creates | "every Angular component is axe-clean in a real browser"; a light/dark/RTL/200% Angular gallery |

### Wave B — navigation and disclosure (no overlays)

**Components:** `breadcrumb`, `pagination`, `stepper`, `tab-bar`, `table-of-contents`, `navigation-bar`,
`accordion`, `collapsible`, `app-bar`, `footer`, `scroll-area`, `resizable`, `carousel`,
`comparison-slider` (14).

**Why here:** none needs a floating layer, but they introduce roving focus, `aria-current` and disclosure
motion, which the overlay wave builds on.

| | |
|---|---|
| Behavioural contracts | roving tabindex and arrow keys (tab-bar, stepper, carousel), `aria-current="page"` (breadcrumb, pagination, navigation-bar), `aria-expanded` + region (accordion, collapsible), keyboard resize (resizable, comparison-slider) |
| Accessibility | landmarks and names (nav, contentinfo), live region for carousel position, axe in browser |
| RTL | chevrons and carousel/comparison direction flip; pagination order; resizable handle direction |
| Large text | breadcrumb and pagination wrap without overlap at 200%; app-bar does not clip its title |
| Motion | accordion/collapsible height animation with a rendered midpoint and reduced-motion collapse (React's `motion.mjs` contract); carousel autoplay off under reduced motion |
| Visual | selected/current states for tab-bar, pagination, stepper on the shared contract (Visual Slice 3 measured Tabs on both platforms: `check:entry-visual`) |
| Proof it creates | a docs-site layout built entirely in Angular |

### Wave C — overlays and complex interaction

**Components:** `dialog`, `alert-dialog`, `modal`, `sheet`, `drawer`, `popover`, `hover-card`, `tooltip`,
`dropdown-menu`, `context-menu`, `menubar`, `navigation-menu`, `select`, `combobox`, `multi-select`,
`command`, `sonner`, `notification-center`, `tour`, `sidebar` (20).

**Why here:** these share one hard primitive — a positioned, focus-managed layer. Build it once (native
`<dialog>`/popover where they suffice, CDK Overlay where positioning needs it) and every member uses it.
`select`/`combobox`/`multi-select` need the listbox; `command` needs the dialog; `sidebar` uses a sheet
below its breakpoint.

| | |
|---|---|
| Behavioural contracts | focus trap and restore, Escape closes, outside click closes (non-modal), typeahead in menus/listboxes, `aria-activedescendant` in combobox/command, toast queue and pause-on-hover |
| Accessibility | `role="dialog"`/`alertdialog` with names, menu/menuitem roles, listbox/option, inert background for modal |
| RTL | placement mirrors (start/end), submenu direction, sheet/drawer side |
| Large text | popover content reflows inside the viewport; menus do not clip at 200% |
| Motion | enter/exit with token durations; reduced motion still fires the close so nothing stays mounted |
| Visual | overlay elevation above raised cards (the slice 1 follow-up), focus ring inside overlays |
| Proof it creates | a settings flow with dialogs and menus in Angular; overlay parity table |

### Wave D — data and advanced

**Components:** `table`, `data-table`, `data-grid`, `virtual-list`, `tree-view`, `chart`, `json-viewer`,
`diff-viewer`, `message-bubble`, `calendar`, `date-picker`, `color-picker`, `file-upload`,
`audio-player`, `kanban-board`, `markdown-editor` (16).

**Why last:** they compose earlier waves — `date-picker` is popover + calendar, `data-table` uses
dropdown-menu and pagination, `kanban-board` needs drag with a keyboard alternative.

| | |
|---|---|
| Behavioural contracts | grid keyboard model (data-grid), tree expand/collapse with arrows, date grid navigation, keyboard drag-and-drop alternative (kanban), file input semantics |
| Accessibility | table headers/scope, `aria-sort`, tree roles, calendar grid labelling, chart text alternative |
| RTL | column order and sort indicators, calendar week direction, tree indentation |
| Large text | dense tables stay readable and scrollable (keyboard-reachable scroll container, as React's table) |
| Motion | none required beyond overlays; virtual scrolling must not animate |
| Visual | selected row/cell and focus inside dense surfaces |
| Proof it creates | an Angular admin dashboard; the IoT examples' Angular host (IoT itself stays React unless a product needs it) |

### Wave E — graduation

Re-run every gate; close any criterion still open; then, and only then, change
`platformDefinitions.Angular.maturity` to `stable`, `catalogComplete` to `true`, update the README and
docs label, and let `check:angular-graduation` confirm it. A release PR for the change is a separate,
deliberate step.
