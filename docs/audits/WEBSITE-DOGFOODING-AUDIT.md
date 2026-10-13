# KinetixUI website dogfooding audit

Audited 13 October 2026. Baseline: `ae9cc44a1f2529da77f7ac0df2e3e25ae07128aa` (main fetched at audit start). Scope: all `apps/web` routes, components, registry demos and related block/usage/IoT examples. This is a consumer audit, not a library redesign or a declaration of site-wide accessibility compliance.

Every interactive or styled product control should use KinetixUI, unless a documented exception explains why. Structural HTML, real content, illustrations, layout and application state belong to the website. Library usage does not by itself prove visual consistency: local class overrides remain reviewable debt.

## Inventory and counting contract

The AST sweep covers **241 non-test TS/TSX source files**. It resolves aliases on KinetixUI and direct Radix/cmdk imports, counts JSX syntax sites, and ignores text, comments, generated source strings and test fixtures. A loop counts once; this is not a DOM instance count or a count of distinct user-facing widgets. All 121 MDX files were separately searched: native-tag matches were prose or fenced language examples, not live website controls. Global CSS, component thumbnails, MDX component mapping, navigation links and styled compositions were inspected separately below. Ordinary sections/headings/lists/nav/divs are not counted as problems.

Post-Wave-1 snapshot:

| Classification | JSX sites | Meaning |
|---|---:|---|
| A | 1,037 | Imported KinetixUI UI/IoT components already used |
| B | 135 | Existing equivalent, website still authors native/direct-vendor primitive |
| C | 6 | Exclusive pill/date/floor selector sites need a library variant first |
| D | 24 | Website composition or documented native behavior; retain layout/logic and compose primitives where appropriate |
| E | 9 | Read-only semantic reference tables; leave their HTML intact |
| Total inventoried | 1,211 | 1,037 library + 174 reviewed native/vendor sites in 49 files |

Wave 1 removes **8 B native sites**: six buttons and two selects. It adds ten A sites including the two option templates. Before Wave 1: A 1,027; B 143; C 6; D 24; E 9. These counts include in-flight debt; they do not assume the Tabs branch has already landed. `website-dogfooding-inventory.json` contains every counted site, its file and line, plus the source coverage list. The Markdown companion groups every remaining native/vendor pattern with its disposition. Supplemental composition findings below use family-level rows and are not added to syntax-site totals.

## Coordination and reserved scope

The active chat **Refine KinetixUI tabs and filters** owns `feat/tabs-platform-dogfood`. At audit start it had uncommitted changes and no open GitHub PR. Its intended direction is canonical line Tabs for peer panels, SegmentedControl for local modes, and icon-bearing library filters. Preview/Code semantics remain under that owner's review; the later conversation's explicit line-Tabs preference must be reconciled there, not independently restyled here.

Reserve `component-gallery.tsx`, `component-preview.tsx`, `showcase.tsx`, `cross-platform-flagship.tsx`, `usage-example-tabs.tsx`, `preview-environment.tsx`, `iot/example-showcase.tsx`, `iot/lab/lab-tabs.tsx`, `iot/lab/category-explorer.tsx`, `systems/explorer-tabs.tsx`, and library Tabs/SegmentedControl/Toggle APIs/styles. Do not duplicate platform-mark sourcing or the new leading-icon API. The standalone `examples/iot/device-dashboard.tsx` group control is also recorded for coordination, rather than modified here.

Open IoT hierarchy PR #375 and platform verification PR #374 were visible at audit start. Wave 1 does not modify their surfaces. Existing business capability work is out of scope. This PR should follow the Tabs/filter work; when it lands, regenerate the descriptive inventory and reduce the ratchet entries for removed debt. Removals are allowed by the guard, so the Tabs change need not add exemptions.

## Coverage and dispositions

| Family / surface | Class | Finding and decision |
|---|---|---|
| UI demos, block examples, usage examples | A | Actual library components are prevalent; registry demo tree contains only two residual raw action buttons. Preserve copyable examples and regenerate snippets when their regions change. |
| Tabs/tablists, section and platform navigation | A/B, in flight | Direct Radix wrappers in previews, flagship, IoT lab and systems explorer duplicate library Tabs. Reserve the active branch. Spatial hero's direct Radix Tabs remain B despite its diagram being a valid local composition. |
| Device-dashboard group selector | B, coordinated | Raw `role=tab` buttons filter one fleet and have no associated tabpanels. Prefer an exclusive group selector rather than inventing tabpanel semantics. Preserve selected-device state across group changes. |
| Segmented modes / preview direction | A/B, in flight | Library SegmentedControl already exists. Reserve `preview-environment`; changing document direction versus a preview's scoped direction is a behavior contract. |
| Gallery / platform filters | B, in flight | Raw filter buttons plus dismiss/reset actions in `component-gallery`. Use Toggle for independently pressed filters; exclusive selection must not become deselectable by accident. Preserve query strings, counts and analytics. |
| Changelog filters, search and details actions | B/D | `changelog-view`: raw search Input and filter/actions need migration. Native migration disclosure remains D for mounted content/no-JS reading. |
| Buttons / icon buttons / copy | A/B | Wave 1 replaces three copy surfaces and simulation transport. Follow with hero-command, docs-sidebar clear, create actions, camera actions, registry demos and remaining IoT example actions. |
| Native selects / comboboxes | A/B | Two DeviceShowcase selects migrated. Pairing-flow's two selects remain B; do not replace the OS picker with a custom overlay. Building operations already imports NativeSelect; demo comboboxes use library compositions. |
| Checkbox, radio, switch, slider | A/B/C | Library Switch and IoT device controls are used. Alert-center/inbox and DeviceShowcase checkboxes remain B. Pairing radios and ordinary inputs remain B. DeviceShowcase ranges need scalar-to-array event adaptation into Slider in Wave 2. PillSelector and floor radio tiles need the C variant below. |
| PillSelector / DateStrip / floor selector | C | RadioGroupItem's circular-indicator API does not provide the current filled pill/date-tile treatment. Add a tested exclusive selectable-item variant, leading icon/count and multiline content support before migrating. Do not substitute independent Toggle behavior. |
| Badges / status pills | A/B/D | IoT DeviceStatusBadge/CommandStatus are already canonical. `platform-badges`, `component-meta`, changelog package markers and `SimNotice` still draw local styled pills; compose Badge in Wave 2, preserving truthful maturity and simulated-data language. Domain state glyph/color vocabulary stays local where no matching library severity exists. |
| Tooltips / popovers / hover cards | A/B/D | Interactive examples use canonical components. Platform badge native `title` is supplemental metadata with a complete accessible group name; retain it until the badges are migrated, then evaluate Tooltip without duplicating spoken labels. Inert thumbnail illustrations stay local. |
| Dialogs / sheets / command menu | A/B | `mode-toggle` already uses library DropdownMenu. `mobile-nav` imports Radix Dialog directly; `command-menu` imports Radix Dialog and cmdk directly. Wave 2 composes Sheet/Command/Dialog, testing portals, focus trap/return, Escape, keyboard shortcuts, route close and RTL. |
| Menus / dropdowns | A | Library demos and theme menu already dogfood the canonical components; no separate new menu primitive needed. |
| Breadcrumbs | A/B | Library demos use Breadcrumb; `docs-breadcrumb` hand-builds the styled trail. Compose Breadcrumb primitives while retaining JSON-LD, responsive collapsing, URLs and current-page semantics. |
| Pagination / previous-next docs links | A/D | Pagination demos are canonical. `docs-pager` is sequential article navigation, not numerical pagination: retain its composition and wrap behavior; consider Card/asChild for its linked surfaces. |
| Accordions / disclosures | A/D | Demos use library Accordion/Collapsible. Native details in changelog, advanced sidebar, platform verification, IoT MoreExamples and part lists intentionally permit no-JS disclosure or keep children mounted. These are documented exceptions; no blind JS replacement. |
| Forms / fields / color editing | A/B/D | Create export/scenes already use Button/Input/Label/Textarea. Create sidebar radios, advanced numeric field and color text entry still need library fields. Color-channel range keeps native touch/keyboard and draft/commit semantics as D. Form tags, labels, fieldsets and validation relationships are structural. |
| Cards / panels / selectable tiles | A/D/B | Demo Cards are canonical. `iot/showcase/primitives` room rails, tiles and panels are domain compositions: retain grouping, pending/confirmed states and slots, but compose Button/Badge internally in Wave 3. Ordinary articles/layout containers do not all become Card. |
| Tables / grids | A/E | Demos use Table/DataTable/DataGrid. Nine read-only reference/operations table sites remain semantic HTML: no sort/select/page contract to migrate. Retain headers, captions, focusable overflow wrapper and Markdown extraction. Interactive row actions are independently B. |
| Alerts / banners / callouts | A/B/D | IoT AlertCard/AlertList and block AlertStack already canonical. `callout` and create-workspace's styled error banner should compose Alert in Wave 2. Inline `role=alert` validation text is D: preserve its field association and announcement without adding a banner for each field. |
| Empty / error states | A/B/D | Empty demo/block uses library Empty. Gallery no-results is part of the reserved filter composition. `not-found` uses custom styled link-buttons: migrate links via Button/asChild while retaining 404/noindex and destinations. Search result-count/status text remains structural live feedback. |
| IoT controls and simulation | A/B/D | Power/mode/setpoint/level controls use IoT components with confirmed/requested values. Simulation state machines remain local. Wave 1 changes transport button rendering only. Pairing/alert/automation action migration is Wave 2 and must regenerate source snippets. |
| Spatial selectors / floor plan / system map | D/B | Geometry, hot spots, panning and active-device state are website logic. Compose library triggers where HTML permits, never a `<button>` inside SVG or nested buttons. Keep SVG accessibility/focus behavior explicit. Hero-map tab primitives remain B. |
| Charts / series legend | A/B | ChartContainer/Tooltip/Legend demos dogfood the library. Interactive series legend uses a raw pressed button; compose Toggle and update the displayed snippet in the same change. Series colors are data, not arbitrary decoration. |
| Platform ticker / hero animation pause | D | Pause/resume logic and accessibility preference belong to the local animation. Compose Button in Wave 2; do not remove pause controls because the art is decorative. |
| Inert component thumbnails / decorative art | D/E | Gallery mocks are deliberately inert and aria-hidden; using live interactive components risks focus leakage and unnecessary hydration. Preserve thumbnail isolation and visual contract. SVG geometry and structural prose do not require UI components. |

## Prioritized waves

1. **Wave 0 — already in flight:** finish Tabs/SegmentedControl/filter semantics and platform marks. This audit avoids all reserved files and all library styling changes.
2. **Wave 1 — implemented here:** eight low-risk native sites across five files, plus an AST guard and reviewed exception/debt ledger. No new package dependencies, component APIs or device logic.
3. **Wave 2 — standard equivalents:** search fields, remaining copy/actions, ordinary selects/checkboxes, badge/callout/breadcrumb surfaces, mobile Sheet and Command. Split navigation overlays from ordinary fields into separate reviewable PRs. Preserve URL/analytics tests. Regenerate IoT/usage snippets from source when regions change.
4. **Wave 3 — library first:** exclusive pill/date/floor selectable item variant, then room rails/spatial triggers/selectable tiles and their badges. Keep geometry and application state local. Require keyboard/RTL/disabled-state tests, mobile touch gestures and 200% text before replacing the current roving model.

B findings are predominantly P2 consistency debt, not proven accessibility violations. The device-dashboard's incomplete tab semantics is a P1 candidate for the coordinated migration. C variants are prerequisites rather than new components to rush into this PR. D/E findings are not defects merely because HTML is present.

## Exact Wave 1 changes

- `copy-button.tsx`: library Ghost icon Button; clipboard promise, success-only callback, no payload in analytics, fixed accessible name and polite live region retained. Default 44px size; consumer layout sizing retained. It explicitly permits shrinking with no padding in narrow preview toolbars at 200% text. The old raw button also permitted shrinking; the library's default `shrink-0` caused a measured regression before this correction.
- `code-pre.tsx`: library Ghost icon Button, logical `end` positioning, existing clipboard extraction/analytics/live region unchanged. Local positioning/reveal remains composition; hover/focus visibility retained. Uses opaque theme background instead of the local translucent border/backdrop recipe.
- `docs-page-actions.tsx`: library Outline Button, standard `md` size (the small library size is below the website text floor), wraps its long label at doubled text. Markdown conversion and feedback unchanged.
- `iot/device-showcase.tsx`: NativeSelect/NativeSelectOption for Status and Reading quality; removes the website `selectClass` recipe. IDs, Label association, option values, controlled native change handlers and null/missing telemetry behavior preserved. Native range/checkbox migration deferred.
- `examples/iot/harness.tsx`: three Outline Buttons for pause/resume, step and reset; preserves `aria-pressed`, callbacks and reduced-motion notice. Exported `BUTTON` recipe is left solely for remaining B consumers and should be deleted after their migration. No copyable snippet region changed; generated examples check passes.

## Guard and exceptions

`pnpm check:web-dogfooding` runs negative-control tests then scans actual JSX. CI runs it before lint. A new native button/select/input/textarea/disclosure/table, an interactive role/handler, or direct Radix/cmdk JSX is rejected unless its file/pattern/count has a classified, non-empty reviewed reason in `website-dogfooding-exceptions.json`. Library JSX and structural markup are allowed. Existing debt may shrink; a new file cannot inherit another file's exception. New patterns or growing counts require review.

The ledger separates **B migration debt** and **C prerequisites** from **D/E intentional exceptions**. The guard is a source ratchet, not proof of semantic equivalence: it does not inspect every CSS override, dynamically generated tag, aliased local wrapper, MDX code example, styled Next Link, or provenance through arbitrary re-exports. A replacement at the same approved pattern count can evade it; reviewers still assess those edits. Avoid increasing baselines to silence a failure.

Permanent/conditional exception families: native disclosures for no-JS/mounted reading; native color-channel range for platform interaction and gradient data; SVG/spatial interaction compositions with their explicit focus model; motion pause logic; inert thumbnails; read-only reference tables; structural semantic/live validation text. D compositions still need library action/badge primitives where appropriate in their later wave.

## Evidence and merge decision

See `evidence/website-dogfooding/RESULTS.md` for exact final commands, results, browser coverage, bundle comparison and limitations. Build/lint already carry two pre-existing unused-variable warnings in `marketing-claims.test.ts` and an upstream JSX-parser diagnostic; no Wave 1 lint errors.

This audit's snapshot does not claim that A imports have no local style overrides, that every rendered route/state was tested, or that all B/C debt is remediated. Merge only after the final Wave 1 checks and PR CI pass and the Tabs/filter ordering is resolved. Do not merge automatically.
