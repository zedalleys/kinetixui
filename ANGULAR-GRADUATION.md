# Angular: Preview → Stable

`@kinetixui/angular` is **Preview**. This file says what Stable means, how it is measured, and the waves
of work between here and there. The measurement is executable — `pnpm check:angular-graduation`, run in
CI — and this document describes it; where the two disagree, the script is right.

Publication is distribution, not maturity. The package is on npm and stays Preview.

## Current truth (computed, 2026-10-04, main `076fd5c` + Wave B)

| | Count | Source |
|---|---|---|
| Implemented | 56 of 98 | `components.manifest.json` |
| Native-equivalent | 2 (`direction-provider`, `form`) | manifest `platformGuidance`, each with its reason |
| Planned | 40 | manifest `platformGuidance` (`type: "planned"`, with a `wave`) |
| `catalogComplete` | false | manifest |
| Evidence (verification.json) | build 56 · interaction 56 · accessibility 56 · rtl 23 · largeText 29 · reducedMotion 4 · visual 0 | generated from the tests |
| Rendered visual/state gate | 21 components, every row (`check:card-visual`: card; `check:selection-visual`: checkbox, radio-group, switch, segmented-control; `check:entry-visual`: input, textarea, native-select, tabs; `check:composite-visual`: input-group, number-input, input-otp, password-input; `check:navigation-visual`, Angular only: breadcrumb, pagination, table-of-contents, tab-bar, app-bar, footer, accordion), no `partial` marks | `scripts/visual-gates.mjs` |

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
| Catalogue | No Angular entry is still planned | gate | **open** — 40 planned |
| Catalogue | Every native-equivalent / composition entry carries its reason | always | met |
| Catalogue | `catalogComplete` is true only when nothing is planned | always | met |
| Build / distribution | Every implemented component compiles in CI (ng-packagr, strict templates) | gate | met — 56/56 |
| Build / distribution | CI builds the package, checks the public API snapshot, runs the tests and this guard; the clean-consumer install + AOT build runs (`angular-package.yml`) | always | met |
| Behaviour | Every implemented component has `interaction` evidence | gate | met — 56/56 (jsdom, and a real keyboard in Chromium for the 36 interactive components; the stepper, which is display, by its state following `current`) |
| Behaviour | `interaction` wherever React has it | gate | met — 17/17 (accordion and collapsible added) |
| Accessibility | Every implemented component has `accessibility` evidence | gate | met — 56/56 |
| Accessibility | `accessibility` wherever React has it | gate | met — 56/56 |
| Accessibility | …from a real browser wherever React's is (axe in Chromium, `a11y-browser.mjs`) | gate | met — 56/56 (`angular-browser.mjs`: axe over every usage example and state fixture, light and dark, plus forced colours and reduced motion) |
| RTL | `rtl` wherever React has it | gate | met — 7/7 (Angular measures 23 in four direction cases) |
| Large text | `largeText` wherever React has it | gate | met — 14/14 (React's bar rose to include input-group and input-otp when Angular implemented them; Angular measures 29) |
| Large text | …from a real browser (`large-text.mjs`) | gate | met — 14/14 |
| Motion | `reducedMotion` wherever React has it | gate | met — 3/3 (switch, accordion, collapsible) |
| Motion | …from a real browser (`motion.mjs`) | gate | met — 3/3 (Angular's in `angular-browser.mjs`, which also measures the app bar's menu) |
| Visual | A rendered visual/state gate covers Angular wherever one covers React | gate | met — 12/12: the interactive Card (`kxCard` on a link or button) and `kx-number-input`'s `readonly` closed the two `partial` marks, and input-group and input-otp arrived measured. password-input is measured too but not owed (React's PasswordInput is not separately gated) |
| Visual | Every registered visual gate exists and runs in CI | always | met |
| Visual | A visual gate claims Angular only for components Angular implements | always | met |
| Documentation | The package README's counts, component list and Preview label match the manifest and evidence | always | met (it was stale — 31 components, 69 symbols — and is corrected in this change) |
| CI | The guard itself: fails if `maturity` is `stable` with any gate criterion open | — | in `ci.yml` |

12 of 13 gate criteria are met; only the catalogue is open (40 planned). Angular stays Preview.

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
- Wave B, 10 controls, each a one-line break restored straight after and checked by hash (logs:
  `/mnt/project-files/angular-wave-b/negative-controls/`). Every one was caught by the gate named:
  - Accordion arrow keys disabled → `check:angular-browser` keyboard pass: "ArrowDown moves to the next
    enabled trigger" and "wraps to the first" fail.
  - Accordion `aria-expanded` pinned to false → "Enter opens its item" fails.
  - Pagination `aria-current` removed → "the current page is aria-current=page" fails (first run timed out
    instead of failing; the read was made non-waiting so it fails by name).
  - Table-of-contents bar drawn with `border-left` → the RTL pass fails in the RTL page (first run MISSED it:
    the check read the border's width but not its colour; it now reads both), and `check:navigation-visual`.
  - Tab-bar label pinned to 12px → the 200% pass: "its text grows" (12px → 12px).
  - Table-of-contents current bar removed → `check:navigation-visual`: bar 1.00:1, light and dark.
  - Disclosure height transition set to 0s → reduced-motion pass: "travels through a rendered midpoint"
    fails, 36px → none → 0px over 0ms.
  - Disclosure removed from the reduced-motion rule → "no perceptible motion" fails (200ms).
  - Disclosure body clipped with `overflow: hidden` → "a focus ring flush with the content's edge is not
    clipped" fails.
  - Pressed layer equal to hover → `check:navigation-visual`: pagination and app bar "press deepens it".

## The waves

Derived from the manifest's own `wave` tags (now `overlays` 17, `layout` 7, `data` 7, `advanced` 7,
`navigation` 2 — the `inputs` tag closed with Wave A), reordered by dependency. The evidence instrument came
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

### Wave B — navigation and disclosure (done)

**Components:** `accordion`, `collapsible`, `breadcrumb`, `pagination`, `table-of-contents`, `tab-bar`,
`stepper`, `navigation-bar`, `app-bar`, `footer` (10). 12/13 held; Angular 46 → 56.

**Scope, recomputed from the live manifest.** This file's earlier Wave B list had 14. The four left out —
`scroll-area`, `resizable`, `carousel`, `comparison-slider` — carry the manifest's `layout` tag, not
`navigation`, and are a different interaction model (pointer drag, keyboard resize, scroll containers,
autoplay) with no disclosure or `aria-current`; they are ranked below. `menubar` and `navigation-menu` are
tagged `navigation` but open floating menus, so they wait for the overlay primitive.

| | |
|---|---|
| Behavioural contracts | accordion (APG: heading + button, `aria-expanded`/`aria-controls`, single / collapsible / multiple, ArrowUp/ArrowDown/Home/End between triggers, arrows never open); collapsible (on the caller's own button); `aria-current="page"` on breadcrumb, pagination, tab bar and app bar, `location` on the table of contents, `step` on the stepper; pagination and tab bar as links or buttons, with a disabled link that leaves the tab order and is not followed; app bar's narrow menu (one `<nav>`, Escape and following a link close it, focus returns) |
| Accessibility | landmarks and names (`nav` per component, footer `contentinfo` with columns as named groups), axe over every new usage example and the navigation fixture, light and dark, forced colours (current destinations keep an outline there) |
| RTL | 9 components in four direction cases, chevrons read off pixels: the breadcrumb separator and pagination/Back glyphs mirror (`Bidi_Mirrored` text, no `:dir()`), the accordion chevron does not |
| Large text | 10 components at 2× text; the stepper reflows to a list in a narrow container; its connector no longer reaches into a neighbour's box |
| Motion | accordion (height and chevron), collapsible and app-bar menu: a rendered midpoint and a perceptible duration, open and closed, LTR and RTL; under reduced motion `transition: none` and the same end state |
| Visual | `check:navigation-visual` (new, Angular only): rest, hover, pressed, focus, current (a shape, not hue alone), disabled, chevron direction, the current bar's side in RTL, light and dark |
| Defects it found and fixed | tab-bar badge read before its label ("3Inbox"); words broken mid-glyph at 390px; pagination's current edge under 3:1; table of contents' pressed equal to hover; dark tab-bar current quieter than rest; app-bar current bar floating 1px off its edge; stepper connector overflowing its step |

### What remains after Wave B, ranked

40 planned. Ranked by what each group unblocks and by the evidence React already holds for it (which Angular
will owe the moment it implements the component):

1. **Overlays (Wave C, below)** — 17 `overlays` + `menubar`, `navigation-menu` (`navigation`) + `sidebar`.
   Owes the most (interaction 13, rtl 9, largeText 12) and builds the one primitive (a positioned,
   focus-managed layer) that `select`, `combobox`, `command`, `sidebar`, `date-picker` and `data-table`'s
   menus all need. Large enough to split: **C1** the layer with the dialog family (`dialog`, `alert-dialog`,
   `modal`, `sheet`, `drawer`, `popover`, `tooltip`, `hover-card`), then **C2** menus and listboxes
   (`dropdown-menu`, `context-menu`, `menubar`, `navigation-menu`, `select`, `combobox`, `multi-select`,
   `command`) and notifications (`sonner`, `notification-center`, `tour`), then `sidebar`.
2. **Layout, pointer and scroll** — `scroll-area`, `resizable`, `carousel`, `comparison-slider`. Owes only
   browser axe, so it is cheap, but it brings drag with a keyboard alternative and direction-dependent
   handles, which no implemented Angular component has yet. `table` and `virtual-list` (also `layout`) go
   with the data wave.
3. **Data and advanced (Wave D)** — composes 1 and 2.

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
