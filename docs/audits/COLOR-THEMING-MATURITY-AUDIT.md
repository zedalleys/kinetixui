# Color & Theming Maturity Audit

Audited `main` at **5db94f0** (`docs(tokens): give /docs/tokens a truthful evaluation and adoption path (#299)`), 2026-10-05.
Evidence (logs, negative controls, raw scans) is in the project's shared folder under
`color-theming-audit/`; the repository carries the fixes, the gates and this report.

Every claim below says what kind of evidence backs it: **source** (read in the repo), **generated** (read in
`packages/tokens/dist`), **unit** (a test), **gate** (a CI script), or **rendered** (measured in Chromium against
the production build of the site).

---

## 1. Executive verdict

**Grade: B — strong foundation with targeted gaps.**

> Can a real product team safely rebrand KinetixUI by changing a small, understandable set of theme inputs?

**Yes on the web, with two caveats; partly on native.** One theme colour in Create produces both appearances,
holds every generated text pair to AA, and exports a diff-only override block that every React and Angular
component follows, because components read semantic roles and never a ramp. Before this PR there was one
place where that was not true and it was the most important one: **the keyboard focus ring ignored the
theme** (rendered: a green brand still drew the azure ring; on main, a light preview of a green brand on a
dark page drew a 2.54:1 ring; an Advanced background of `#1d4ed8` made it 1:1 and Create said nothing).
That is fixed here, along with light previews leaking dark tokens and a documented retheme recipe that
produced 3.42:1 button text.

The caveats: a hand-pinned `primary` in Advanced is previewed, exported for web and exported for native as
three different things (§11, P1-3), and the native colour sets are a subset of the web contract with one
real contrast gap (§18, P1-4). The primitive palette is the weakest layer (§3), but no component consumes it,
so it costs maintainers, not adopters.

## 2. Existing architecture (verified)

```
tokens/primitives/color.json         9 families, hex                     (source)
        ↓  {color.azure.700}
tokens/semantic/color.light.json     64 roles   ┐  one Style Dictionary   (source)
tokens/semantic/color.dark.json      54 roles   ┘  run per theme
tokens/semantic/shadow(.dark).json   focus rings + elevation
        ↓  pnpm build:tokens (Style Dictionary 5.5.5, style-dictionary/*)
packages/tokens/dist/web/globals(.dark).css, extras(.dark).css     HSL channels, :root / .dark
packages/tokens/dist/ios/KinetixColorsSwiftUI(.dark).swift, Theme.swift
packages/tokens/dist/android/Theme(.dark).kt, Color.kt
packages/tokens/dist/flutter/kinetix_color_scheme(.dark).dart, app_theme.dart
        ↓
React  — packages/ui/tailwind.config.ts maps every role to `hsl(var(--x) / <alpha-value>)`
Angular — packages/ui-angular/src/styles.css reads the same `hsl(var(--x))` (853 var() reads)
SwiftUI / Compose / Flutter — a `KinetixColors` value type built from the generated enums, injected by
                               `KinetixTheme { … }` (environment / CompositionLocal / InheritedWidget)
        ↓
Create (/create) — @kinetixui/create-theme resolves a KX1 preset into a light+dark semantic theme in
OKLCH and exports CSS / SwiftUI / Compose / Flutter (the CLI runs the same exporters).
```

The intended model — primitive → semantic → theme → component — **is what the repository does**, with two
exceptions this audit found: the focus-ring composite was a baked hex outside the role graph (fixed), and a
`semantic.*` group of ten Figma-era raw hexes sits beside the roles with no dark mapping (unused, §6).

Dark is not an inversion: `color.dark.json` maps every role to its own primitive step (e.g. `primary`
azure.700 → azure.400), and `check:contrast` holds both modes to the same bars (gate).

## 3. Primitive inventory

Method: each step converted to OKLab/OKLCH (Björn Ottosson's matrices, sRGB D65) in
`color-theming-audit/oklch.py`; full table in `color-theming-audit/oklch-primitives.md`. L is ×100.

| Family | Steps | Documented purpose | L range | Peak C | Hue | Semantic use | Verdict |
|---|---|---|---|---|---|---|---|
| azure | 15 (0–1000) | action blue (Tailwind blue remapped) | 98 → 21 | 0.217 @700 | 255–268 | primary, ring, accent-fg, sidebar-primary | Solid. 850→900 ΔL 0.6 (near-duplicate). |
| blue | 15 | none in source; "navy" on /docs/colors | 98.5 → 0 | 0.056 | 237–252 | foreground, dark surfaces, border, accent, info, brand, chart | **Misnamed and broken ramp**: a slate-navy, not blue; 50→100 jumps ΔL 22.6 and changes hue 252→238; 1000 is pure black. |
| green | 15 | none | 100 → 0 | 0.039 | 143–145 | secondary, success, chart | A sage near-grey. Low chroma makes `success` weakly distinguishable from neutrals by colour alone. 0 is white, 1000 black. |
| taupe | 15 | data-viz only | 100 → 31 | 0.026 | 52–58 | chart-5 only | Steps 0–500 move ΔL ≈ 1.8 each, then 9–10; no dark end. |
| cream | 15 | "free for a future surface" | 100 → 51 | 0.086 | 53–57 | **none** | Steps 0–500 span L 96.8–100 (ΔL 0.2–0.7): eight indistinguishable swatches. Unused. |
| amber | 15 | warning + chart | 100 → 23 | 0.142 @500 | 74–80 | warning, chart-3 | Solid; chroma peaks at the light 500, sensible for amber. |
| red | 15 | (doc claimed "chart only" — wrong, fixed) | 98.7 → 0 | 0.210 @500 | 18–29 | destructive, chart-4/7 | Solid; 1000 pure black. |
| neutral | 12 (no 150/850/950) | "SYNTHESIZED" from 3 Figma anchors | 100 → 0 | 0 | — | background, card, muted, muted-fg, sidebar-border | Usable; irregular ΔL (16.4 at 500→600) and a different step set from every other family. |
| static | white, black | — | — | — | — | Angular switch thumb + scrim | Fine. |

No primitive is generated; all are hand-authored hex. **No component on any platform reads a ramp** (§5).

## 4–5. Semantic inventory and light/dark mapping

Resolved from source; the four-platform copies are verified for all 52 web roles by
`apps/web/src/lib/token-evidence.test.ts` (unit, from #299).

| Role | Light → primitive | Dark → primitive |
|---|---|---|
| background | #ffffff neutral.0 | #050c11 blue.900 |
| foreground | #050c11 blue.900 | #f0f7ff blue.50 |
| card / popover | #ffffff neutral.0 | #0b1821 blue.800 |
| surface-grouped | #f6f6f6 neutral.100 | #081219 blue.850 |
| muted / muted-foreground | #f6f6f6 neutral.100 / #6d6d6d neutral.600 | #102432 blue.700 / #92b2c8 blue.100 |
| primary / primary-foreground | #1d4ed8 azure.700 / #f0f7ff blue.50 | #60a5fa azure.400 / #050c11 blue.900 |
| secondary / -foreground | #c7cfc7 green.200 / #465245 green.700 | #2e362e green.800 / #e3e7e3 green.100 |
| accent / -foreground | #f0f7ff blue.50 / #1d4ed8 azure.700 | #102432 blue.700 / #f0f7ff blue.50 |
| destructive / -foreground | #c60a0a red.500 / #fef3f2 semantic.on-error | #dd6a6a red.300 / #280202 red.900 |
| success / -foreground | #5d6d5c green.600 / #f1f3f1 green.50 | #90a08f green.400 / #171b17 green.900 |
| warning / -foreground | #7f5b21 amber.800 / #fff8eb semantic.warning-container | #ffc975 amber.400 / #2a1a00 amber.1000 |
| info / -foreground | #57778d blue.300 / #f0f7ff blue.50 | #92b2c8 blue.100 / #050c11 blue.900 |
| border / input | #92b2c8 blue.100 | #395a70 blue.400 |
| ring | #1d4ed8 azure.700 | #60a5fa azure.400 |
| tertiary (switch off-track) | #b0b0b0 **raw hex** | #395a70 blue.400 |
| brand / -foreground | #1b3c53 blue.500 / #f0f7ff | #7495ab blue.200 / #050c11 |
| action, action-foreground, link, focus | live `var()` aliases of primary / primary-foreground / primary / ring | same |
| action-hover / -pressed | #3460dc / #3f69de **raw hex** (= action @90% / 85% over bg, asserted by check:contrast) | #5796e3 / #528ed7 |
| chart-1…8 | blue.500, green.500, amber.500, red.400, taupe.600, blue.300, red.600, green.700 | lighter steps of the same |
| sidebar-* (8) | mirrors of the above | mirrors |
| semantic.on-info-container, semantic.muted-on-container | #395a70, #616161 | #92b2c8, #92b2c8 |
| semantic.error, on-error, error-container, on-error-container, warning, warning-container, on-warning-container, success-container, on-success-container, info-container | **raw Figma hex, no dark value** | inherit light |

There is no `disabled` colour role: disabled is the `--opacity-disabled` (0.5) token everywhere, and Button
also swaps to `bg-border text-muted-foreground` (double-dimmed). There is no scrim/overlay role (§26).

## 6. Primitive leakage

Full scan with file:line: `color-theming-audit/leaks.md`.

| Platform | Ramp reads in components | Classification |
|---|---|---|
| React (`packages/ui`, `packages/iot`) | 0 Kinetix ramps. 3 stock `border-white` (ColorPicker thumbs) | QUESTIONABLE (picker convention) |
| Angular | `--static-white` (switch thumb), `--static-black` (scrim, documented) | thumb QUESTIONABLE (React uses `background`), scrim JUSTIFIED |
| SwiftUI / Compose / Flutter | 0 ramp reads; all colour through `KinetixColors` | — |
| Token source | `shadow.focus*` colours were raw hex instead of the focus role | **fixed for `shadow.focus` (P0-1)**; status rings remain (P2) |
| Token source | `semantic.*` group: 10 raw hexes, no dark mapping, 0 component consumers, exported to native light files | LEGACY (latent P2) |

## 7. Hard-coded colours

React: transparent/currentColor ×40 (fine); ColorPicker gradients/checkerboard and `chart.tsx:103` Recharts
overrides JUSTIFIED; **SHOULD BE TOKEN**: `modal.tsx:73` literal equals `shadow-xl`; QUESTIONABLE: `tour.tsx:146,148`
scrim `rgb(0 0 0 / 0.6)`, `color-picker.tsx:116` default `#3b82f6` (stock Tailwind), Button Destructive hover
`brightness-95/90` filter. Angular: none beyond §6 and forced-colors system colours. Native: picker thumbs and a
`#E5E5E5`/`Color(white: 0.9)` alpha track (SHOULD BE SEMANTIC `muted`), scrims `black 0.4` in both modes
(Swift, Flutter), Flutter `card.dart:26` duplicates `KinetixShadow.sm` and no Flutter component uses
`KinetixShadow`. Test fixtures and docs pages excluded.

## 8. Component colour contract (React; Angular mirrors it through the same variables)

| Component | Background | Foreground | Border | State | Focus | Disabled | Literal? |
|---|---|---|---|---|---|---|---|
| Button | action / secondary / destructive / transparent | action-fg, secondary-fg, destructive-fg, link | input (Outline) | action/90, /85; Outline border-ring | `shadow-focus` → **now `--focus`** | opacity + border/muted-fg | Destructive filter |
| Input / Textarea | background (readonly muted) | foreground; placeholder muted-fg | muted-fg/80 | hover muted-fg; invalid destructive | border-action + `shadow-focus` | opacity | no |
| Field / Form | — | destructive / warning / success / info; muted-fg | — | — | — | — | no |
| Checkbox / Radio | action when checked | action-fg | muted-fg → action | foreground/0.08 halo | ring-2 ring | opacity | no |
| Switch | tertiary / action | thumb background | — | action/90 | ring-2 ring | opacity | no |
| Select | background; popover; item accent | foreground, popover-fg | muted-fg/80 → action | — | `shadow-focus` | opacity | no |
| Tabs | surface-grouped; active card | muted-fg → foreground | border/0.5 | foreground/0.08 | ring-2 ring | opacity | no |
| Card | card; pressed muted/40 | card-fg | border/50 | selected **border-primary** (not action) | `shadow-focus` | opacity | no |
| Badge | action / secondary-fg / destructive / accent | matching fg | input | — | ring-2 ring | — | no |
| Alert | background | foreground / status colours | border, status/50 | — | — | — | no |
| Dialog / Sheet / Drawer | background; scrim **foreground/40** | foreground | border | — | ring | — | scrim wrong in dark |
| Tooltip | **action** (as a surface) | action-fg | — | — | — | — | no |
| Popover | popover | popover-fg | border | — | — | — | no |
| NavigationMenu | background → accent | accent-fg | — | accent | **bg-accent only, no ring** | opacity | no |
| Sidebar | sidebar-* | sidebar-* | sidebar-border | sidebar-accent | ring-2 sidebar-ring | opacity | no |
| Table | muted/50 rows | muted-fg heads | border | selected bg-muted (colour only) | ring-2 ring | — | no |
| Progress / Skeleton / Spinner | muted track, action fill | action / muted-fg | — | — | — | — | no |

Two focus systems coexist: `shadow-focus` (Button, Input, Textarea, Select, MultiSelect, NumberInput,
InputGroup, InputOTP, Fab, AudioPlayer, Card) and Tailwind `ring-ring` (Checkbox, Radio, Switch, Tabs, Badge,
Sidebar). Both now resolve to the theme (`--focus` → `--ring`).

## 9. Palette-changing UI audit

| Surface | What the user changes | Scope | Verified |
|---|---|---|---|
| Header theme toggle / ⌘K "Theme" | site appearance (next-themes, `.dark` on `<html>`, localStorage `theme`) | **global site theme**, by design | source |
| `/create` | one theme colour (seed), neutral family, radius, surface, chart palette; Advanced: 25 semantic roles; Light/Dark preview switch | **preview-only** inline vars on `[data-create-preview-root]` | rendered (gate) |
| `/themes`, `/docs/theming` | nothing — static light and dark panels | subtree `.theme-light` / `.dark` | rendered |
| `/docs/colors` | display format (hex/hsl/rgb), copy | local | source |
| Component preview toolbar | direction only (writes `<html dir>`, see #300 §27) | global — owned by the Public UX thread | cited |
| Storybook | `.dark` on the iframe `<html>` | iframe | source |
| CLI `theme create/build` | a CSV of `token,hex` → `:root` block | user's file | source |
| CLI `preset css/swiftui/compose/flutter` | none — renders a KX1 preset | user's file | unit (byte-identical to Create) |

Users change a **semantic theme** through a **brand seed** (Simple) or **semantic roles** (Advanced). No UI
edits primitives. The distinction is mostly understandable; wording issues are in §25.

## 10. State isolation

Rendered by `scripts/theme-isolation.mjs` (new, in CI), site in light and dark:

| Boundary | main @5db94f0 | this PR |
|---|---|---|
| Create theme colour changes `<html>` class/style/dir, `:root` tokens or header colour | no leak | no leak |
| Focused preview Button draws the preview's `--focus` | **FAIL** (azure / #60a5fa) | pass |
| Light preview on a dark page resolves light tokens (Create) | **FAIL** (`--shadow-focus*` dark) | pass |
| Theming page light panel on a dark page | **FAIL** (`--action`, `--focus`, `--brand`, `--surface-grouped`, focus rings all dark) | pass |
| Theme change under `<html dir="rtl">` leaves `dir` alone and still applies | pass | pass |
| Malformed hex is `aria-invalid` and leaves the preview unchanged | pass | pass |
| Reset returns to shipped tokens, drops `?preset=` | pass | pass |
| Design does not follow to another page; nothing persisted | pass | pass |

Baseline log: `negative-controls/00-baseline-main-5db94f0-theme-isolation.log` (7 failures). Create never
leaks *out*; the leaks were *in* — dark values reaching a light subtree. Cross-reference: the direction leak
(every preview RTL toggle writes `<html dir>`) is the Public UX audit's finding (#300 §27); colour controls
do not use that mechanism.

## 11. Customization-model comparison

| | A raw palette | B semantic roles | C brand seed | D hybrid |
|---|---|---|---|---|
| Simplicity | poor (135 swatches) | medium (25+ roles) | best | best at entry |
| Predictability | low (roles move indirectly) | high | medium | high |
| Brand fidelity | exact hex | exact hex | hue kept, lightness banded | exact where pinned |
| Accessibility | none | user's job | generated pairs guaranteed | guaranteed + reported |
| Developer control | total | high | low | high |
| Cross-platform | needs regeneration | maps 1:1 to native | maps 1:1 | maps 1:1 |
| Implementation cost | none | exists | exists | **exists** |
| Reversibility | hard | easy | easy | easy (Reset, ↺ per role) |

## 12. Recommended model

**D — hybrid**, which is what Create already is: Simple (theme colour) → Advanced (semantic roles) → Expert
(token source, documented on /docs/theming). Keep it; fix its consistency (P1-3) and validation gaps (§22–23)
rather than add a model.

## 13. Brand-seed feasibility — **YES (already built), not LATER**

`packages/create-theme/src/engine.ts` derives brand, action, hover, pressed, foreground, accent,
accent-foreground, link, focus, primary and ring per mode in OKLCH: action is clamped into a lightness band
(light 0.42–0.62, dark 0.66–0.84) keeping hue and chroma; hover/pressed move toward the backdrop and scale
back together until the label clears AA on all three fills; foregrounds are a tinted near-white/near-black
judged by worst case. 620 unit tests (incl. the 3 added here) cover it, including a 24-hue sweep. It is not a
"10% darker" generator. Status colours never follow the brand, deliberately.

Gaps: no generated value is checked in the *other* mode in the UI; Advanced pins one value for both modes
without saying so; borders, muted text and links are not in the panel (§23).

## 14. Brand source vs accessible UI colour

Documented now on /docs/theming ("Brand colour is not always a UI colour"): `--brand` is identity,
`--action` is the interactive colour, and Create keeps the hue but moves lightness into the readable band.
KinetixUI does not promise an arbitrary hex can be a button, link, ring or dark surface unchanged.

## 15. Contrast findings (gate: `check:contrast`, both modes)

All 25 text pairs pass AA in both modes (light lowest: `muted-foreground / muted` 4.79, `info / background`
4.74; dark lowest: `primary-foreground / primary` 7.74). Alpha fills: Button pressed 4.54 light. Placeholder
uses `muted-foreground` (5.17 on background). Badges and links ride the same pairs.

Non-text (SC 1.4.11) below 3:1 **by design, tracked**: accent/background 1.08 / 1.24, border & input 2.23 /
2.69, tertiary (switch off-track) 2.17 / 2.69, sidebar-border 1.26 / 2.46 — each paired with another cue per
ACCESSIBILITY-AUDIT §A3. Not lowered here.

**Native gap (P1-4):** native Banner/Inform draw `info` text on a 10% `info` tint — the token's own note puts
that at 4.15:1, and the web uses `on-info-container` for exactly this reason; the native `KinetixColors`
has no such field. Source evidence, not rendered.

**Create:** generated pairs are guaranteed; the panel checked text pairs only, for the mode on screen.

## 16. Focus findings

- **P0-1 (fixed).** `--shadow-focus` was baked `#1d4ed8` / `#60a5fa`. Rendered on main: green brand → ring
  stays azure; light preview on a dark page → 2.54:1 against the preview; an Advanced background equal to the
  ring → invisible, with no warning. Now: the web emits `hsl(var(--focus) / a)`, `.theme-light` redeclares it,
  `check:contrast` asserts the source ring equals the `focus` role and that the generated CSS is live, and
  Create's panel checks `focus` on `background` and `card` at 3:1.
- Default ring clears 3:1 everywhere it is drawn: page 6.70 / 7.74, muted 6.20, dark card 7.08 (computed).
- On a Primary button the 1px edge equals the fill, so focus there is the 4px halo (≈1.3:1 change). Meets
  2.4.7 visibly; does not meet 2.4.13 (AAA). P2.
- Status rings (`focus-destructive/-success/-warning`) remain baked; light `focus-destructive` is the Figma
  `#ec5047` (3.62:1), not `--destructive`. P2.
- NavigationMenu trigger shows focus as `bg-accent` + text colour only, no ring (accent is 1.08:1 on the
  page). Candidate P1, **not measured** in a browser here.

## 17. Dark-mode findings

Dark is an independent mapping with a navy surface ladder (page 900 < grouped 850 < card 800 < muted 700),
lighter action and status steps, and its own focus rings — gate-verified for contrast. Gaps: the React
Dialog/Sheet/Drawer scrim is `foreground/40`, i.e. a **light** veil in dark (Angular's own comment calls this
out and uses black 0.6); Swift/Flutter use black 0.4 in both modes (P2). The `semantic.*` legacy group has no
dark mapping (latent). Create derives dark from the same seed; hand-written overrides need an explicit dark
block (now documented).

## 18. High contrast / forced colours

Covered by the existing browser pass: `a11y-browser.mjs` asserts every focus stop keeps a visible outline under
forced colours (798 stops, ACCESSIBILITY-AUDIT "Forced colors"). React relies on Tailwind's transparent
`outline-none`; only InputOTP and two IoT controls add explicit `forced-colors:` rules; Angular has a full
`@media (forced-colors: active)` block. Custom themes cannot affect this — forced colours replace author
colours and drop box-shadows. Not re-measured here. Selected Table rows and the active Tab are background-only
and lose their state under forced colours (P2).

## 19. Cross-platform generation (`color.primary`, four layers)

| Layer | CSS | Swift | Kotlin | Dart |
|---|---|---|---|---|
| Source exists | `{color.azure.700}` / `{color.azure.400}` | same | same | same |
| Generated | `--primary: var(--azure-700)`; dark `213 94% 68%` | `KinetixColorsSwiftUI.primary` (0.114, 0.306, 0.847) | `Theme.kt colorPrimary 0xff1d4ed8` | `KinetixColorScheme.primary 0xFF1D4ED8` |
| Consumed | Tailwind `bg-primary`; components use `action` = `var(--primary)` | `KinetixColors.light.primary` → `\.kinetixColors` | `LightKinetixColors` → `LocalKinetixColors` | `KinetixColors.light` → `KinetixTheme.of` |
| Behaviour verified | rendered (site gates, this PR's gate for focus) | unit (ThemeTokensTests) | unit (CustomThemeTest) | unit (fixtures) |

All 52 web roles × 4 platforms match the source (unit, #299). Native sets are a **subset**: no
`surface-grouped`, `sidebar-*`, `semantic.*`; 5 chart colours not 8; Compose lacks `input`, `ring`,
`tertiaryForeground`. Native token files are copy-in; only `@kinetixui/tokens` is installable (from #299).

## 20. Native integration

Idiomatic: SwiftUI `@Environment(\.kinetixColors)` + `KinetixTheme(light:dark:)` following `colorScheme`;
Compose `CompositionLocal` + `KinetixTheme(light, dark)` and `LightKinetixColors.copy(...)`; Flutter
`InheritedWidget` `KinetixTheme.custom(light:, dark:)`. None forces CSS concepts. Native hover/pressed use the
explicit `actionHover/actionPressed` fields (Button only); Create regenerates both for a custom brand.

## 21. Theme adapters

| Adapter | Styles automatically | Application's job |
|---|---|---|
| CSS variables + Tailwind preset (web) | every Kinetix component, live, incl. focus ring (now) | your own markup via `bg-action` etc. |
| SwiftUI `KinetixTheme` | Kinetix views | stock SwiftUI controls (no `.tint` mapping) |
| Compose `KinetixTheme` | Kinetix composables | stock Material (MaterialTheme is wrapped, not mapped) |
| Flutter `KinetixTheme` + `KinetixMaterialTheme` / `KinetixCupertinoTheme` | Kinetix widgets **and** stock Material/Cupertino widgets | radius/elevation on stock widgets |

## 22. Tailwind

Every role is exposed as a semantic utility with opacity support (`hsl(var(--x) / <alpha-value>)`); primitive
ramps are **not** exposed as Tailwind colours, so consumers cannot reach `bg-azure-700` through the preset.
Correct as is; no change.

## 23. Persistence, reset, input validation, customization accessibility

- Persistence: none, deliberately; the design lives in a versioned `KX1_` preset (allowlisted tokens, size
  caps, migration hook). After Share, further edits leave a stale `?preset=` in the URL (P3); Share/Copy are
  enabled for an empty preset (P3).
- Reset: Reset-all and per-role ↺ exist and work (rendered). No undo; Randomize discards manual overrides
  without asking (P2).
- Input: 6-digit hex only; `#abc`, alpha, names, rgb()/hsl() refused with a message; state never corrupted
  (rendered for a malformed hex). OKLCH text input silently drops alpha and clamps a unitless `62.8` to white
  (P2). Advanced shows the on-screen mode's value but pins one value for both modes, unannounced (P2).
- Accessibility feedback: PASS/FAIL with ratio per pair, failures pulled out, details behind a disclosure —
  good progressive disclosure. Now includes the focus ring at 3:1. Still missing: the other mode, muted text,
  links, borders, charts (P2).

## 24. Preview findings

Two scenes (Dashboard, Form) cover surface, type, primary/secondary action, input, select, checkbox, switch,
status (Alert, Badge), table, chart, progress. Missing: overlay (dialog/popover/tooltip), link, brand
surface, tabs/navigation. Representative, not exhaustive; adding an overlay + link is the useful increment (P3).

## 25. Colour terminology

`primary` (shadcn-compatible source) vs `action` (interactive role, defaults to primary) vs `brand`
(identity) vs `accent` (quiet hover/selected surface — not a brand accent) vs `secondary` (sage chip/button
fill) vs `tertiary` (switch off-track only) vs `muted`. Create calls the seed "Theme colour" and Advanced
groups "Brand & actions", "Surfaces", "Status" — but "Status" contains Accent, which does follow the theme
colour, and a hint mentions "Simple mode", which no control is named (P3). The primitive family `blue` is a
navy and `azure` is the blue (P2 naming, not renamed here: renaming primitives is a breaking change).

## 26. RTL / icon / motion interactions

- RTL: independent — rendered (theme change under `dir="rtl"` keeps `dir`; colour applies).
- Icons: Kinetix icon slots inherit `currentColor` from the component's foreground, so custom themes recolour
  them for hover/disabled/dark without consumer work (source; icon slots themselves are the Icon architecture
  thread's area).
- Motion: theme changes in Create are not animated; transitions are suppressed while a picker slider drags
  (`data-dragging`). Components animate `transition-colors` on interaction only. No decorative interpolation.

## 27. Documentation findings (fixed in this PR)

- /docs/theming contract table said `--destructive` is `#ec5047`; it is `#c60a0a`. Fixed.
- /docs/theming listed a `--radius` variable that does not exist and used it in the example. Fixed.
- The page's own **retheme recipe** (`--primary: var(--green-500)` + `green-50`) renders button text at
  **3.42:1** and links at 3.81:1, overrode light only, and implied the ring tracks `--primary` (it does not).
  Replaced with a recipe that passes (7.38:1 light, 9.41:1 dark) and sets `--ring` and `.dark`.
- /docs/dark-mode said the dark palette is "generated … by walking each ramp"; it is a hand-mapped,
  contrast-gated palette. Fixed.
- /docs/colors said red "powers the data-viz palette; --destructive is a standalone Figma value"; red.500 is
  `--destructive`. Fixed.
- Added to /docs/theming: architecture diagram, why semantic roles, Simple/Advanced/Expert, brand vs UI
  colour, both themes, per-platform application (web/Angular, SwiftUI, Compose, Flutter), what each adapter
  themes, accessibility rules a theme must keep, reset. Native snippets use APIs read in source
  (`Theme.swift`, `ui/Theme.kt:207`, `theme.dart:220`, `kinetix_material_theme.dart:104`); **they were not
  compiled in this PR** (no Swift/Kotlin/Dart toolchain in the audit container).
- Open: `docs/cli` says `theme build` uses "the same math as Create" — it uses plain contrast and pure
  black/white, and writes `:root` only (P2, CLI).

## 28. Testing (against the brief's list)

| # | Assertion | Where | Kind |
|---|---|---|---|
| 1–3 | semantic tokens resolve, light and dark | check:contrast, check:token-contract | gate |
| 4–7 | CSS / Swift / Kotlin / Dart match source | token-evidence.test.ts (52 roles × 4) | unit |
| 8 | components consume semantic roles | this scan (no gate) — **gap** | — |
| 9 | custom theme changes representative components | create-workspace tests (jsdom) + **theme-isolation focus** | unit + rendered |
| 10 | preview does not recolour site shell | **theme-isolation "shell"** | rendered |
| 11 | unrelated previews unchanged / light previews stay light | **theme-isolation "leak-in"**, **theme-light-parity.test.ts** | rendered + unit |
| 12 | theme does not affect direction | **theme-isolation "direction"** | rendered |
| 13 | reset restores defaults | **theme-isolation "reset"** + create tests | rendered + unit |
| 14 | invalid input is safe | **theme-isolation "invalid"** + preset codec tests | rendered + unit |
| 15 | contrast gates run | check:contrast in ci.yml | gate |
| 16 | focus remains visible / follows theme | **check:contrast focus rows**, **engine.test focus sweep**, **theme-isolation focus** | gate + unit + rendered |
| 17 | custom icons inherit state colours | not added (Icon thread) | — |

## 29. Negative controls

Logs in `color-theming-audit/negative-controls/`. Every sabotage was reverted; the final tree is the fix.

| # | Sabotage | Caught by |
|---|---|---|
| 00 | main @5db94f0 as is | theme-isolation: 7 failures (focus ×5, leak-in ×2) |
| 01 | `.theme-light` without the added tokens | theme-light-parity.test.ts — lists all 15 missing |
| 02 | focus ring baked again (`LIVE_SHADOW_ROLES = {}`) | check:contrast "generated --shadow-focus reads var(--focus)" (both modes) |
| 03 | source focus ring `#1b3c53` ≠ focus role | check:contrast "shadow.focus edge == color.focus" |
| 04 | Create panel without the focus pairs | engine.test focus sweep + manual-override test (3 failures) |
| 05 | preview writes its theme to `<html>` | theme-isolation "shell" (both themes) |

Not run as negative controls here, already covered by existing gates: breaking primary-foreground contrast and
removing a dark mapping (check:contrast fails on any new sub-AA pair / missing dark token), breaking generated
platform output (token-evidence.test.ts), malformed preset (preset codec tests).

## 30. Findings by severity

**P0 — 1 (fixed)**
- P0-1 Keyboard focus ring ignored the theme; reachable invisible focus with no warning. §16.

**P1 — 5 (all fixed; 2 in this audit PR, 3 in Slice 1)**
- P1-1 *(fixed)* Light previews on a dark page rendered dark action/focus/brand/surface tokens and rings. §10.
- P1-2 *(fixed)* /docs/theming's retheme recipe produced sub-AA text; table and claims wrong. §27.
- P1-3 *(fixed in Slice 1)* An Advanced `primary` pin previewed, exported for web and exported for native as three
  different themes. Decision: a `primary`/`primary-foreground`/`ring` pin cascades to `action`, `action-foreground`,
  `link`, `focus` (`ROLE_DEFAULTS`, the token source's own alias graph), applied once in the resolver so preview, CSS and
  the three native exports agree; a role pinned itself still wins; hover/pressed regenerate. `role-equivalence.test.ts`.
- P1-4 *(fixed in Slice 1)* Native `onInfoContainer` added (top-level `color.on-info-container`, 4.19:1 -> 6.47:1 light);
  Banner/Inform on SwiftUI, Compose and Flutter read it. Success/warning/error containers have no consumer and are deferred.
- P1-5 *(fixed in Slice 1, measured)* NavigationMenu trigger focus was background-only (1.08:1 light, 1.24:1 dark); it now
  draws `ring-ring` like every other `ring-ring` control. Gated in `check:theme-isolation`.

**Slice 1 also closed** (from P2/P3): status focus rings now follow their roles (light destructive ring #ec5047 -> role
#c60a0a, 3.62 -> 6.09:1); a `scrim` role replaces the four scrim recipes; `modal.tsx` shadow literal -> `shadow-xl`;
`check:component-colors` guards component source against primitives and literals.

**P2 — 14**: `blue` ramp misnamed/discontinuous; `cream` unusable steps; inconsistent step sets; `semantic.*`
legacy group without dark values; status focus rings baked (light destructive ring ≠ role); React/native
scrims (light veil in dark, no token, four recipes); Primary-button focus is halo-only; native colour sets are a
subset (+ Compose missing ring/input); stock SwiftUI/Compose controls unthemed; colour-only states (Alert
without icon, Badge, invalid borders, selected rows); Create Advanced pins one value for both modes silently;
Create panel ignores the other mode, muted text, links and borders; OKLCH input drops alpha / clamps unitless
L; CLI `theme build` math, `:root`-only output and doc claim.

**P3 — 6**: stale `?preset=` after edits; Share enabled for an empty preset; "Status" group wording and
"Simple mode" hint; preview lacks overlay/link/brand; `modal.tsx` literal = `shadow-xl`; Flutter `card.dart`
literal = `KinetixShadow.sm`.

## 31. Maturity assessment

| Area | Score | Why |
|---|---|---|
| Primitive palette | PARTIAL | azure/amber/red solid; blue, cream, taupe, neutral irregular; unused families |
| Semantic architecture | SOLID | clean roles + role aliases; legacy `semantic.*` group and two raw-hex roles |
| Light theme | MATURE | every text pair AA, gated |
| Dark theme | SOLID | independent mapping, gated; scrim wrong in React |
| Component consumption | SOLID → MATURE on web after P0-1 | no ramp reads anywhere; a few literals |
| Cross-platform generation | SOLID | 52 × 4 verified; native subset |
| Customization API | SOLID | CSS vars + `KinetixTheme(light:dark:)` ×3 + presets + CLI |
| Customization UX | SOLID | Simple/Advanced with guarantees; P1-3 and validation gaps |
| Accessibility protection | SOLID | generated pairs guaranteed; panel now covers focus; other-mode gap |
| Preview isolation | MATURE (after fixes) | rendered gate in CI |
| Documentation | SOLID (after fixes) | canonical guide now exists; native snippets uncompiled |
| Testing | SOLID | strong unit + new rendered gate; no "components use roles" gate |

**Overall: B.**

## 32. Best-use scenario (as the system stands after this PR)

1. Open `/create`; the shipped Kinetix theme is shown and nothing is generated until you change something.
2. Pick the **theme colour** (your brand). Both appearances are derived; hover, pressed, foreground and
   focus are generated to pass.
3. Read the preview in Light and Dark (preview-only switch); the site around it does not change.
4. Check the contrast summary — text at 4.5:1, focus ring at 3:1.
5. Optionally choose neutral, radius, surface, chart palette.
6. Only if needed, open **Advanced** and pin specific roles; failures you introduce are reported, not hidden.
7. **Export** for your platform (Web CSS diff, SwiftUI, Compose, Flutter) or copy the `KX1_` preset and run
   `kinetixui preset …` in CI; paste per /docs/theming.
8. To go back: delete the override block, or Reset in Create.

## 33. Recommended implementation slices (no more than three)

1. **Theme correctness** — resolve P1-3 (primary pin semantics, one rule for preview + all exporters);
   P1-4 (`onInfoContainer` in native `KinetixColors` + exporters); P1-5 after measuring; status focus rings
   live (accepting the light destructive ring change); a scrim role used by every platform; a static gate that
   component source contains no ramp utilities or colour literals outside an allowlist.
2. **Customization UX** — per-mode Advanced values (or an explicit "both modes" label); the panel checks both
   modes plus muted text, links and borders; OKLCH input validation; stale-URL and empty-preset fixes; undo or
   confirm on Randomize; an overlay + link in the preview.
3. **Palette hygiene & adoption** — document or retire `cream` and the `semantic.*` legacy group (with a
   deprecation path); a plan for the `blue`/`azure` naming; native colour-set parity (surface-grouped, chart
   6–8, Compose ring/input); compile the native doc snippets in the native CI jobs; correct the CLI
   `theme build` doc.

## 34. Explicit non-goals (not done here)

No new palette generator or theme editor; no OKLCH migration of the token source; no new brand colours or
visual rebrand; no primitive renames; no new semantic tokens; no change to QE, Adoption Intent, marketing
schedule, ART-002 or package publication; no Angular C2; no icon or motion changes; the shared preview `dir`
fix stays with the Public UX thread.
