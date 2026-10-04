# Angular: Preview → Stable

`@kinetixui/angular` is **Preview**. This file says what Stable means, how it is measured, and the waves
of work between here and there. The measurement is executable — `pnpm check:angular-graduation`, run in
CI — and this document describes it; where the two disagree, the script is right.

Publication is distribution, not maturity. The package is on npm and stays Preview.

## Current truth (computed, 2026-10-04, main `7ea47f0` + Wave A)

| | Count | Source |
|---|---|---|
| Implemented | 46 of 98 | `components.manifest.json` |
| Native-equivalent | 2 (`direction-provider`, `form`) | manifest `platformGuidance`, each with its reason |
| Planned | 50 | manifest `platformGuidance` (`type: "planned"`, with a `wave`) |
| `catalogComplete` | false | manifest |
| Evidence (verification.json) | build 46 · interaction 46 · accessibility 46 · rtl 14 · largeText 19 · reducedMotion 1 · visual 0 | generated from the tests |
| Rendered visual/state gate | 14 components, every row (`check:card-visual`: card; `check:selection-visual`: checkbox, radio-group, switch, segmented-control; `check:entry-visual`: input, textarea, native-select, tabs; `check:composite-visual`: input-group, number-input, input-otp, password-input), no `partial` marks | `scripts/visual-gates.mjs` |

Wave A moved Angular's evidence into a real browser. `check:angular-browser` (scripts/angular-browser.mjs)
builds the package's fixtures AOT and bootstraps them as a live, zoneless Angular application in Chromium,
and the four visual gates measure that same live application instead of serialised jsdom DOM. Every page
proves it is Angular before it is measured (the root carries `ng-version`, and every public directive's
compiled selector must match the live DOM somewhere).

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
| Catalogue | No Angular entry is still planned | gate | **open** — 50 planned |
| Catalogue | Every native-equivalent / composition entry carries its reason | always | met |
| Catalogue | `catalogComplete` is true only when nothing is planned | always | met |
| Build / distribution | Every implemented component compiles in CI (ng-packagr, strict templates) | gate | met — 46/46 |
| Build / distribution | CI builds the package, checks the public API snapshot, runs the tests and this guard; the clean-consumer install + AOT build runs (`angular-package.yml`) | always | met |
| Behaviour | Every implemented component has `interaction` evidence | gate | met — 46/46 (jsdom, and a real keyboard in Chromium for the 27 interactive components) |
| Behaviour | `interaction` wherever React has it | gate | met — 15/15 |
| Accessibility | Every implemented component has `accessibility` evidence | gate | met — 46/46 |
| Accessibility | `accessibility` wherever React has it | gate | met — 46/46 |
| Accessibility | …from a real browser wherever React's is (axe in Chromium, `a11y-browser.mjs`) | gate | met — 46/46 (`angular-browser.mjs`: axe over every usage example and state fixture, light and dark, plus forced colours and reduced motion) |
| RTL | `rtl` wherever React has it | gate | met — 7/7 (Angular measures 14 in four direction cases) |
| Large text | `largeText` wherever React has it | gate | met — 14/14 (React's bar rose to include input-group and input-otp when Angular implemented them; Angular measures 19) |
| Large text | …from a real browser (`large-text.mjs`) | gate | met — 14/14 |
| Motion | `reducedMotion` wherever React has it | gate | met — 1/1 (switch) |
| Motion | …from a real browser (`motion.mjs`) | gate | met — 1/1 |
| Visual | A rendered visual/state gate covers Angular wherever one covers React | gate | met — 12/12: the interactive Card (`kxCard` on a link or button) and `kx-number-input`'s `readonly` closed the two `partial` marks, and input-group and input-otp arrived measured. password-input is measured too but not owed (React's PasswordInput is not separately gated) |
| Visual | Every registered visual gate exists and runs in CI | always | met |
| Visual | A visual gate claims Angular only for components Angular implements | always | met |
| Documentation | The package README's counts, component list and Preview label match the manifest and evidence | always | met (it was stale — 31 components, 69 symbols — and is corrected in this change) |
| CI | The guard itself: fails if `maturity` is `stable` with any gate criterion open | — | in `ci.yml` |

12 of 13 gate criteria are met; only the catalogue is open (50 planned). Angular stays Preview.

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
- Visual Slice 4: `check:composite-visual` claims Angular number-input with a `partial` mark (no read-only
  state). Without the mark the visual-parity criterion would read 9/10 — an over-claim; with it, 8/10.
- Wave A, 15 controls, each a one-line break restored straight after (logs: the Wave A report). Every one
  was caught by the gate named:
  - `maturity: "stable"` → `check:angular-graduation` fails on the one open criterion (catalogue, 48 of 98
    covered) and the README label.
  - The switch dropped from the `reducedMotion` passage → `check:angular-browser` fails: "named but not
    measured: switch" (a claim without its subject).
  - Slider fill placed with `left` → the RTL pass fails in both RTL cases.
  - Checkbox sized in px → the 200% pass fails (does not scale, target under 24px).
  - The `border-box` reset removed → the 200% pass fails (input 62px tall, page no longer fits 390px).
  - Forced-colours outlines removed → every Tab stop fails "visible focus indicator".
  - Progress example unlabelled → axe `aria-progressbar-name`, light and dark.
  - Rating Home/End removed → the keyboard pass fails both.
  - Toggle-group label content removed → "each radio is named by its label" fails.
  - Switch removed from the reduced-motion list → 300ms of motion under reduced motion fails.
  - Interactive card focus ring removed → `check:card-visual` (Angular) fails "focus out-contrasts hover".
  - Number-input read-only fill removed → `check:composite-visual` (Angular) fails "read-only is distinct".
  - OTP active-cell ring removed → `check:composite-visual` (Angular) fails "focus is the strongest state".
  - `check:angular-browser` removed from `a11y-browser.yml` → `gen:verification --check` fails: the
    browser evidence no longer counts.
  - The number-input `partial` mark re-added → the visual criterion drops to 11/12 and the score to 11/13.

## The waves

Derived from the manifest's own `wave` tags (now `layout` 11, `navigation` 8, `overlays` 17, `data` 7,
`advanced` 7 — the `inputs` tag closed with Wave A), reordered by dependency. The evidence instrument came
first, before more unverified components were added; every later wave arrives through it.

"Owed" below is computed from the current bar, not estimated: the evidence kinds React already has for that
wave's components (verification.json), which the criteria will require of Angular the moment each component
is implemented. Every component also owes `build`, `interaction` and `accessibility` (always required) and
browser axe evidence (React has it for all 98).

### Wave A — browser evidence for what exists, plus the remaining inputs (done)

**Components:** `input-group`, `input-otp`, `rating` (3), and browser evidence for the existing 43.
Closed 7 criteria (5/13 → 12/13).

| | |
|---|---|
| Harness | `check:angular-browser`: the fixtures and every usage example compiled AOT and bootstrapped as one zoneless Angular application in Chromium. The four visual gates measure the same live application |
| Behavioural contracts | 27 interactive components driven with a real keyboard, including input-group (the input is the one control; add-on buttons never submit), input-otp (one field, one-time-code autofill, paste, Backspace, completion fires once) and rating (radiogroup of radios, arrows mirrored in RTL, Home/End, read-only image) |
| Accessibility | axe over every usage example and state fixture, light and dark; a visible focus indicator at every Tab stop under forced colours |
| RTL | 14 components in four direction cases (LTR page, RTL page, LTR region in RTL, RTL region in LTR) |
| Large text | 19 components at 2× root font size: growth, clipping, collisions, 24px targets, focus rings, operable, 390px fit |
| Motion | switch thumb: a rendered midpoint, both directions, both page directions, collapsed under reduced motion |
| Visual | Card and number-input `partial` marks removed: interactive `kxCard` and `readonly` number-input |
| Defects it found and fixed | unnamed toggle-group radios; tab panels with no `id`; no focus indicator in forced colours; px-sized controls that ignored 200% text; missing `border-box`; slider fill from the wrong end in RTL; circular progress faster than the reduced-motion floor |

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

**Owed (React has it):** interaction 2 (accordion, collapsible) · reducedMotion 2 (accordion, collapsible) ·
rtl 0 · largeText 0 · browser axe 14 · no visual gate.

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

**Owed (React has it):** interaction 13 · rtl 9 · largeText 12 · browser axe 20 · visual gate 2 (select and
multi-select, in `check:entry-visual` and `check:composite-visual`).

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

**Owed (React has it):** interaction 6 (data-grid, tree-view, json-viewer, color-picker, file-upload,
markdown-editor) · rtl 1 (data-grid) · browser axe 16.

### Wave E — graduation

Re-run every gate; close any criterion still open; then, and only then, change
`platformDefinitions.Angular.maturity` to `stable`, `catalogComplete` to `true`, update the README and
docs label, and let `check:angular-graduation` confirm it. A release PR for the change is a separate,
deliberate step.
