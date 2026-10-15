# KinetixUI website dogfooding audit

Refreshed 14 October 2026 against main `acfe95af62befb4d11b3527a529bfd635c825fb8`, after #375, #377, #378, #380, #358 and #357 landed, and merged as #379 (`d155db1`). It was first audited on 13 October against `ae9cc44`. **Wave 2a** (the command menu and the mobile menu, below) is measured against `d155db1`; **Wave 2b** (selectors and modes) against `bfddb67`, after #381. Scope: `apps/web` routes, components, registry demos, and block/usage/IoT examples. This is a consumer audit. It is not a library redesign, and it does not declare the whole site accessible.

Every interactive or styled product control should use KinetixUI, unless a documented exception explains why. Structural HTML, real content, illustrations, layout, route logic and application state belong to the website. Using a library component does not by itself prove visual consistency, so local class overrides remain reviewable.

## Counting contract

`node scripts/check-web-dogfooding.mjs` parses every non-test `.ts`/`.tsx` file under `apps/web/src` with the TypeScript AST and counts **JSX syntax sites**. A loop counts once, so this is neither a DOM instance count nor a count of distinct widgets. It resolves aliased imports from `@kinetixui/*` (A) and direct `@radix-ui/*`/`cmdk` imports, and it flags raw `button`, `select`, `input`, `textarea`, `details`, `summary` and `table` elements, interactive ARIA roles and lower-case elements with pointer or keyboard handlers.

Text, comments, quoted snippet strings and test files are not scanned. Neither is MDX: all **132 MDX files** were checked separately, and every native-tag match sits inside a fenced or inline code example, not in a live control. Sections, headings, lists, nav, divs and links are structural and not counted.

`--write-inventory` regenerates `website-dogfooding-inventory.json` (every site, with file, line and classification) and `website-dogfooding-inventory.md` (grouped by file and pattern) from the same scan.

## Snapshot: current versus the original audit

| Class | Meaning | Original (`ae9cc44`, after Wave 1) | #379 (`d155db1`) | After Wave 2a (#381) | **After Wave 2b** | Δ 2b |
|---|---|---:|---:|---:|---:|---:|
| A | KinetixUI component JSX sites | 1,037 | 1,196 | 1,218 | **1,236** | +18 |
| B | KinetixUI equivalent exists; site authors a native/vendor primitive | 135 | 96 | 76 | **58** | −18 |
| C | Needs a missing library variant first | 6 | 4 | 4 | **4** | 0 |
| D | Valid site composition or deliberate native behaviour | 24 | 27 | 27 | **31** | +4 |
| E | Read-only semantic HTML (tables) | 9 | 9 | 9 | **9** | 0 |
| | Source files scanned | 241 | 252 | 252 | **252** | 0 |
| | Native/vendor sites (B+C+D+E) | 174 | 136 | 116 | **102** | −14 |
| | Files with B/C debt | — | 30 | 28 | **24** | −4 |

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

## Remaining debt (B, 58 sites in 24 files)

| Wave | Sites | Files and KinetixUI equivalent | Why it remains |
|---|---:|---|---|
| ~~2a Overlays~~ | ~~20~~ → 0 | Done in Wave 2a (below): `command-menu` (14) → `CommandDialog` + `Command*`; `mobile-nav` (6) → `Sheet side="start"` | — |
| ~~2b Selectors and modes~~ | ~~18~~ → 0 | Done in Wave 2b (below): 14 migrated, 4 (`systems/hero-system-map` tabs) reclassified D | — |
| **2c Site actions and fields** | 26 | `charts-content`, `docs/colors`, `building-ops-demo`, `camera-panel`, `changelog-view`, `create/*` (4 files), `docs-sidebar`, `hero-command`, `iot/device-showcase` checkboxes, `iot/lab/hero-command-strip`, `iot/showcase/pending-command`, `registry/demos` → `Button`, `Toggle`, `Input`, `Checkbox`, `RadioGroup` | Ordinary migrations, deferred to keep Wave 1 small and reviewable |
| **2d Copyable IoT examples** | 28 | `examples/iot/` `pairing-flow` (16), `alert-center`, `alert-inbox`, `automation-builder`, `command-card`, `device-dashboard` actions, `operations-environment`, `state-honesty` → `Button`, `Input`, `Checkbox`, `RadioGroup`, `NativeSelect` | Each change must regenerate the published snippets (`gen-iot-examples`) in the same PR |
| **2e Sliders** | 4 | `iot/device-showcase` ranges → `Slider` | Needs scalar-to-array event adaptation, labelled values and touch/keyboard proof |

B findings are mostly consistency debt (P2), not proven accessibility violations. The exception is the device-dashboard's incomplete tab semantics (P1), which should lead Wave 2b.

## Library gaps (C, 4 sites)

Both remaining C surfaces need an **exclusive selectable tile/card item**: a radio-like single selection whose item is a multi-line tile (rounded-lg card, a primary line plus secondary rows, status badges) with roving focus and RTL support.
- `building-ops/building-ops-demo.tsx` floor selector (2 sites): floor code, alert count, occupancy, cameras.
- `iot/showcase/date-strip.tsx` (2 sites): weekday, date, today and event cues; locale/UTC formatting.

Rechecked after #380 and Phase 2. `ToggleGroup`'s `pill` variant is a single-line rounded-full pill, and `RadioGroupItem` is a circular indicator. Neither is a tile, and restyling a pill into a tile in site code would recreate library visuals locally. Proposed library work (Wave 3): a `tile` variant on `ToggleGroupItem` (or a `SelectableCard` radio item), tested for keyboard, RTL, disabled, forced colors and 200% text, then migrate both surfaces. A small, non-blocking API asymmetry: `Toggle` has `leadingIcon` but `ToggleGroupItem` does not, so a pill group passes its icon as a child.

## Deliberate exceptions (D 31, E 9)

| Family | Sites | Surfaces | Decision |
|---|---:|---|---|
| Native disclosure | 14 | `capabilities` page, `changelog-view`, `create-sidebar` advanced, `iot/example-showcase`, `iot/lab/category-explorer`, `iot/showcase/primitives`, `platform-verification` | Keep `<details>/<summary>`: opens without JavaScript, keeps content mounted for search and Markdown copy. Replace only with progressive-enhancement proof |
| Spatial / SVG interaction | 10 | `building-ops/floor-plan`, `infographic/world-map`, `iot/showcase/space-canvas`, `systems/hero-system-map` node and its platform tabs (4, Wave 2b) | Geometry, hit areas and focus model stay local; never a `<button>` inside SVG or nested buttons. The hero's tabs are real tabs (tablist, panels, automatic activation, `dir`) whose triggers are the diagram's nodes |
| Domain compositions | 4 | `iot/showcase/primitives` room/device tiles | Keep grouping and pending/confirmed states; compose `Button`/`Badge` internally in Wave 3 |
| Animation pause | 2 | `platform-ticker`, `iot/lab/iot-hero-art` | WCAG 2.2.2 pause belongs to the animation; compose `Button` later, never remove the control |
| Native colour channel | 1 | `create/create-color-picker` range | OS touch/keyboard behaviour and continuous draft updates; the gradient track is colour data |
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
