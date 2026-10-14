# KinetixUI website dogfooding audit

Refreshed 14 October 2026 against main `acfe95af62befb4d11b3527a529bfd635c825fb8`, after #375, #377, #378, #380, #358 and #357 landed. It was first audited on 13 October against `ae9cc44`. Scope: `apps/web` routes, components, registry demos, and block/usage/IoT examples. This is a consumer audit. It is not a library redesign, and it does not declare the whole site accessible.

Every interactive or styled product control should use KinetixUI, unless a documented exception explains why. Structural HTML, real content, illustrations, layout, route logic and application state belong to the website. Using a library component does not by itself prove visual consistency, so local class overrides remain reviewable.

## Counting contract

`node scripts/check-web-dogfooding.mjs` parses every non-test `.ts`/`.tsx` file under `apps/web/src` with the TypeScript AST and counts **JSX syntax sites**. A loop counts once, so this is neither a DOM instance count nor a count of distinct widgets. It resolves aliased imports from `@kinetixui/*` (A) and direct `@radix-ui/*`/`cmdk` imports, and it flags raw `button`, `select`, `input`, `textarea`, `details`, `summary` and `table` elements, interactive ARIA roles and lower-case elements with pointer or keyboard handlers.

Text, comments, quoted snippet strings and test files are not scanned. Neither is MDX: all **132 MDX files** were checked separately, and every native-tag match sits inside a fenced or inline code example, not in a live control. Sections, headings, lists, nav, divs and links are structural and not counted.

`--write-inventory` regenerates `website-dogfooding-inventory.json` (every site, with file, line and classification) and `website-dogfooding-inventory.md` (grouped by file and pattern) from the same scan.

## Snapshot: current versus the original audit

| Class | Meaning | Original (`ae9cc44`, after Wave 1) | **Now (`acfe95a` + this PR)** | Δ |
|---|---|---:|---:|---:|
| A | KinetixUI component JSX sites | 1,037 | **1,196** | +159 |
| B | KinetixUI equivalent exists; site authors a native/vendor primitive | 135 | **96** | −39 |
| C | Needs a missing library variant first | 6 | **4** | −2 |
| D | Valid site composition or deliberate native behaviour | 24 | **27** | +3 |
| E | Read-only semantic HTML (tables) | 9 | **9** | 0 |
| | Source files scanned | 241 | **252** | +11 |
| | Native/vendor sites (B+C+D+E) | 174 | **136** | −38 |
| | Files with B/C debt | — | **30** | |

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
| Component gallery business filters (#377) | raw `aria-pressed` buttons | B → `Toggle variant="pill"` |
| Preview LTR / RTL direction | raw `aria-pressed` buttons | B → `SegmentedControl` |
| Homepage hero system map | direct Radix `Tabs.*` (not migrated by #380) | B → library `Tabs` |
| IoT `PillSelector` (environments, telemetry) | site `role="radiogroup"` | B → `ToggleGroup type="single" variant="pill"` |
| IoT device-dashboard group filter | raw `role="tab"` with no tabpanels (P1 semantics) | B → `ToggleGroup type="single" variant="pill"`, not Tabs |
| Floor selector, date strip | multi-line tiles, `role="radiogroup"` | C (see below) |

## Remaining debt (B, 96 sites in 30 files)

| Wave | Sites | Files and KinetixUI equivalent | Why it remains |
|---|---:|---|---|
| **2a Overlays** | 20 | `command-menu` (14: Radix Dialog + cmdk) → `Dialog` + `Command`; `mobile-nav` (6: Radix Dialog) → `Sheet` | Global navigation: needs focus trap/return, Escape, ⌘K, route-change close and RTL tests in its own PR |
| **2b Selectors and modes** | 18 | `component-gallery` (9) → `Toggle` pill, `Button`, `Tag onRemove`; `iot/showcase/pill-selector` (2) and `examples/iot/device-dashboard` tablist (2) → `ToggleGroup` pill; `preview-environment` (1) → `SegmentedControl`; `systems/hero-system-map` (4) → `Tabs` | URL state, counts and analytics (gallery), scoped direction contract (preview), tour/pulse behaviour (hero) need their own tests |
| **2c Site actions and fields** | 26 | `charts-content`, `docs/colors`, `building-ops-demo`, `camera-panel`, `changelog-view`, `create/*` (4 files), `docs-sidebar`, `hero-command`, `iot/device-showcase` checkboxes, `iot/lab/hero-command-strip`, `iot/showcase/pending-command`, `registry/demos` → `Button`, `Toggle`, `Input`, `Checkbox`, `RadioGroup` | Ordinary migrations, deferred to keep Wave 1 small and reviewable |
| **2d Copyable IoT examples** | 28 | `examples/iot/` `pairing-flow` (16), `alert-center`, `alert-inbox`, `automation-builder`, `command-card`, `device-dashboard` actions, `operations-environment`, `state-honesty` → `Button`, `Input`, `Checkbox`, `RadioGroup`, `NativeSelect` | Each change must regenerate the published snippets (`gen-iot-examples`) in the same PR |
| **2e Sliders** | 4 | `iot/device-showcase` ranges → `Slider` | Needs scalar-to-array event adaptation, labelled values and touch/keyboard proof |

B findings are mostly consistency debt (P2), not proven accessibility violations. The exception is the device-dashboard's incomplete tab semantics (P1), which should lead Wave 2b.

## Library gaps (C, 4 sites)

Both remaining C surfaces need an **exclusive selectable tile/card item**: a radio-like single selection whose item is a multi-line tile (rounded-lg card, a primary line plus secondary rows, status badges) with roving focus and RTL support.
- `building-ops/building-ops-demo.tsx` floor selector (2 sites): floor code, alert count, occupancy, cameras.
- `iot/showcase/date-strip.tsx` (2 sites): weekday, date, today and event cues; locale/UTC formatting.

Rechecked after #380 and Phase 2. `ToggleGroup`'s `pill` variant is a single-line rounded-full pill, and `RadioGroupItem` is a circular indicator. Neither is a tile, and restyling a pill into a tile in site code would recreate library visuals locally. Proposed library work (Wave 3): a `tile` variant on `ToggleGroupItem` (or a `SelectableCard` radio item), tested for keyboard, RTL, disabled, forced colors and 200% text, then migrate both surfaces. A small, non-blocking API asymmetry: `Toggle` has `leadingIcon` but `ToggleGroupItem` does not, so a pill group passes its icon as a child.

## Deliberate exceptions (D 27, E 9)

| Family | Sites | Surfaces | Decision |
|---|---:|---|---|
| Native disclosure | 14 | `capabilities` page, `changelog-view`, `create-sidebar` advanced, `iot/example-showcase`, `iot/lab/category-explorer`, `iot/showcase/primitives`, `platform-verification` | Keep `<details>/<summary>`: opens without JavaScript, keeps content mounted for search and Markdown copy. Replace only with progressive-enhancement proof |
| Spatial / SVG interaction | 6 | `building-ops/floor-plan`, `infographic/world-map`, `iot/showcase/space-canvas`, `systems/hero-system-map` node | Geometry, hit areas and focus model stay local; never a `<button>` inside SVG or nested buttons |
| Domain compositions | 4 | `iot/showcase/primitives` room/device tiles | Keep grouping and pending/confirmed states; compose `Button`/`Badge` internally in Wave 3 |
| Animation pause | 2 | `platform-ticker`, `iot/lab/iot-hero-art` | WCAG 2.2.2 pause belongs to the animation; compose `Button` later, never remove the control |
| Native colour channel | 1 | `create/create-color-picker` range | OS touch/keyboard behaviour and continuous draft updates; the gradient track is colour data |
| Read-only tables (E) | 9 | `infographic`, `iot` page, `building-ops-demo`, `component-api`, `foundations-tables`, `token-evidence`, `token-table` | Semantic `<table>` with headers/captions; no sort, select or page contract. The guard classes these E automatically |

## Wave 1 (implemented in this PR)

Eight native sites across five files moved to library components. No component API, dependency or device logic changed.
- **`copy-button.tsx`**: Ghost icon `Button`. Same clipboard promise, success-only callback, analytics without the payload, fixed `aria-label` and polite live region. **Visible change:** it is drawn at the library's 44px icon size instead of 28px. Callers that size it (component-meta, block-install) keep their size. It keeps `shrink` so preview toolbars do not overflow at 200% text.
- **`code-pre.tsx`**: Ghost icon `Button`, positioned with logical `end-2.5` (was physical `right-2.5`), opaque theme background. Same extraction, analytics and live region.
- **`docs-page-actions.tsx`**: Outline `Button` `md`, which wraps at 200% text. **Named by its visible text ("Copy as Markdown", then "Copied"), as #357 made it**; the live region still announces the copy.
- **`iot/device-showcase.tsx`**: `NativeSelect` for Status and Reading quality. Same IDs, labels, option values, controlled handlers and missing-telemetry behaviour.
- **`examples/iot/harness.tsx`**: three Outline `Button`s for pause/resume, step and reset. Same `aria-pressed`, callbacks and reduced-motion notice; no copyable snippet region changed.

This refresh also fixes the maturity suffix inside platform tabs (`component-preview`, `usage-example-tabs`), changing physical `ml-1.5` to logical `ms-1.5` so the gap sits on the correct side under RTL.

## Guard

`pnpm check:web-dogfooding` runs its unit tests, then scans the site; CI runs it before lint. The ledger (`website-dogfooding-exceptions.json`) must match the source **exactly**:
- a new pattern, a new file or growth fails;
- **an approval with fewer remaining sites fails**, and the message says to shrink or delete it, so resolved debt cannot stay as a permission;
- an entry needs a non-empty reason and class B, C or D;
- a read-only `<table>` is E automatically; library JSX and structural HTML are always allowed.

The tests prove it fails on a new raw `<button>`, a raw `<select>`, direct Radix `Tabs` and direct `cmdk`, and on a stale approval. They also prove it passes structural HTML, library components, tables, quoted snippets, test files, MDX and documented D exceptions. Live negative controls on the real tree also failed as expected (see RESULTS.md).

**Limits:** it is a source ratchet, not proof of equivalence. It does not inspect CSS overrides, dynamic tags, local wrappers that re-export vendor primitives, or styled links, and a swap at the same pattern count can evade it. Reviewers still assess those edits.

## Evidence

See `evidence/website-dogfooding/RESULTS.md`.
