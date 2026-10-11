# Angular: Preview → Stable

`@kinetixui/angular` is **Preview**. This file says what Stable means, how it is measured, and the waves
of work between here and there. The measurement is executable — `pnpm check:angular-graduation`, run in
CI — and this document describes it; where the two disagree, the script is right.

Publication is distribution, not maturity. The package is on npm and stays Preview.

## Current truth (computed, 2026-10-11, main `4a7a587` + Wave C2b)

| | Count | Source |
|---|---|---|
| Implemented | 71 of 98 (70 components and one recipe, the combobox) | `components.manifest.json` |
| Native-equivalent | 2 (`direction-provider`, `form`) | manifest `platformGuidance`, each with its reason |
| Planned | 25 | manifest `platformGuidance` (`type: "planned"`, with a `wave`) |
| `catalogComplete` | false | manifest |
| Evidence (verification.json) | build 71 · interaction 71 · accessibility 71 · rtl 38 · largeText 44 · reducedMotion 17 · visual 0 | generated from the tests |
| Rendered visual/state gate | 34 components, every row (`check:card-visual`: card; `check:selection-visual`: checkbox, radio-group, switch, segmented-control; `check:entry-visual`: input, textarea, native-select, tabs, select; `check:composite-visual`: input-group, number-input, input-otp, password-input, multi-select; `check:navigation-visual`, Angular only: breadcrumb, pagination, table-of-contents, tab-bar, app-bar, footer, accordion; `check:overlay-visual`, Angular only: dialog, alert-dialog, modal, sheet, drawer, popover, tooltip, hover-card; `check:menu-visual`, Angular only: dropdown-menu, context-menu, menubar, plus select and multi-select open), no `partial` marks | `scripts/visual-gates.mjs` |

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
| Catalogue | No Angular entry is still planned | gate | **open** — 25 planned |
| Catalogue | Every native-equivalent / composition entry carries its reason | always | met |
| Catalogue | `catalogComplete` is true only when nothing is planned | always | met |
| Build / distribution | Every implemented component compiles in CI (ng-packagr, strict templates) | gate | met — 71/71 |
| Build / distribution | CI builds the package, checks the public API snapshot, runs the tests and this guard; the clean-consumer install + AOT build runs (`angular-package.yml`) | always | met |
| Behaviour | Every implemented component has `interaction` evidence | gate | met — 71/71 (jsdom, and a real keyboard in Chromium for the 51 interactive components; the stepper, which is display, by its state following `current`) |
| Behaviour | `interaction` wherever React has it | gate | met — 29/29 (Wave C2a added dropdown menu, context menu and menubar, Wave C2b select and multi-select; React has no interaction evidence for the hover card, Angular does) |
| Accessibility | Every implemented component has `accessibility` evidence | gate | met — 71/71 |
| Accessibility | `accessibility` wherever React has it | gate | met — 71/71 |
| Accessibility | …from a real browser wherever React's is (axe in Chromium, `a11y-browser.mjs`) | gate | met — 71/71 (`angular-browser.mjs`: axe over every usage example and state fixture, light and dark, plus forced colours and reduced motion; `angular-overlays.mjs`: axe over every overlay OPEN, nested and composed; `angular-collections.mjs`: axe over every menu and listbox OPEN, submenus and empty lists included) |
| RTL | `rtl` wherever React has it | gate | met — 18/18 (this row read 10/10 after Wave C1 while the guard computed 13/13; Wave C2a added the three menus, Wave C2b select and multi-select; Angular measures 38 in four direction cases) |
| Large text | `largeText` wherever React has it | gate | met — 26/26 (Wave C2a added the three menus, Wave C2b select and multi-select; Angular measures 44) |
| Large text | …from a real browser (`large-text.mjs`) | gate | met — 26/26 |
| Motion | `reducedMotion` wherever React has it | gate | met — 3/3 (switch, accordion, collapsible) |
| Motion | …from a real browser (`motion.mjs`) | gate | met — 3/3 (Angular's in `angular-browser.mjs`, which also measures the app bar's menu) |
| Visual | A rendered visual/state gate covers Angular wherever one covers React | gate | met — 14/14 (Wave C2b: select in `check:entry-visual`, multi-select in `check:composite-visual`): the interactive Card (`kxCard` on a link or button) and `kx-number-input`'s `readonly` closed the two `partial` marks, and input-group and input-otp arrived measured. password-input is measured too but not owed (React's PasswordInput is not separately gated) |
| Visual | Every registered visual gate exists and runs in CI | always | met |
| Visual | A visual gate claims Angular only for components Angular implements | always | met |
| Documentation | The package README's counts, component list and Preview label match the manifest and evidence | always | met (it was stale — 31 components, 69 symbols — and is corrected in this change) |
| CI | The guard itself: fails if `maturity` is `stable` with any gate criterion open | — | in `ci.yml` |

12 of 13 gate criteria are met; only the catalogue is open (25 planned). Angular stays Preview.

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

Derived from the manifest's own `wave` tags (now `layout` 7, `data` 7, `advanced` 7, `overlays` 3,
`navigation` 1 — the `inputs` tag closed with Wave A), reordered by dependency. The evidence instrument came
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

### Wave C2a — the collection core and the menus (done)

**Components:** `dropdown-menu`, `context-menu`, `menubar` (3). 12/13 held; Angular 64 → 67. The listboxes
(`select`, `combobox`, `multi-select`, `command`) are C2b and are not part of this wave.

**One set of parts, three roots.** Every item part (`kxMenuItem`, `kx-menu-checkbox-item`,
`kx-menu-radio-group` / `kx-menu-radio-item`, `kx-menu-label`, `kx-menu-group`, `kx-menu-separator`,
`kx-menu-shortcut`, and submenus: `kx-menu-sub`, `kxMenuSubTrigger`, `kx-menu-sub-content`) is written once in
`lib/menu.ts` and finds its menu through DI, so the dropdown menu, the context menu and the menubar differ
only in their root and trigger. The menus are floating surfaces of the C1 layer (`popover="manual"`, the one
stack, `computePlacement`); no second overlay system was added. Two additions to the layer: a virtual anchor
(a rectangle and the element whose direction it reads), which is how a context menu opens at the pointer, and
`reposition()`, which re-places an open surface when its anchor moves (a second right-click). Element anchors
are unchanged, and the C1 gate still passes over them.

**The collection core** (`lib/collection.ts`, internal, not exported): `moveIndex` (next, previous, first,
last, skipping disabled items; wrapping is the caller's choice: menus stop at their ends, as React's tested
contract does, and the menubar's triggers wrap), `moveForKey` and `inlineKey` (horizontal keys resolved
against direction), `isRtl` (the nearest `[dir]`, else the computed style through the element's own window),
the typeahead (a 500ms buffer, a repeated letter cycles, disabled items never match) and roving focus (one
Tab stop). Tabs, accordion and the code block keep their own copies; moving them onto the core is a later,
behaviour-neutral change.

| | |
|---|---|
| Behavioural contracts | dropdown menu (Enter, Space, ArrowDown open on the first item, ArrowUp on the last; arrows stop at the ends; Home/End; typeahead; Enter/Space activate; Escape closes and returns focus; Tab closes and moves on; activating an item closes the tree and returns focus to the trigger; disabled items announced and skipped); submenus (two levels, nested in the parent's DOM; ArrowRight/Enter/Space open on the first item, ArrowLeft and Escape close ONE level with focus on that level's trigger; hover opens after 100ms; a grace triangle lets the pointer cross the parent's items on the way into the submenu); context menu (right-click opens at the pointer, a second right-click moves it there, the ContextMenu key and Shift+F10 open it at the focused element, Escape returns focus there); menubar (one Tab stop, ArrowLeft/Right wrap across triggers, with a menu open they open the neighbour's menu, ArrowRight past a submenu moves to the next menu, the pointer switches menus while one is open); checkbox and radio items (`aria-checked`, two-way `checked` and `value`) |
| Accessibility | `menu`, `menuitem`, `menuitemcheckbox`, `menuitemradio`, `group` named by its label, `separator`, `menubar`; the trigger carries `aria-haspopup`, `aria-expanded`, `aria-controls`; the menu is named by its trigger; axe over every menu OPEN (submenus included) and the three usage examples, light and dark; forced colours (highlight and open-trigger outlines) |
| RTL | 3 components in four direction cases (RTL page, LTR page, an RTL region in an LTR page and the reverse): submenus open toward the inline end, ArrowLeft opens and ArrowRight closes in RTL, the menubar's arrows follow reading order, a context menu's inline-start corner sits on the pointer |
| Large text | 3 components at 2× text at 1024px and 390px: inside the viewport, no clipped text, 24px targets; a submenu with no room beside its parent opens below its trigger |
| Motion | the surface's motion is the floating surface's (C1); item and trigger state changes are `duration-instant` and none under reduced motion |
| Visual | `check:menu-visual` (new, Angular only): each item state against the others, the keyboard highlight against the pointer's, disabled, destructive, check and radio marks, shortcut contrast at rest and highlighted, the chevron and the submenu's side in LTR and RTL, the menubar's open trigger, and forced colours; light and dark |
| Compositions | a data row's action menu (named by its row's trigger; a destructive action removes the row) and a menu inside a dialog (`check:angular-overlays`: Escape closes the menu, then the dialog, one layer at a time) |
| Defects it found and fixed | a menu reopened during its own closing transition could not take focus for one frame (Chromium; focus now retries on the next frame if nothing else took it); at 390px and at 200% text a submenu was squeezed into the 10px beside its parent (it now opens below its trigger); a context menu's second right-click did not move the open menu; a muted shortcut fell below 4.5:1 on a highlighted item (axe; it now takes the item's colour); the native `disabled` attribute removed disabled items from the accessibility tree (they are now `aria-disabled`) |

**Findings not fixed:** when a data row's action removes the row, its trigger goes with it and focus falls to
`body`. Where focus should go (the next row, the table) is the data table's decision, which is Wave D.

#### Negative controls (Wave C2a)

10 controls, each a real break in the source, a fresh harness built from it, the gate run against it, and the
file restored from git and checked by hash before the next (logs and `summary.json`:
`/mnt/project-files/angular-wave-c2a/negative-controls/`). None committed. Every one was caught:

- Vertical arrows wrap at the ends of a menu → `check:angular-collections`: "ArrowDown … stops at the end (no wrap)".
- Typeahead includes disabled items → `check:angular-collections`: "typeahead never lands on the disabled item".
- Submenu open/close keys not mirrored in RTL → `check:angular-collections`: RTL page: "ArrowLeft (the inline-end arrow) opens it", and its closing pair.
- Submenu rendered outside the parent menu (portalled to body) → `check:angular-collections`: "submenus are nested in their parent menu in the DOM, two levels deep", and the tree no longer closing as one.
- Escape closes the whole menu tree → `check:angular-collections`: "Escape closes one level: the deepest, the other two stay open", in the dropdown and the context menu.
- No focus return after an item is activated → `check:angular-collections`: "focus returns to the trigger after an item runs" (focus was on `body`).
- Context menu anchored to its trigger, not the pointer → `check:angular-collections`: "it opens AT the pointer" (point 88,144; menu at 48,276) and "a second secondary click moves it".
- aria-checked not updated on a checkbox item → `check:angular-collections`: "a checkbox item is a menuitemcheckbox with its state", in the dropdown and the context menu.
- Menubar horizontal movement does not open the neighbouring menu → `check:angular-collections`: "with a menu open, ArrowRight opens the next menu", and the wrap and ArrowLeft cases.
- Keyboard highlight identical to the pointer highlight → `check:menu-visual`: "an inset focus ring clears 3:1 against the layer" (1.00:1) and "keyboard and pointer highlights look different", light and dark, LTR and RTL.

### Wave C2b — the listboxes (done)

**Catalogue entries:** `select`, `command`, `multi-select` (components) and `combobox` (a recipe). 12/13 held;
Angular 67 → 71 implemented (70 components and one recipe), 69/98 → 73/98, 29 → 25 planned.

**One listbox layer on the C2a core** (`lib/listbox.ts`, internal, not exported). The core gained
`KxActiveDescendant` (`lib/collection.ts`) and `readableText`; the walk itself is C2a's (`moveIndex`, the
disabled skip, the typeahead), extended rather than forked. On top of it, `KxOptionList` is the controller every
owner holds (selection mode, vertical keys, typeahead, pointer highlight), `KxOptionBase` is what every option
shares (`role="option"`, a stable id from the C1 id counter, `aria-selected`, `aria-disabled`, `hidden`),
`KxOptionField` is the root of a field that opens a listbox (a C1 floating root that is also a
`ControlValueAccessor`) and `KxOptionPopup` its C1 floating surface. Select and multi-select are fields; the
command owns its list directly; the combobox recipe is a popover holding a command. No new portal, overlay
system or focus stack: every popup is a `popover="manual"` surface on the one C1 stack, so Escape closes only
the top layer.

**`aria-activedescendant`.** Focus never moves into a listbox: it stays on the select's trigger, the command's
search field or the multi-select's input, and the field names the current option. The current option is a
computed value, not a stored id: `current` is the item last made active only while it is present, visible and
enabled, so a filter that hides it, a change that disables it, or its removal drops it in the same change, and
the field's attribute follows (`activeId` is null rather than stale). `set` refuses disabled and hidden items,
so a disabled option can never become current, by arrow, Home/End, typeahead or pointer. Options are
`mousedown`-prevented, so a press inside a popup keeps focus where typing reaches it. A command or multi-select
search resets the highlight to the first match. `aria-selected` follows the selection mode, not the highlight:
the chosen value in a select, every chosen value in a multi-select (`aria-multiselectable`), and the highlight
in a command, whose items are actions (selection follows focus). A listbox whose filter leaves nothing drops
its role, and the command field reads collapsed, because a listbox must own options.

| | |
|---|---|
| Behavioural contracts | select (Enter, Space, ArrowDown, ArrowUp open on the chosen option or the first/last; arrows stop at the ends; Home/End; typeahead, disabled options never match; Enter/Space choose and close; Escape closes without changing the value; Tab closes and moves on; focus returns to the trigger; CVA value, touched and disabled); command (local, synchronous filtering by text, value and keywords; groups hide when empty; the empty text; disabled items skipped; Enter runs the highlighted item; the network is checked during a search: no request leaves the page); the combobox recipe (trigger, popover, command; choosing closes and returns focus; Escape closes only the popover); multi-select (typing filters, Enter toggles, Backspace in an empty input removes the last chip, every chip has a remove button named "Remove X", removal from the keyboard keeps focus in the field, `creatable` offers "Create “…”") |
| Accessibility | combobox / listbox / option / group roles, `aria-expanded`, `aria-controls`, `aria-activedescendant`, `aria-selected`, `aria-multiselectable`, `aria-disabled`; axe over every listbox OPEN and with an empty filter, light and dark; ids unique on the page and never stale after close and reopen; a select and a multi-select inside a dialog (Escape closes the listbox first, then the dialog); a command palette in `kx-command-dialog` |
| RTL | select and multi-select in four direction cases: popups align to the inline start, chips and remove buttons mirror, keys unchanged (vertical) |
| Large text | select and multi-select at 2× text at 1024px and 390px: the popup stays inside the viewport, no clipped text, 24px targets, a long chosen label and a five-chip selection wrap rather than overflow |
| Motion | select and multi-select: the surface's motion is C1's, none under reduced motion |
| Visual | `check:entry-visual` (select: rest, filled, invalid, disabled), `check:composite-visual` (multi-select: the same, and the chip's remove button as a part), `check:menu-visual` (select and multi-select open: rest, hover, keyboard highlight distinct from hover, selected, disabled, the open surface; light and dark, LTR and RTL; forced colours) |
| Defects it found and fixed | an empty command list kept `role="listbox"` with no options (axe `aria-required-children`); at 2× text the select popup was placed from a stale shrink-to-fit width and overflowed the viewport (the popup is now measured from the start edge and placed in one pass); at 390px the multi-select input's intrinsic width widened the page; chip remove buttons were under 24px; the chip remove button's focus ring was 2.77:1 because the button's muted opacity muted its ring (it is now an inset ring at full opacity inside a multi-select) |

**Findings not fixed:** the base `KxTag` remove button's focus ring has the same muted-opacity weakness outside a
multi-select (pre-existing, Tag is not in this wave). C1's shrink-to-fit popover can take one frame to converge
on its placement; the listbox popup no longer depends on it, the popover still does. In this container
`check:angular-browser` fails "KxBreadcrumb: nothing truncated inside it"; it fails identically on main
`4a7a587` with no C2b change, so it is not this wave's.

### What remains after Wave C2b, ranked

25 planned. Ranked by what each group unblocks and by the evidence React already holds for it (which Angular
will owe the moment it implements the component):

1. **The rest of Wave C (below)** — `navigation-menu`, notifications (`sonner`, `notification-center`,
   `tour`), then `sidebar`. The collection core now has both roving focus (menus) and the active descendant
   (listboxes); notifications add the toast queue.
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

**C1, C2a and C2b are done** (above): the layer, the eight dialog-family members, the three menus and the four
listbox entries. What follows is `navigation-menu`, notifications and `sidebar`.

**Owed by the remaining 5 (React has it):** interaction 1 (tour) · rtl 2 (navigation-menu, tour) · browser
axe 5. Before C2b this line read 9 entries: C2b paid select's and multi-select's interaction, rtl, largeText
and visual-gate debts and the four entries' browser axe.

### Wave D — data and advanced

**Components:** `table`, `data-table`, `data-grid`, `virtual-list`, `tree-view`, `chart`, `json-viewer`,
`diff-viewer`, `message-bubble`, `calendar`, `date-picker`, `color-picker`, `file-upload`,
`audio-player`, `kanban-board`, `markdown-editor` (16).

**Why last:** they compose earlier waves — `date-picker` is popover + calendar, `data-table` composes
`table` and `button` (React's has its own previous/next paging, not the pagination component, and no
dropdown menu), `kanban-board` needs drag with a keyboard alternative.

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
