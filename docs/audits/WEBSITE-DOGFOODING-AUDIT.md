# KinetixUI website dogfooding audit

Refreshed 14 October 2026 against main `acfe95af62befb4d11b3527a529bfd635c825fb8`, after #375, #377, #378, #380, #358 and #357 landed, and merged as #379 (`d155db1`). It was first audited on 13 October against `ae9cc44`. **Wave 2a** (the command menu and the mobile menu, below) is measured against `d155db1`; **Wave 2b** (selectors and modes) against `bfddb67`, after #381; **Wave 2c** (site actions and fields) against `4f465a4`, after #382; **Wave 2d** (copyable IoT examples) against `1893c9f`, after #383; **Wave 2e** (IoT showcase sliders) against `e15f0e8`, after #384. Scope: `apps/web` routes, components, registry demos, and block/usage/IoT examples. This is a consumer audit. It is not a library redesign, and it does not declare the whole site accessible.

Every interactive or styled product control should use KinetixUI, unless a documented exception explains why. Structural HTML, real content, illustrations, layout, route logic and application state belong to the website. Using a library component does not by itself prove visual consistency, so local class overrides remain reviewable.

## Counting contract

`node scripts/check-web-dogfooding.mjs` parses every non-test `.ts`/`.tsx` file under `apps/web/src` with the TypeScript AST and counts **JSX syntax sites**. A loop counts once, so this is neither a DOM instance count nor a count of distinct widgets. It resolves aliased imports from `@kinetixui/*` (A) and direct `@radix-ui/*`/`cmdk` imports, and it flags raw `button`, `select`, `input`, `textarea`, `details`, `summary` and `table` elements, interactive ARIA roles and lower-case elements with pointer or keyboard handlers.

Text, comments, quoted snippet strings and test files are not scanned. Neither is MDX: all **132 MDX files** were checked separately, and every native-tag match sits inside a fenced or inline code example, not in a live control. Sections, headings, lists, nav, divs and links are structural and not counted.

`--write-inventory` regenerates `website-dogfooding-inventory.json` (every site, with file, line and classification) and `website-dogfooding-inventory.md` (grouped by file and pattern) from the same scan.

## Snapshot: current versus the original audit

| Class | Meaning | Original (`ae9cc44`, after Wave 1) | #379 (`d155db1`) | After Wave 2a (#381) | After Wave 2b (#382) | After Wave 2c (#383) | After Wave 2d (#384) | **After Wave 2e** | Δ 2e |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| A | KinetixUI component JSX sites | 1,037 | 1,196 | 1,218 | 1,236 | 1,273 | 1,312 | **1,314** | +2 |
| B | KinetixUI equivalent exists; site authors a native/vendor primitive | 135 | 96 | 76 | 58 | 32 | 4 | **0** | −4 |
| C | Needs a missing library variant first | 6 | 4 | 4 | 4 | 5 | 5 | **7** | +2 |
| D | Valid site composition or deliberate native behaviour | 24 | 27 | 27 | 31 | 33 | 33 | **33** | 0 |
| E | Read-only semantic HTML (tables) | 9 | 9 | 9 | 9 | 9 | 9 | **9** | 0 |
| | Source files scanned | 241 | 252 | 252 | 252 | 252 | 252 | **252** | 0 |
| | Native/vendor sites (B+C+D+E) | 174 | 136 | 116 | 102 | 79 | 51 | **49** | −2 |
| | Files with B/C debt | — | 30 | 28 | 24 | 12 | 4 | **4** | 0 |

A grew mostly through new surfaces built on the library: business discovery (#377), the Phase 2 business components on component pages (#378), and #380's Tabs/Toggle migration.

### Resolved since the original audit
- **#380, the canonical Tabs and platform filters.** 42 direct `@radix-ui/react-tabs` JSX sites (34 ledger entries) were removed from 8 files: `component-preview`, `showcase`, `cross-platform-flagship`, `usage-example-tabs`, `iot/example-showcase`, `iot/lab/lab-tabs`, `iot/lab/category-explorer` and `systems/explorer-tabs`. Gallery platform filters became library `Toggle` (one raw button fewer).
- **#380, library capability.** `ToggleGroup type="single" variant="pill"` now covers the IoT `PillSelector`'s needs, so its 2 sites move from **C to B**.
- **#357, Label in Name (WCAG 2.5.3).** The docs "Copy as Markdown" button is named by its visible text. This PR keeps that name on its Wave 1 `Button` migration and does not restore the old `aria-label="Copy this page as Markdown"`.
- **Reclassified.** The infographic world map's `<g role="button">` is an SVG region (a `<button>` cannot live inside SVG), so it is D, not B.

### New since the original audit
- `app/capabilities/page.tsx` (#377): native `<details>/<summary>` for planned capability rows. **D**, the native-disclosure family.
- `components/iot/showcase/pending-command.tsx` (#375): 2 raw Retry/Cancel buttons. **B**, `Button size="sm"`.
- `examples/iot/command-card.tsx` (#375): 1 raw action button in a copyable example. **B**, `Button` plus snippet regeneration.
- `component-gallery.tsx`: the 9 remaining raw buttons now include #377's business filter chips (`aria-pressed`). **B**, `Toggle variant="pill"`.

## Tabs, segmented controls and toggles after #380

Canonical semantics: **Tabs** are peer content/section navigation, **SegmentedControl** is an enclosed local mode, **PillSelector** (library: `ToggleGroup type="single" variant="pill"`) is compact exclusive option selection, and **ToggleGroup/Toggle** are grouped or independent toggles. The Tabs visual comes from the library; site code only adds layout padding to `TabsList` and never restyles triggers.

| Surface | Current implementation | Class |
|---|---|:---:|
| Platform code tabs: component preview, blocks showcase, homepage flagship, implementation explorer, usage examples | library `Tabs` | A |
| Preview / Code: component preview, blocks showcase, IoT example showcase | library `SegmentedControl` | A |
| IoT lab and category navigation | library `Tabs` (peer panels) | A |
| List / Grid / Board (systems component spotlight) | library `SegmentedControl` | A |
| Component gallery platform filters | library `Toggle` with platform marks | A |
| Component gallery business filters (#377) | library `Toggle variant="pill"` (Wave 2b) | A |
| Preview LTR / RTL direction | library `SegmentedControl` (Wave 2b) | A |
| Homepage hero system map | direct Radix `Tabs.*`: nodes of a measured diagram | D (Wave 2b review) |
| IoT `PillSelector` (environments, device detail) | library `ToggleGroup type="single" variant="pill"` (Wave 2b) | A |
| IoT device-dashboard group filter | library `ToggleGroup type="single" variant="pill"`; was `role="tab"` with no tabpanels (Wave 2b) | A |
| Floor selector, date strip | multi-line tiles, `role="radiogroup"` | C (see below) |

## Remaining debt (B: none)

| Wave | Sites | Files and KinetixUI equivalent | Why it remains |
|---|---:|---|---|
| ~~2a Overlays~~ | ~~20~~ → 0 | Done in Wave 2a (below): `command-menu` (14) → `CommandDialog` + `Command*`; `mobile-nav` (6) → `Sheet side="start"` | — |
| ~~2b Selectors and modes~~ | ~~18~~ → 0 | Done in Wave 2b (below): 14 migrated, 4 (`systems/hero-system-map` tabs) reclassified D | — |
| ~~2c Site actions and fields~~ | ~~26~~ → 0 | Done in Wave 2c (below): 23 migrated and removed from the ledger, 2 migrated onto `Card asChild` and kept as D (the guard counts the native child), 1 (`create-sidebar` option tiles) reclassified C | — |
| ~~2d Copyable IoT examples~~ | ~~28~~ → 0 | Done in Wave 2d (below): all 28 migrated, snippets regenerated; `gen-iot-examples` now rejects a raw control in a copyable region | — |
| ~~2e Sliders~~ | ~~4~~ → 0 | Done in Wave 2e (below): Last sync and temperature → `Slider`; battery and signal reclassified C (the library Slider cannot express disabled yet) | — |

No B debt remains: every site control with a KinetixUI equivalent uses it. What is left is library gaps (C, below), each waiting on a library change, and reviewed exceptions (D, E).

## Library gaps (C, 7 sites)

**Slider disabled state (2 sites, Wave 2e).** `iot/device-showcase.tsx` battery and signal ranges are disabled while the device reports no value. The library `Slider` cannot express that: Radix puts `aria-disabled` on the root span, not on the thumb that carries `role="slider"` (the thumb only leaves the tab order), and the thumb's `disabled:` utilities target a span, which never matches `:disabled`, so a disabled Slider is neither announced nor shown as disabled. Proposed library issue: in `packages/ui/src/components/slider.tsx`, put `aria-disabled` on each thumb and give the root and thumb a `data-[disabled]` visual state (opacity, no pointer), with a test that a disabled Slider's thumb is reported disabled; then migrate both ranges. A second, smaller gap: the thumb accepts only `aria-label`/`aria-labelledby`, so a caller cannot set `aria-valuetext` (Last sync's stops are announced as their index, as the native range did; the name carries the label).

The other three C surfaces need an **exclusive selectable tile/card item**: a radio-like single selection whose item is a multi-line tile (rounded-lg card, a primary line plus secondary rows, status badges, or a rendered sample) with roving focus and RTL support.
- `building-ops/building-ops-demo.tsx` floor selector (2 sites): floor code, alert count, occupancy, cameras.
- `iot/showcase/date-strip.tsx` (2 sites): weekday, date, today and event cues; locale/UTC formatting.
- `create/create-sidebar.tsx` option tiles (1 site, Wave 2c): a label tile holding a native radio and a rendered sample (style, surface, radius, chart palette), in a `fieldset` whose legend names the group. `RadioGroupItem` is a bare circle, and `Card asChild` takes only links and buttons, so neither carries a radio tile; the native radios already give the group semantics, arrow keys and form behaviour.

Rechecked after #380 and Phase 2. `ToggleGroup`'s `pill` variant is a single-line rounded-full pill, and `RadioGroupItem` is a circular indicator. Neither is a tile, and restyling a pill into a tile in site code would recreate library visuals locally. Proposed library work (Wave 3): a `tile` variant on `ToggleGroupItem` (or a `SelectableCard` radio item), tested for keyboard, RTL, disabled, forced colors and 200% text, then migrate both surfaces. A small, non-blocking API asymmetry: `Toggle` has `leadingIcon` but `ToggleGroupItem` does not, so a pill group passes its icon as a child.

## Deliberate exceptions (D 33, E 9)

| Family | Sites | Surfaces | Decision |
|---|---:|---|---|
| Native disclosure | 14 | `capabilities` page, `changelog-view`, `create-sidebar` advanced, `iot/example-showcase`, `iot/lab/category-explorer`, `iot/showcase/primitives`, `platform-verification` | Keep `<details>/<summary>`: opens without JavaScript, keeps content mounted for search and Markdown copy. Replace only with progressive-enhancement proof |
| Spatial / SVG interaction | 10 | `building-ops/floor-plan`, `infographic/world-map`, `iot/showcase/space-canvas`, `systems/hero-system-map` node and its platform tabs (4, Wave 2b) | Geometry, hit areas and focus model stay local; never a `<button>` inside SVG or nested buttons. The hero's tabs are real tabs (tablist, panels, automatic activation, `dir`) whose triggers are the diagram's nodes |
| Domain compositions | 4 | `iot/showcase/primitives` room/device tiles | Keep grouping and pending/confirmed states; compose `Button`/`Badge` internally in Wave 3 |
| Animation pause | 2 | `platform-ticker`, `iot/lab/iot-hero-art` | WCAG 2.2.2 pause belongs to the animation; compose `Button` later, never remove the control |
| Native colour channel | 1 | `create/create-color-picker` range | OS touch/keyboard behaviour and continuous draft updates; the gradient track is colour data |
| Library `Card asChild` | 2 | `docs/colors` swatch tiles, `building-ops/camera-panel` camera rows (Wave 2c) | **Library use, not debt.** `<Card asChild><button>` is the Card's documented actionable/selectable pattern: it supplies hover, press, the focus ring and the `aria-pressed` selected edge. The guard counts the native `<button>` child it renders through; D records that it was reviewed |
| Read-only tables (E) | 9 | `infographic`, `iot` page, `building-ops-demo`, `component-api`, `foundations-tables`, `token-evidence`, `token-table` | Semantic `<table>` with headers/captions; no sort, select or page contract. The guard classes these E automatically |

## Wave 1 (#379)

Eight native sites across five files moved to library components. No component API, dependency or device logic changed.
- **`copy-button.tsx`**: Ghost icon `Button`. Same clipboard promise, success-only callback, analytics without the payload, fixed `aria-label` and polite live region. **Visible change:** it is drawn at the library's 44px icon size instead of 28px. Callers that size it (component-meta, block-install) keep their size. It keeps `shrink` so preview toolbars do not overflow at 200% text.
- **`code-pre.tsx`**: Ghost icon `Button`, positioned with logical `end-2.5` (was physical `right-2.5`), opaque theme background. Same extraction, analytics and live region.
- **`docs-page-actions.tsx`**: Outline `Button` `md`, which wraps at 200% text. **Named by its visible text ("Copy as Markdown", then "Copied"), as #357 made it**; the live region still announces the copy.
- **`iot/device-showcase.tsx`**: `NativeSelect` for Status and Reading quality. Same IDs, labels, option values, controlled handlers and missing-telemetry behaviour.
- **`examples/iot/harness.tsx`**: three Outline `Button`s for pause/resume, step and reset. Same `aria-pressed`, callbacks and reduced-motion notice; no copyable snippet region changed.

This refresh also fixes the maturity suffix inside platform tabs (`component-preview`, `usage-example-tabs`), changing physical `ml-1.5` to logical `ms-1.5` so the gap sits on the correct side under RTL.

## Wave 2a: the command menu and the mobile menu

Both were direct `@radix-ui/react-dialog` (and, for the command menu, direct `cmdk`) compositions that re-implemented what the library's `Dialog`, `Command` and `Sheet` already ship: the overlay, the panel, the item and group styles, the close button. 20 B sites in 2 files; both files now use only library JSX (+22 A sites; A counts syntax sites, and the nine shortcut keys render through one local `Key` wrapper of the library `Kbd`).

**Library first, where the site needed something the library lacked** (`@kinetixui/ui`, patch changeset, tests in `components-overlay.test.tsx`, documented on the Sheet and Command pages and in the generated API tables):
- `Sheet`: `side="start"` / `side="end"`, which follow the reading direction (`inset-inline-start/end`, the slide flipped with `rtl:`). The physical sides stay for panels that belong to a screen edge. Side panels now scroll when their content is taller than the viewport (the mobile menu is 1,281px tall at 390×844). `closeLabel` names the built-in close button.
- `CommandDialog`: a `title` (it rendered an **unnamed** dialog before), an optional `description` (otherwise no dangling `aria-describedby`), a `trigger` (Radix returns focus to the dialog's own trigger; a palette opened by state had none, and focus fell to `<body>`), `commandProps`, and top anchoring so the field does not move while filtering re-sizes the list. `CommandProps` is exported.

**Command menu** (`components/command-menu.tsx`): `CommandDialog` with `title="Search the docs"`, `commandProps={{ label: "Command menu" }}` and the header trigger as `trigger` — a library `Button variant="Outline"` keeping the collapse to an icon below `sm`. `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`, and library `Kbd`/`KbdGroup` for the shortcut hints, at the site's 12px floor for chrome text (`text-label-md`, the next step of the library scale; the library `Kbd` is the 11px label step, which `check:web-quality` rejects on site chrome). Kept: ⌘K/Ctrl+K and `/` (ignored in fields), focus in the search field on open, filtering, arrow keys, Enter, Escape, route and theme actions closing the dialog first, focus returning to the trigger, the scroll lock, the page behind hidden from AT, the trigger's accessible name ("Search…", plus the shortcut keys where they are visible). No analytics before or after.

**Mobile menu** (`components/mobile-nav.tsx`): `Sheet` with `SheetTrigger asChild` on a library Ghost icon `Button` ("Menu"), `SheetContent side="start" closeLabel="Close menu"`, `SheetTitle`. Kept: the page-dependent breakpoint, focus on open (the close button, as before), the focus trap, Escape, the named close button, focus back on the trigger, the scroll lock, closing on navigation, `aria-current`, the guide groups.

**Behaviour that changed, on purpose:**
- The mobile menu is a side panel from the inline start (left in LTR, right in RTL; 75% wide, `max-w-sm`) over the library scrim, not a full-screen page, so a press outside it dismisses it.
- The command palette is full-width below `sm` (the library Dialog's phone layout) instead of inset 16px, and has the library Dialog's close button.
- The command trigger and the menu trigger are library Buttons, so they share the header's other tool buttons' hover and focus treatment.
- ⌘K/`/` no longer open the command menu over another open dialog. On main, ⌘K over the open mobile menu stacked a second modal, and closing it sent focus to the search trigger behind the menu, which the menu hides from assistive technology (reproduced on a `d155db1` build).

## Wave 2b: selectors and modes

18 B sites in 5 files. Each was read before it was mapped; two mappings changed from the plan above (the active-filter chips are a whole-chip `Button`, not `Tag onRemove`; the hero map is D, not `Tabs`). No library API changed.

| # | Site | Before | After | Behaviour | Accessibility | Tests | Status |
|---:|---|---|---|---|---|---|---|
| 1–2 | `examples/iot/device-dashboard.tsx` group filter | `div[role=tablist]` + `button[role=tab]`, **no tab panels**; each tab its own tab stop | `ToggleGroup type="single" variant="pill"`, `aria-label="Device group"` | **Corrected:** a filter of the list below, so a radiogroup, not tabs. One tab stop, arrows move, Space/Enter chooses, no empty selection. Filtering unchanged | No orphaned tab roles; named radiogroup; `aria-checked`; focus ring; axe clean (jsdom and Chromium) | new `device-dashboard.test.tsx` (4); fails against main's version; snippet regenerated | Complete |
| 3–4 | `components/iot/showcase/pill-selector.tsx` | `div[role=radiogroup]` + `button[role=radio]` with hand-rolled roving and DOM-`dir` arrow reversal | `ToggleGroup type="single" variant="pill"` (same props) | Kept: name, check on the chosen pill, icons, counts, wrap, no empty selection. **Changed:** arrows move focus and Space/Enter chooses (the library's single-choice model) instead of choosing on every arrow; direction now from the nearest `KinetixDirectionProvider` | radiogroup/radio, one tab stop on the chosen pill; RTL arrows reversed | `reference-pieces.test.tsx` rewritten (3), `smart-space-environment.test.tsx` updated; both fail against main's version | Complete |
| 5 | `components/preview-environment.tsx` direction | two `button[aria-pressed]` in `role=group` | `SegmentedControl` (`dir` = page direction) | Kept: per-preview direction, page never written, starts in the page's direction. **Changed:** exclusive choice exposed as radios (`aria-checked`) with one tab stop | radiogroup "Preview direction"; arrow keys follow reading order | `preview-environment.test.tsx` updated + keyboard case | Complete |
| 6 | `component-gallery.tsx` business chips | raw `aria-pressed` buttons (`catButton`) | `Toggle variant="pill"`, as the category and platform chips | Same press/clear, URL state and counts | `aria-pressed`; 40px coarse target (touch check) | new disclosure/chip case | Complete |
| 7 | gallery clear search | raw icon button in `InputGroupAddon` | `InputGroupButton` | Clears and refocuses the field | "Clear search"; 40px coarse target | new clear-search case | Complete |
| 8 | gallery Filters trigger | raw button | `Button variant="Outline"` (`SheetTrigger asChild`) | Count in the name, phone only | "Filters, N active" | existing sheet tests | Complete |
| 9–10 | gallery sheet "Show N components" / "Clear all" | raw buttons | `Button` / `Button variant="Ghost"` | Close sheet / clear all | named by text | existing | Complete |
| 11 | gallery desktop "Clear all" | raw button | `Button variant="Ghost"` | Clear all | named by text | existing | Complete |
| 12 | gallery "Business filters" disclosure | raw button `aria-expanded` + `hidden` div | `Collapsible` + `CollapsibleTrigger asChild` `Button variant="Ghost"` | Same open/close, opened by an active business filter. `aria-controls` now set only while open, and correctly wired (an explicit `id` would have broken it) | `aria-expanded`; hidden content not exposed | new disclosure case | Complete |
| 13 | gallery active-filter chips | raw buttons | `Button variant="Outline"` (whole chip removes, as before) | Same names ("Remove filter …") and URL update | whole-chip target kept; a `Tag` dismiss icon is ~14px | existing removal test | Complete |
| 14 | gallery empty-state "Clear filters" | raw underlined button | `Button variant="Link"` | Clear all | named by text | existing | Complete |
| 15–18 | `systems/hero-system-map.tsx` `Tabs.Root/List/Trigger/Content` | direct Radix Tabs | unchanged, **reclassified D** | Real tabs already (tablist, panels, automatic activation, `dir`, tour pause) | unchanged | `tabs-dogfood`, `home-systems` | Reclassified (not migrated) |

**Why the hero map is D, not migrated.** Its tab triggers are the nodes of a measured trace drawing, placed by the map's CSS subgrid and drawn as dashed cards the traces connect. The library `TabsList`/`TabsTrigger` would need their list display, gap, border, scroll, underline indicator, centring, nowrap, hover fill, inset focus ring and vertical borders overridden in site code to keep the drawing — the local restyling #380 rules out — or the homepage hero would be redesigned. Neither is a migration, and a "node" tab variant for one diagram is not a reusable library gap.

**Direction for IoT previews.** Interactive IoT examples now mount inside a `KinetixDirectionProvider` with the page's direction (`lazy-preview.tsx`). Radix controls read direction from context and, with none, stamp `dir="ltr"` on their own roots, which on an RTL page laid the new pill rows out LTR with LTR arrow keys. The provider fixes that for every Radix control in those examples. The copyable dashboard snippet stays provider-free; an application wraps its root once, as the library documents.

## Wave 2c: site actions and fields

26 B sites in 15 files. Each was read before it was mapped. 25 now render library components; one is a C exception. No library API changed and no analytics call moved: the changelog's URL state, the `CopyButton`'s `cli_command_copied` event and the create page's events are untouched.

| # | Site | Before | After | Behaviour | Accessibility | Tests | Status |
|---:|---|---|---|---|---|---|---|
| 1 | `app/charts/charts-content.tsx` series legend | raw `aria-pressed` pills with a swatch | `Toggle variant="outline" size="sm"`, swatch as `leadingIcon`; the published snippet now shows `Toggle` too | Same hide/restore per series; off is still struck through | `aria-pressed`, `type="button"`, focus ring | new `website-wave2c.test.tsx` | Complete |
| 2 | `docs/colors` "Value format" | `role=group` of exclusive `aria-pressed` buttons | `SegmentedControl` (`dir` = page) | Same format switch. **Changed:** exposed as radios, one tab stop, arrows move, Space/Enter chooses | radiogroup "Value format" | new | Complete |
| 3 | `docs/colors` "Copy ramp as CSS" | raw button **without `type`** | `Button variant="Outline" type="button"` | Same clipboard text | named by text | new | Complete |
| 4 | `docs/colors` swatch tiles | raw button with mouse-enter/leave state for a hover ring | `<Card asChild><button>` (D, see exceptions) | Same copy and visible-text name (WCAG 2.5.3). **Changed:** hover is the Card's lift instead of a primary ring, so the `hoverStep` state is gone; the copy icon also shows on keyboard focus | Card focus ring | new | Complete |
| 5 | `building-ops-demo` zone name | raw `aria-pressed` button in a row header | `Toggle size="sm"` | Same select / press-again-to-clear | `aria-pressed` | new + existing | Complete |
| 6 | `camera-panel` "Clear zone filter" | raw button | `Button variant="Ghost" type="button"` | Same | named by text | existing + new | Complete |
| 7 | `camera-panel` camera rows | raw `aria-pressed` button styled as a row | `<Card asChild><button aria-pressed>` (D) | Same selection and `data-camera-row`. **Changed:** selected is the Card's 2px primary edge instead of a foreground border and accent fill | Card selected, hover, press and focus states | existing + new | Complete |
| 8 | `changelog-view` "Clear search and filters" | raw button | `Button variant="Outline" type="button"` | Same | named by text | existing | Complete |
| 9 | `changelog-view` `#changelog-search` | raw `type=search` input | `Input type="search"` | Same id, label, Enter commit, debounce and URL | library field states | existing (31) | Complete |
| 10 | `changelog-view` "Filter releases" | `role=group` of exclusive `aria-pressed` pills | `ToggleGroup type="single" variant="pill"` (`dir` = page) | Same URL state, counts and ✓ marker. **Changed:** a radiogroup with one tab stop; a chosen filter cannot be un-chosen ("All" is the way back) | radiogroup, `aria-checked` | updated + 2 new keyboard cases | Complete |
| 11–12 | `create-advanced`, `create-color-picker` hex/OKLCH fields | raw inputs, invalid edge by class | `Input` | Same ids, labels, draft/commit, Enter and blur | invalid edge from `aria-invalid` | existing + new | Complete |
| 13 | `create-sidebar` option tiles | native radios in label tiles with samples | unchanged, **reclassified C** | — | native radios in a named `fieldset` | existing | Exception (C) |
| 14 | `create-sidebar` "Show/Hide all pairs" | raw `aria-expanded` button | `Collapsible` + `CollapsibleTrigger asChild` `Button variant="Ghost"` | Same; `aria-controls` now wired while open | `aria-expanded` | new | Complete |
| 15 | `create-sidebar` "Preview appearance" | exclusive `aria-pressed` buttons | `SegmentedControl` | Same mode switch; radiogroup | one tab stop | updated + new | Complete |
| 16 | `create-workspace` "Preview scene" | exclusive `aria-pressed` buttons | `SegmentedControl` | Same scene switch; radiogroup | one tab stop | updated + new | Complete |
| 17–18 | `docs-sidebar` filter and clear | raw input with an absolutely positioned icon and clear button (physical `left`/`right`) | `InputGroup` + `InputGroupAddon` + `InputGroupInput` + `InputGroupButton` | Same name, Escape, refocus after clear, status message. **Changed:** the icon and clear button follow the reading direction; the clear button has a focus ring (it had none) | named field, focus ring | new `docs-sidebar.test.tsx` (4) | Complete |
| 19 | `hero-command` pause | raw `aria-pressed` button | `Toggle` (same `aria-label`, `data-hero-command-pause`, `motion-reduce:hidden`) | Same persisted pause; `CopyButton` and its event untouched | `aria-pressed` | existing (6) | Complete |
| 20–21 | `iot/device-showcase` "Device reports no battery/signal" | native checkboxes | `Checkbox` inside a library `Label` | Same state and range disabling; ranges untouched (Wave 2e) | role checkbox named by the label | new | Complete |
| 22 | `iot/lab/hero-command-strip` "Make the device stop answering" | native checkbox | `Checkbox` inside a library `Label` | Same; the description stays in the name | role checkbox | existing + new | Complete |
| 23–24 | `iot/showcase/pending-command` Retry, Cancel/Dismiss | raw buttons, local `SMALL_BUTTON` recipe | `Button` Primary / Outline, `size="lg"` at 44px (36px from `md`) | Same names and handlers | named as before | existing + new | Complete |
| 25–26 | `registry/demos` navigation-bar Search, app-bar Notifications | raw icon buttons | `Button variant="Ghost" size="icon"` (36px, as before), matching the published snippets; stories regenerated | Same | named by `aria-label` | new (axe) | Complete |

**Two migrations stay in the ledger as D.** `Card` is static unless it renders as a link or a button, and `<Card asChild><button>` is its documented way to be actionable or selectable: hover lift, pressed, focus ring, and the 2px primary edge on `aria-pressed="true"`. The guard reads JSX syntax, so it still sees the `<button>` that `Card` renders through. These two sites (colour swatches, camera rows) are library use, recorded as D so a reviewer can see why they remain; they are not counted as debt.

**`Button` has no default `type`.** The library `Button` renders a `<button>` without `type`, so it submits a surrounding form. None of these sites is in a form, but each original had `type="button"` (except "Copy ramp", which had none), so every migrated `Button` passes `type="button"` explicitly. `Toggle`, `ToggleGroupItem`, `SegmentedControlItem`, `CollapsibleTrigger` and `InputGroupButton` set it themselves.

**Visible changes, on purpose:** the changelog search, the hex fields and the docs filter take the library field edge and focus ring; the camera rows and swatches are Cards (edge, depth, hover lift); the series legend is outline toggles with an accent fill when shown; "Show all pairs" and the Retry/Cancel buttons take library button styling. Sizes were kept where layout depended on them: the hero pause stays 28px in a 28px toolbar, the registry icon buttons stay 36px, the pending-command buttons keep 44/36px.

**Found in the browser pass.** At 1280px with 200% text the docs layout leaves the changelog article 128px wide (pre-existing; recorded, not changed here). The filter pills kept label and count on one line and overflowed; they now wrap inside the pill. Bundle: first-load JS is flat on every touched route (−2.3 KB gzip on `/docs/colors`, within ±120 B elsewhere); see RESULTS.md.

## Wave 2d: copyable IoT examples

28 B sites in 8 files, every one inside or used by a published snippet. All 28 now render library components; no exception was needed. No IoT package API, simulation, device model or analytics changed (none of these examples tracks analytics).

| # | Example | Before | After | Behaviour kept | Accessibility |
|---:|---|---|---|---|---|
| 1 | `pairing-flow` "Simulate a failure" | raw `<select>` wrapped in a label | `NativeSelect` + `Label`; the outcome line is now its `aria-describedby` | locked while setup runs, unlocked after cancel | named combobox, described |
| 2–4, 6–7, 14 | `pairing-flow` Start setup, Finish this step, Continue with …, Yes that is my device, Start again, Pair another device | raw buttons (local `ACTION` pill recipe) | `Button` `lg`, `type="button"` | same handlers through the package's machine; focus still moves to each step heading | named by text |
| 5 | `pairing-flow` found devices | native radios in a `fieldset` | `RadioGroup` + `RadioGroupItem` in `Label` rows, named by the "N sample devices found" line | arrows move and choose, as native radios do; the chosen row keeps its tint and ring | one tab stop; `dir` from the preview's provider |
| 8, 10 | `pairing-flow` Setup code, Device name | raw inputs | `Input` + `Label` | same ids, hint (`aria-describedby`), shape check | library field states |
| 9, 11, 13 | `pairing-flow` Verify code, Apply settings, Place it here | raw `type="submit"` | `Button type="submit"` | the forms' Enter/submit path; one submit starts one wait (the form leaves the page) | submit kept only where it submits |
| 12 | `pairing-flow` Room or zone | raw `<select>` | `NativeSelect` | same options | named combobox |
| 15–16 | `pairing-flow` Back, Cancel setup | raw buttons (harness `BUTTON`) | `Button variant="Outline"`, `type="button"` | same `transitionPairing` guards for disabled | named by text |
| 17–18 | `alert-center` Show acknowledged, S-101 | native checkbox, raw button | `Checkbox` + `Label`, `Button variant="Outline"` | same state; same `setReachable` | checkbox named by its label |
| 19–20 | `alert-inbox` Show acknowledged, Acknowledge | native checkbox, raw button | `Checkbox` + `Label`, `Button variant="Outline"` | same; Acknowledge keeps its visually hidden "Acknowledge alert: …" name | as before |
| 21–22 | `automation-builder` blank rule, reset | raw buttons (`BUTTON`) | `Button variant="Outline"` | same draft resets | named by text |
| 23 | `device-dashboard` Details | raw `aria-pressed` button | `Toggle variant="pill"` | pressing the shown device keeps it (as before) | `aria-pressed`, hidden "Show details for …" |
| 24 | `device-dashboard` Simulate a state | raw buttons | `Button variant="Outline"` | same overrides; the one polite live region unchanged | named by status word |
| 25–26 | `state-honesty` pump buttons | raw buttons (`BUTTON`) | `Button variant="Outline"` `md` | same disabled rules (`pumpGone`, `pumpBusy`) | named by text |
| 27 | `command-card` NextAction | raw buttons, primary/outline by index | `Button` Primary / Outline | same caller data attribute (`data-lock-action`, …), device-named `aria-label`, `interactive` disabling | as before |
| 28 | `operations-environment` equipment rows | raw buttons styled as rows | `Button variant="Ghost"` laid out as a row | same `select`, `aria-current` on the shown machine, same tint | `aria-current` |

**Snippets.** The examples' copyable regions are cut from the same files by `gen-iot-examples` (one file renders the preview and is the snippet), so the published code changed with the source and was regenerated, not edited. Before this wave, four snippets (`pairing-flow`, `alert-center`, `automation-builder`, `state-honesty`) referenced `BUTTON`, a class string from the site's private `harness.tsx` that a reader copying the code does not have. The recipe is deleted. `gen-iot-examples --check` (CI) now also fails on a raw `<button>`, `<input>`, `<select>` or `<textarea>` in a copyable region and on any `@kinetixui/*` import that is not a public package export (`@kinetixui/ui`, `@kinetixui/iot`, `/react`, `/functions`); both fail as intended when reintroduced. Every library component the snippets use is exported from the built `@kinetixui/ui` entry.

**Button safety.** Every migrated `Button` that is not a form's submit passes `type="button"`; the three pairing form actions keep `type="submit"`. `Toggle` sets its type itself. The library default is unchanged (see Wave 2c). `wave2d.test.tsx` asserts every pairing-flow button carries a `type` and checks the type of each migrated action in the other examples; the browser check asserts the same for the pairing flow and automation builder as rendered.

**Layout, measured against main.** At 390px with 200% text the first browser pass found four regressions, all fixed and re-measured against a main build: library buttons are `nowrap`, so the text buttons now wrap; the pairing device rows may shrink (`min-w-0`, the original gap); the state-honesty buttons take `md` and their old padding; and the Details toggle is start-aligned, because the library toggle's `justify-center` laid its visually hidden name out beside the word and widened `/iot` by 47px. What overflows at that size on main still does (the IoT package's AlertList buttons, the "Show acknowledged" labels, the device cards that widen `/iot` by 168px); the browser check fails on anything main does not have.

**Visible changes, on purpose:** the pairing actions are library Primary buttons (rounded, not pill); quiet actions are Outline buttons; fields and selects take the library edge and focus ring; the radios are the library dot.

## Wave 2e: IoT showcase sliders

The last 4 B sites, all `<input type="range">` in `components/iot/device-showcase.tsx` (the /iot "Imperfect data" panel; not a copyable snippet, so no generated output changed). Two migrated, two reclassified C.

| Control | Before | After | Behaviour kept | Accessibility |
|---|---|---|---|---|
| Last sync (6 labelled stops, 0–5, step 1) | native range | `Slider`, `value={[i]}` / `onValueChange` | same stops, label ("Last sync — 5m"), preview | `role="slider"` thumb named by the visible label (`aria-labelledby`), `aria-valuemin/max/now`; arrows, Home/End, PageUp/Down; `dir` from the document, so ArrowLeft increases under RTL (the library contract) |
| Temperature (−10–45 °C, step 0.1) | native range | `Slider` | same bounds, step without float drift, label with one decimal | as above |
| Battery (0–100 %) | native range | **unchanged, C** | disabled while "no battery" is ticked | native disabled semantics kept |
| Signal (0–100) | native range | **unchanged, C** | disabled while "no signal" is ticked | as above |

**Why two stayed native.** Migrating battery and signal would have removed the disabled state a screen reader announces and the dimming a reader sees: the library `Slider` cannot express disabled yet (see Library gaps). That is a library fix, not a site workaround, and it is out of scope here.

**Kept from the native ranges:** values, bounds, steps and defaults; the label that names the control and carries the value; a 36px pointer target (`h-9` on the root, where Radix takes presses; the thumb is 16px); no business logic or device behaviour changes. **Changed, on purpose:** the library track and thumb replace the browser's range; clicking the label no longer focuses the control (it names it).

## Guard

`pnpm check:web-dogfooding` runs its unit tests, then scans the site; CI runs it before lint. The ledger (`website-dogfooding-exceptions.json`) must match the source **exactly**:
- a new pattern, a new file or growth fails;
- **an approval with fewer remaining sites fails**, and the message says to shrink or delete it, so resolved debt cannot stay as a permission;
- an entry needs a non-empty reason, class B, C or D, and a positive integer `maxCount`;
- a read-only `<table>` is E automatically; library JSX and structural HTML are always allowed.

The tests prove it fails on a new raw `<button>`, a raw `<select>`, direct Radix `Tabs` and direct `cmdk`, on a stale approval, and on an approval without a positive integer `maxCount`. They also prove it passes structural HTML, library components, tables, quoted snippets, test files, MDX and documented D exceptions. Live negative controls on the real tree also failed as expected (see RESULTS.md); for Wave 2a, putting a direct Radix `Dialog` back into `mobile-nav`, direct `cmdk` back into `command-menu`, or a new file with a raw `role="dialog"` and a raw button each fails the guard (exit 1).

**Limits:** it is a source ratchet, not proof of equivalence. It does not inspect CSS overrides, dynamic tags, local wrappers that re-export vendor primitives, or styled links, and a swap at the same pattern count can evade it. Reviewers still assess those edits.

## Evidence

See `evidence/website-dogfooding/RESULTS.md`.
