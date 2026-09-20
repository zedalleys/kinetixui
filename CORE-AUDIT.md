# KinetixUI Core — architecture audit and path to 1.0

**Date:** 2026-09-21 · **Version audited:** 0.21.0 · **Method:** read the repository; measured, did not assume.

This is a living record, in the spirit of `ACCESSIBILITY-AUDIT.md`. It says what KinetixUI *is*, classifies each
finding (**KEEP / NORMALIZE / REFACTOR / ADD / DEPRECATE / DEFER**), states what this change did, and lists what
it deliberately did not. Where a number appears, it was measured; the measuring is described so it can be repeated.

## 1. What exists

### Platforms and packages

| Platform | Package | Technology | Distribution today |
|---|---|---|---|
| Web · React | `packages/ui` → `@kinetixui/ui` | React, Radix, Tailwind, CVA | npm; also source via the CLI registry |
| iOS · SwiftUI | `packages/ui-swiftui` | SwiftUI | repository checkout (publish workflow exists, inert) |
| Android · Compose | `packages/ui-compose` | Jetpack Compose | repository checkout (publish workflow exists, inert) |
| Flutter | `packages/ui-flutter` | Flutter widgets | repository checkout (publish workflow exists, inert) |
| Tokens | `packages/tokens` → `@kinetixui/tokens` | Style Dictionary v4 → CSS / TS / Swift / Kotlin / Dart | npm |
| CLI | `packages/cli` → `@kinetixui/cli` | Node | npm |
| Docs site | `apps/web` (kinetixui.com), `apps/docs` (Storybook) | Next.js 15, MDX | Vercel |

Versions are locked together (Changesets `fixed` group): all three npm packages are 0.21.0.

### Platforms that do **not** exist

The brief lists Angular, Wear OS and watchOS as possibilities. A word-boundary search of the repository finds no
implementation, package, directive, tokens or docs for any of them. There is no plain-HTML/CSS package either.
Two findings follow from that, both fixed in this change (section 5):

- Storybook's Button "cross-platform usage" story showed an **Angular** `<button kx-button …>` snippet, and the
  site's Code tab showed an **HTML** example built on `kx-btn` classes, on ~100 component pages. Neither API
  exists. Both were invented documentation.
- The same story's other snippets were hand-written rather than taken from the libraries: the SwiftUI one used
  `Button('Save', …)` with single quotes (not valid Swift), and the Flutter one used `AppColors.primary` and
  `AppTheme.radius`, which do not exist in the generated classes (they expose `colorX`-style names). All replaced
  with real `KinetixButton` usage.

### Components (from `components.manifest.json`)

98 components. React 98, SwiftUI 91, Compose 90, Flutter 91. Status is one value per component — 86 stable,
12 beta — **not per platform**. The deliberate gaps (all with a recorded reason): `avatar-group`, `combobox`,
`form`, `kanban-board`, `native-select`, `navigation-menu`, `tour` are React-only; `chart` is not on Compose.

## 2. Foundations, measured

### Spatial grid

The scale in `tokens/primitives/dimension.json` was 0, 4, 8, 12, 16, 20, 24, 28, 32: a 4-unit step that stops at 32.
Under an "8-unit grid with a 4-unit half-step" **every multiple of 4 is on the grid**, so 12, 20 and 28 were never
off-grid — they are half-steps. What was missing was the layout scale above 32.

How closely do the components follow it? Counted by scanning source (Tailwind spacing utilities; arbitrary `[Npx]`
values; native numeric literals):

| | spacing utilities | on the 4-unit grid | `.5` optical steps (2/6/10/14px) | arbitrary px | of which off-grid |
|---|---|---|---|---|---|
| `packages/ui` components | 415 | 333 (80%) | 82 | 12 | 3 (all `18px`) |
| `apps/web` site | 811 | 686 (85%) | 125 | 86 | 13 (one-off demo-frame sizes) |

Native literals not a multiple of 4: SwiftUI 99 of 426, Compose 58 of 257, Flutter 19 of 165. Most are `1`/`2`
(hairlines, nudges) and `6`/`10`/`14` (icon–label gaps) — optical, not arbitrary.

**Reading:** the components are already close to the grid, and the exceptions are mostly deliberate. A rewrite to a
rigid scale would change the visual identity for little gain, which the brief forbids. The right move is to
document the scale, extend it, and guard against *new* drift. → **NORMALIZE** (done).

### Token layers versus the brief

| Layer | Exists? | Notes |
|---|---|---|
| Primitive | Yes | color ramps, spacing, radius, type, motion, opacity, z-index, interaction (`tokens/primitives`) |
| Semantic | Yes | color roles (light + dark), type styles, shadows (`tokens/semantic`); role tokens `action` / `link` / `focus` / `brand` |
| Component | Minimal, by design | no `button/height/md` layer; heights live in components. **KEEP** — the brief warns against hundreds of these |
| Platform output | Yes | CSS, TS, Swift, Kotlin, Dart, Android XML; native copies vendored and diffed in CI |

Semantic color names differ from the brief's (`background/default` vs `--background`); the existing names are the
public API. **DEFER** renaming — no evidence of a problem, high breakage.

### Radius

Existing: none 0, sm 4, md 8, lg 12, xl 16, full. The brief proposes xs 4 / sm 8 / md 12 / lg 16 / xl 24 — every name
would shift one step. That is a breaking visual change across the library and consumers. **DEFER** with a
documented recommendation for 1.0; **ADD** `xxl` = 24 (the missing grid step) now.

### Typography

Roles are Material-3 names (display, headline, title, label, body) with `-lg/-md/-sm`, plus `title-dialog`. The
brief's conceptual roles (Display / Heading / Body / Label / Code) map onto these (`headline`≈Heading), but there
is no `code` role. **KEEP** the names; **DEFER** a `code` role until a component needs it. Typography is
intentionally *not* on the 8-unit grid.

### Motion, elevation, breakpoints

- **Motion.** Durations fast 200 / base 300 / slow 500 / slower 1000; easings linear and standard. The brief adds
  instant and enter/exit/emphasized. **ADD** (done) — but no component consumes them yet, and that is stated in the docs.
- **Elevation.** Shadows sm/md/lg/xl exist as tokens; there are no *semantic* elevation tokens. Measured usage:
  `shadow-sm` on Card, SegmentedControl, Toggle, InputOTP, KanbanBoard; `shadow-md` on every floating menu, Select,
  Popover, HoverCard; `shadow-lg` on Dialog, AlertDialog, Sheet, toast, Fab, Tour; `shadow-xl` only on the Chart
  tooltip. That is four real tiers. Semantic names are **documented** (done); tokens for them are **DEFER**.
- **Breakpoints.** No breakpoint tokens; Tailwind defaults are used. **DEFER** — the native ports don't share the concept.

### How the foundations reach each platform (Phase 3 finding)

Spacing and radius reached the web (CSS variables) and Android (`dimens.xml`) — but **not SwiftUI or Flutter**. Those
components hardcode numbers with comments like `// spacing/4`. So the "shared foundation" was only partly shared.
→ **REFACTOR** the generator (done): `KinetixSpacing` and `KinetixRadius` are now emitted for Swift, Kotlin and
Dart from the same source. Migrating existing native components onto them is **DEFER** (incremental, per component,
so nothing moves visually).

## 3. System capabilities

| Capability | State | Evidence |
|---|---|---|
| Dark mode | Existing, all platforms | real light + dark token sets on web and each native port; browser axe pass runs every story in both |
| RTL | **Partial** | web: 67 of 96 component files use logical properties, 29 tracked in `check:rtl`'s allow-list, plus `KinetixDirectionProvider`. Native: **not audited** (`RTL.md` says so) |
| Accessibility | Strong on web, unproven on native | 271 unit tests incl. keyboard suite; axe in jsdom and a real browser (baseline empty); forced-colors, reduced-motion and Kanban keyboard checks; `check:contrast`. Native: compile-checked only |
| Reduced motion | Web enforced; native unaudited | browser pass fails any story looping faster than 3s under `prefers-reduced-motion` |
| Responsive/adaptive | Web only | native ports use platform layout |
| Theming | Existing | `/docs/theming`, `/theme-builder`, CLI `theme create/build` (web CSS only; native compilation of custom themes is not implemented) |

### Verification per platform (the honest maturity signal)

| Platform | What CI runs | Behavioural / a11y tests |
|---|---|---|
| React | build, 271 tests, jsdom axe, real-browser axe (light+dark), contrast/RTL/typography/grid/manifest/releases/icons checks | yes |
| Flutter | `flutter analyze`, `flutter test` smoke (~55 widgets, light + dark) | smoke only |
| Compose | `assembleDebug`, `lintDebug` | none |
| SwiftUI | `swift build` | none |

**Consequence:** the manifest's `stable` describes the React implementation. Calling a native port "Stable" on this
evidence would overstate it. Per-platform maturity is a 1.0 task and needs the owner's decision on the criteria;
until then the site says what each platform verifies rather than assigning a label. → **ADD** (later).

## 4. Requirement table

| # | Requirement (brief §) | Existing / Partial / Missing | Class | Action taken here |
|---|---|---|---|---|
| 6–7 | 8-unit grid, 4-unit half-step, spacing scale | Partial (scale stopped at 32; not documented) | NORMALIZE | Scale extended to 128 additively; documented; `check:grid` guard |
| 8 | Primitive → semantic → component → platform layers | Existing (component layer minimal by design) | KEEP | — |
| 9 | Platform token outputs | Partial (no Swift/Dart spacing/radius) | REFACTOR | Generator emits `KinetixSpacing`/`KinetixRadius` |
| 10 | Radius on the grid | Partial (names differ from brief) | ADD / DEFER | `xxl` added; rename deferred with rationale |
| 11 | Color system, semantic roles, dark = remap | Existing | KEEP | — |
| 12 | Typography roles | Existing (M3 names, no `code`) | KEEP / DEFER | — |
| 13 | Motion tokens | Partial | ADD | `instant`, `enter`, `exit`, `emphasized` |
| 14 | Semantic elevation | Missing (tokens); shadows exist | DEFER / documented | measured tiers documented |
| 15 | RTL first-class | Partial (web 67/96; native unaudited) | DEFER | 29 files + native audit remain |
| 16 | Accessibility contract | Existing on web; native unproven | KEEP / DEFER | native a11y tests remain |
| 17–18 | Component contracts, state model | Partial — `specs/components/*.json` (97) describe variants, props and source, but not anatomy, state or accessibility contracts | DEFER | not started; large |
| 19 | Web frameworks | React only | KEEP | no Angular exists; nothing invented |
| 20–22 | Flutter / Android / iOS idiomatic | Existing | KEEP | — |
| 23–25 | Wearables, Wear OS, watchOS | Missing entirely | DEFER | documented as not supported |
| 26 | Icons | Existing (`icons/mapping.json`, drift-checked) | KEEP | — |
| 27–28 | Component inventory, availability | Existing (98; gaps have reasons) | KEEP | shown on `/docs/platforms` |
| 29 | Form architecture (Field) | Existing | KEEP | — |
| 30 | Table vs DataGrid boundary | `DataGrid` already ships in Core | **Owner decision** | see §6 |
| 31 | Theming | Existing | KEEP | — |
| 33–36 | Website as product; IA; platforms page; component pages | Partial | ADD | Foundations + Supported platforms pages; nav |
| 37 | Code examples use real APIs | **Violated** (invented HTML/Angular/Flutter snippets) | REFACTOR | invented HTML tab (100 entries) removed; Storybook story rewritten from real APIs |
| 39 | Website dogfoods itself | Partial | DEFER | site chrome still hand-styled; findings in PR #174 |
| 40 | Figma ↔ code | Figma is referenced in comments and `TOKENS.md` only; no assets or config in the repo | DEFER | — |
| 41 | Per-platform maturity | Missing (one status per component) | DEFER | needs owner criteria |
| 43 | Testing | Strong on web; native minimal | DEFER | native tests are the largest gap |
| 44 | Build/distribution | Native not published | DEFER | workflows exist, inert until credentials |
| 46 | Changelog by platform | Partial (`area` includes `platforms`; no per-platform tags) | DEFER | small, but needs release-data design |
| 47 | Public-repo readiness | README, CONTRIBUTING, SECURITY, LICENSE, GOVERNANCE exist; **no CODE_OF_CONDUCT, issue templates or PR template** | ADD | templates added; CoC needs owner input |
| 32 | Pro boundary | Not built; Core doesn't depend on anything Pro | KEEP | — |

## 5. What this change did

- **Tokens:** spacing 10–32 (40–128), `radius.xxl`, `duration.instant`, `easing.enter/exit/emphasized` — additive; no
  existing name or value changed. Compiled to CSS, TS, Swift, Kotlin, Dart, Android XML.
- **Generator:** `KinetixSpacing` / `KinetixRadius` for the three native platforms.
- **Guardrail:** `pnpm check:grid` (in CI) — tokens stay on the grid; the component library can't gain a new off-grid
  arbitrary pixel value. Three justified `18px` exceptions are named.
- **Truthfulness:** invented HTML/Angular/Flutter/SwiftUI/Compose snippets removed or replaced with real APIs.
- **Site:** `/docs/foundations` (grid, radius, elevation, motion — generated from the token files) and
  `/docs/platforms` (support matrix from the manifest; verification per platform; what is *not* supported); the
  `/docs/tokens` motion section corrected.
- **Repo:** PR template and issue templates.

## 6. Owner decisions needed

1. **`DataGrid` and the Core/Pro boundary.** The brief says not to accidentally build an enterprise DataGrid, and
   `DataGrid` already exists in Core (virtualized, column resize/reorder/pin, sort, edit, range selection, copy, Ctrl+click
   ranges, header selection, drag auto-scroll — shipped through 0.21.0). Whether that stays in Core, and where the line is
   drawn for future Pro, is a product decision. Nothing was removed.
2. **Code of Conduct.** Needs an adoption decision and an enforcement contact. Not added.
3. **Radius rename** (`xs/sm/md/lg/xl` as in the brief) — breaking; recommend for 1.0 with a codemod.
4. **Per-platform maturity criteria** — what makes a native port Beta or Stable (for example: interaction tests +
   accessibility tests + published package).
5. **Wearables.** Whether to build them at all, and if so as a separate design track rather than small phones.

## 7. Recommended path to 1.0, in order

1. Native verification: interaction and accessibility tests on the three native ports (largest gap; unblocks honest maturity).
2. Native RTL audit, then the 29 remaining web files.
3. Move native components onto `KinetixSpacing` / `KinetixRadius` / `KinetixMotion`, component by component.
4. Per-platform maturity in the manifest; surface it on `/docs/platforms` and component pages.
5. Component contracts for the highest-risk components (forms, dialogs, menus, select, navigation) — start from `specs/`.
6. Publish the native ports (credentials + registry accounts are owner actions).
7. Radius/type naming decisions, with codemods, in the 1.0 window.
8. Site dogfooding pass (header/footer and content pages replaced with KinetixUI components).
