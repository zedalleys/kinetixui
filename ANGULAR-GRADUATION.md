# Angular: Preview → Stable

`@kinetixui/angular` is **Preview**. This file says what Stable means, how it is measured, and the waves
of work between here and there. The measurement is executable — `pnpm check:angular-graduation`, run in
CI — and this document describes it; where the two disagree, the script is right.

Publication is distribution, not maturity. The package is on npm and stays Preview.

## Current truth (computed, 2026-10-04, main `dd9eed1` + Wave C1)

| | Count | Source |
|---|---|---|
| Implemented | 64 of 98 | `components.manifest.json` |
| Native-equivalent | 2 (`direction-provider`, `form`) | manifest `platformGuidance`, each with its reason |
| Planned | 32 | manifest `platformGuidance` (`type: "planned"`, with a `wave`) |
| `catalogComplete` | false | manifest |
| Evidence (verification.json) | build 64 · interaction 64 · accessibility 64 · rtl 31 · largeText 37 · reducedMotion 12 · visual 0 | generated from the tests |
| Rendered visual/state gate | 29 components, every row (`check:card-visual`: card; `check:selection-visual`: checkbox, radio-group, switch, segmented-control; `check:entry-visual`: input, textarea, native-select, tabs; `check:composite-visual`: input-group, number-input, input-otp, password-input; `check:navigation-visual`, Angular only: breadcrumb, pagination, table-of-contents, tab-bar, app-bar, footer, accordion; `check:overlay-visual`, Angular only: dialog, alert-dialog, modal, sheet, drawer, popover, tooltip, hover-card), no `partial` marks | `scripts/visual-gates.mjs` |

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
| Catalogue | No Angular entry is still planned | gate | **open** — 32 planned |
| Catalogue | Every native-equivalent / composition entry carries its reason | always | met |
| Catalogue | `catalogComplete` is true only when nothing is planned | always | met |
| Build / distribution | Every implemented component compiles in CI (ng-packagr, strict templates) | gate | met — 64/64 |
| Build / distribution | CI builds the package, checks the public API snapshot, runs the tests and this guard; the clean-consumer install + AOT build runs (`angular-package.yml`) | always | met |
| Behaviour | Every implemented component has `interaction` evidence | gate | met — 64/64 (jsdom, and a real keyboard in Chromium for the 44 interactive components; the stepper, which is display, by its state following `current`) |
| Behaviour | `interaction` wherever React has it | gate | met — 24/24 (dialog, alert dialog, modal, sheet, drawer, popover and tooltip added; React has no interaction evidence for the hover card, Angular does) |
| Accessibility | Every implemented component has `accessibility` evidence | gate | met — 64/64 |
| Accessibility | `accessibility` wherever React has it | gate | met — 64/64 |
| Accessibility | …from a real browser wherever React's is (axe in Chromium, `a11y-browser.mjs`) | gate | met — 64/64 (`angular-browser.mjs`: axe over every usage example and state fixture, light and dark, plus forced colours and reduced motion; `angular-overlays.mjs`: axe over every overlay OPEN, nested and composed) |
| RTL | `rtl` wherever React has it | gate | met — 10/10 (alert dialog, popover and tooltip added; Angular measures 31 in four direction cases) |
| Large text | `largeText` wherever React has it | gate | met — 21/21 (React's bar rose by the seven overlays it measures at 200%; Angular measures 37) |
| Large text | …from a real browser (`large-text.mjs`) | gate | met — 21/21 |
| Motion | `reducedMotion` wherever React has it | gate | met — 3/3 (switch, accordion, collapsible) |
| Motion | …from a real browser (`motion.mjs`) | gate | met — 3/3 (Angular's in `angular-browser.mjs`, which also measures the app bar's menu) |
| Visual | A rendered visual/state gate covers Angular wherever one covers React | gate | met — 12/12: the interactive Card (`kxCard` on a link or button) and `kx-number-input`'s `readonly` closed the two `partial` marks, and input-group and input-otp arrived measured. password-input is measured too but not owed (React's PasswordInput is not separately gated) |
| Visual | Every registered visual gate exists and runs in CI | always | met |
| Visual | A visual gate claims Angular only for components Angular implements | always | met |
| Documentation | The package README's counts, component list and Preview label match the manifest and evidence | always | met (it was stale — 31 components, 69 symbols — and is corrected in this change) |
| CI | The guard itself: fails if `maturity` is `stable` with any gate criterion open | — | in `ci.yml` |

12 of 13 gate criteria are met; only the catalogue is open (32 planned). Angular stays Preview.

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

Derived from the manifest's own `wave` tags (now `overlays` 9, `layout` 7, `data` 7, `advanced` 7,
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

### Wave C1 — the overlay layer and the dialog family (done)

**Components:** `dialog`, `alert-dialog`, `modal`, `sheet`, `drawer`, `popover`, `tooltip`, `hover-card` (8).
12/13 held; Angular 56 → 64.

**The layer, built once** (`lib/overlay.ts`, internal). Surfaces render in the browser's top layer, not a
portal: modal surfaces are a native `<dialog>` opened with `showModal()` (the background is inert), floating
surfaces use `popover="manual"`. Nothing moves in the DOM, so the injector, styles and the direction a
surface's own element resolves to all survive, and there is no z-index anywhere. One root stack
(`KxOverlayStack`) owns the document listeners, installed with the first open surface and removed with the
last: Escape and an outside press reach only the topmost surface; a press inside a popover nested in a
dialog is inside both; closing a surface closes the surfaces nested in it; page scroll is locked while any
modal surface is open, derived from the stack rather than counted. Focus moves in on open, Tab stays inside a
modal surface, and on close returns to a still-focusable target (an explicit `returnFocus`, the trigger, or
the surface that contained it when the trigger is gone). Floating surfaces are placed by one pure function
(`computePlacement`: logical side and align, flip, shift, a size cap published as
`--kx-available-width/height`) and re-placed on resize, scroll in any ancestor and layout change. Motion is
`@starting-style` plus `allow-discrete`; reduced motion is `transition: none`, and close never waits on a
transition.

| | |
|---|---|
| Behavioural contracts | dialog (title names it, description describes it, X last in the DOM, Escape and backdrop close); alert dialog (`alertdialog`, Cancel focused first, no X, a backdrop press does nothing); modal (React's typed composition, in Tab order); sheet (logical `start`/`end`, `top`, `bottom`); drawer (bottom, handle, panel focus); popover (non-modal named dialog, focus moves in, Tab out closes, Escape returns focus); tooltip (`aria-describedby` always, hover after a delay, keyboard focus at once, no touch, Escape keeps focus); hover card (hover intent and keyboard focus, its links reachable, not a description) |
| Nesting | dialog → popover → tooltip, dialog → tooltip, dialog → dialog, sheet → popover: Escape peels one layer at a time, focus returns one level, scroll stays locked until the last modal closes, listeners are gone after the last |
| Accessibility | axe over every surface OPEN, nested and composed, light and dark; forced colours (surface edges, focus outlines, the tooltip's edge) |
| RTL | 8 components in four direction cases: sheet sides, popover sides and alignment, a surface inside an RTL region in an LTR page and the reverse |
| Large text | 8 components at 2× text at 1024px and 390px: inside the viewport, no clipped text, 24px targets, scrolling inside a surface rather than off the screen |
| Motion | every surface: a rendered midpoint in and out at normal settings; none, with the same end state, under reduced motion |
| Visual | `check:overlay-visual` (new, Angular only): fill, edge, shadow (light) or surface step (dark), scrim, corners, text contrast, the close button's focus ring on four sides, a clipped popover escaping, the end sheet's edge in LTR and RTL |
| Compositions | a destructive confirmation; a phone settings screen whose navigation bar opens a sheet and a drawer; an invite dialog with a role popover, a tooltip in it and a hover card. Rendered light, dark, RTL, RTL dark, 200%, 390px and 390px at 200%, and under axe open |
| Defects it found and fixed | caller `id`s overwritten by host bindings (titles and contents lost their names); a cancelled close animation rejected the settle promise; popover content carried the browser's paragraph margins inside the surface's gap; and, found by the compositions, two earlier components: the navigation bar squeezed its title to one letter per line when two text actions met 200% text on a phone (it now wraps the actions to a second row), and `kx-card-content` was an inline box, so the blocks inside it lost its inline padding (it is now `display: block`); the placement code reached the global `ResizeObserver` (`check:angular-package`), and now uses the element's own window |

#### Negative controls (Wave C1)

13 controls (the brief's 12, with the focus ring split into clipped and removed), each a real break in the
source, a fresh harness built from it, the gate run against it, and the file restored from git before the next
(logs and `summary.json`: `/mnt/project-files/angular-wave-c1/negative-controls/`). None committed. Every one
was caught:

- Escape sent to the bottom of the stack → `check:angular-overlays` interaction: "nested: the first Escape
  closes only the tooltip" and 13 more.
- Tab no longer held in a modal surface → "Tab never leaves the dialog" (focus reached `body`), and the alert
  dialog's Tab cycle.
- Focus restoration removed → first run MISSED by name: the gate failed ("focus goes to returnFocus when the
  trigger is gone") but not on the trigger, because a native `<dialog>` already returns focus to the element
  focused before it opened. The case the native behaviour cannot cover was then added to the gate (a nested
  dialog whose trigger is removed as it closes: focus must go back to the outer dialog), and the re-run fails
  both, focus on `body`.
- Scroll lock released when any modal closes → "the page stays locked while the outer dialog is open", and the
  listener count left behind.
- A press in a popover nested in a dialog treated as outside the dialog → "a press inside the popover closes
  neither layer".
- `aria-labelledby` dropped from the modal surface → "named by its title" for every modal member, and axe
  `aria-dialog-name`.
- End sheet pinned with physical `right: 0` → the RTL pass ("side=end attaches to the inline-end edge") and
  `check:overlay-visual` (the edge on the wrong side in RTL).
- Cross-axis shift removed from placement → the 200% pass: "the open surface stays inside the viewport at 2x"
  (popover at 390px). The 1024px interaction pass alone did not catch it; the large-text pass is the gate for
  it.
- Dialog fixed at `32rem` → the 200% pass at 390px, "stays inside the viewport at 2x".
- The overlay reduced-motion rule removed → "no perceptible motion" fails (200ms) for every surface.
- Keyboard focus no longer opens a tooltip → "keyboard focus opens it at once", and the nested tooltip cases.
- The close button moved flush into the surface's corner → `check:overlay-visual`: "the focus ring clears 3:1
  on every side" (the surface clips two sides, 1.37:1 and 1.00:1).
- The close button's focus ring removed → the same row, 1.00:1 on all four sides, light and dark.

### What remains after Wave C1, ranked

32 planned. Ranked by what each group unblocks and by the evidence React already holds for it (which Angular
will owe the moment it implements the component):

1. **Overlays C2 (Wave C, below)** — 9 `overlays` + `menubar`, `navigation-menu` (`navigation`) + `sidebar`.
   The layer exists now; C2 adds what menus and listboxes need on top of it: roving focus or
   `aria-activedescendant`, typeahead, submenus that open toward the inline end, and a toast queue. Menus and
   listboxes (`dropdown-menu`, `context-menu`, `menubar`, `navigation-menu`, `select`, `combobox`,
   `multi-select`, `command`), notifications (`sonner`, `notification-center`, `tour`), then `sidebar`.
2. **Layout, pointer and scroll** — `scroll-area`, `resizable`, `carousel`, `comparison-slider`. Owes only
   browser axe, so it is cheap, but it brings drag with a keyboard alternative and direction-dependent
   handles, which no implemented Angular component has yet. `table` and `virtual-list` (also `layout`) go
   with the data wave.
3. **Data and advanced (Wave D)** — composes 1 and 2.

### Wave C — overlays and complex interaction

**Components:** `dialog`, `alert-dialog`, `modal`, `sheet`, `drawer`, `popover`, `hover-card`, `tooltip`,
`dropdown-menu`, `context-menu`, `menubar`, `navigation-menu`, `select`, `combobox`, `multi-select`,
`command`, `sonner`, `notification-center`, `tour`, `sidebar` (20).

**Why here:** these share one hard primitive — a positioned, focus-managed layer. It was built once in C1 (native
`<dialog>` and popover, and one placement function; no CDK, no new dependency) and every member uses it.
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

**C1 is done** (above): the layer and the eight dialog-family members. What follows is C2 and `sidebar`.

**Owed by the remaining 12 (React has it):** interaction 6 · rtl 6 · largeText 5 · browser axe 12 · visual gate
2 (select and multi-select, in `check:entry-visual` and `check:composite-visual`).

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
