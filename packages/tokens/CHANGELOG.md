# @kinetixui/tokens

## 0.24.0

### Minor Changes

- 476f316: Establish the surface model, and give Card a finished resting state and an opt-in interactive contract.
  
  **New token: `surface-grouped`.** The grouped section raised content sits on — a settings group, a dashboard
  region. Light is the grey of `muted` (`#f6f6f6`); dark is `blue.850` (`#081219`), between the page and
  `card`. It is its own role because dark `muted` is lighter than `card`, so a card placed on a `muted`
  section read as recessed in dark mode. Emitted to every platform output (`--surface-grouped`,
  `KinetixColors.surfaceGrouped`, `color_surface_grouped`, `KinetixColorScheme.surfaceGrouped`) and mapped in
  the Tailwind preset as `bg-surface-grouped`. `muted-foreground` clears AA on it in both themes (4.79:1 / 8.48:1).
  
  **Card looks raised without a heavy stroke.** Its edge is now `--border` at half strength, so it no longer
  draws the same line as the inputs and buttons inside it, and it rests on the `md` step of the elevation
  ladder instead of `sm`, whose 5% shadow did not visibly render. Both stay on tokens, so Create's surface
  treatments still apply. Visual change only; no class a consumer passes is overridden. `.kx-card` in
  `@kinetixui/angular` takes the same resting treatment.
  
  **`Card` gains `asChild`.** A Card stays static by default — no hover, no pointer cursor. Rendered as an
  `<a href>` or `<button>` through `asChild`, it takes interactive states keyed on that element: hover (on
  pointers that can hover) strengthens the edge and lifts to `lg`; pressed drops to `sm` with a `muted` wash;
  `aria-pressed="true"` or `aria-current` draws a 2px `--primary` edge; keyboard focus shows the shared
  `shadow-focus` ring above every other state. The hover elevation transitions over `duration-fast` and is
  removed under `prefers-reduced-motion`. `CardProps` is exported. Additive; existing usage is unchanged in API.
- aff358a: Make the type scale follow the reader's text size, on every platform.
  
  A font size in `px` does not respond when someone raises their browser's default text size, so the
  KinetixUI type scale could not be made bigger. Measured across all 206 Storybook stories before this
  change: **1,357 rendered elements** carrying a type-scale class, across 115 stories and 13 of the 16
  steps, every one of them unchanged at 200% text. Components that mixed `text-body-md` with Tailwind's
  own `text-sm` showed the inconsistency directly — one half of a page doubled and the other did not.
  
  **The canonical tokens were never wrong.** `tokens/primitives/typography.json` stores plain unit-less
  numbers, which is the right thing for a source that feeds five platforms. `px` was added by a transform
  that appended it to every `$type: dimension` token, so a font size was treated exactly like a border
  width. The split now happens at the transform instead, and each platform says what scalable means in
  its own terms:
  
  - **Web** — `fontSize.*` and `lineHeight.*` are emitted in `rem`; every other dimension stays `px`.
    `--font-size-body-md: 14px` → `0.875rem`, `--text-body-md: 400 14px/20px …` → `400 0.875rem/1.25rem …`.
  - **Android resources** — unchanged, and deliberately so. `dp` looks like the Android spelling of the px
    problem and is not: the Compose code reads these as `dimensionResource(id).value.sp`, and
    `dimensionResource` already divides out density after `getDimension()` has applied the font scale to an
    `sp` resource — so emitting `sp` here would apply the scale twice and render 14sp at roughly 56px
    instead of 28 at a 2x font scale. With `dp` the scale is applied exactly once, by the `.sp` at the point
    of use. This was changed to `sp` during review and reverted when that was measured.
  - **SwiftUI** — `Font.custom(_:size:)` → `Font.custom(_:size:relativeTo:)`. The two-argument form is a
    fixed size that opts out of Dynamic Type entirely; the three-argument form keeps the designed size at
    the default setting and scales from there. The text style per step is chosen by nearest default point
    size, so it is derived from the scale rather than hand-assigned.
  - **Compose and Flutter** were already correct (`.sp`, and `TextStyle` under `TextScaler`) and their
    generated output is byte-identical after this change.
  
  **Default appearance is unchanged.** Every conversion is exact, because the scale is all sixteenths:
  14 → `0.875rem`, 11 → `0.6875rem`, 57 → `3.5625rem`. At the default 16px root every step computes to
  the pixel size it always did, and measured rendered dimensions are identical — delta 0.0px across the
  representative components. Letter-spacing deliberately stays in `px`: it is an optical constant rather
  than a size the reader asked to change, the primitive tokens are shared across steps so there is no one
  font size to make it relative to, and at 0.1–0.5px scaling it would not be legible.
  
  **Why minor, and what is observable.** No token is renamed or removed and nothing rendered moves at the
  default setting, but the *value representation* changes and that is visible to anyone reading tokens
  directly: `tokens.fontSize["body-md"]` is now `"0.875rem"` rather than `"14px"`, so code that does
  `parseInt(...)` on it gets `0.875`. The same applies to `--font-size-*` / `--line-height-*` in
  `globals.css`. The native artifacts are unchanged. `@kinetixui/tokens` is Beta
  and documents that pre-1.0 it carries no compatibility guarantee, and in `0.y.z` semver a change of this
  kind is expressed as a minor — the same call the reduced-motion base layer took for the same reason.
  If you consume the token values as strings, check any arithmetic you do on them.
  
  `Select`'s value also now wraps instead of being clamped to one line, and the value span gains `min-w-0`
  with `overflow-wrap: anywhere` so a value with no break opportunity — an identifier, a URL with no
  separators — breaks instead of overflowing the trigger and pushing the chevron out of it. `line-clamp-1` was invisible while
  the text could not grow; once it could, the span needed 80px and was given 40, with a computed
  `text-overflow` of `clip` rather than `ellipsis` — so "Select a fruit" rendered as "Select a" with
  nothing to say the rest existed. The trigger's `min-h` was always meant to absorb this.

### Patch Changes

- ded4054: Fix five accessibility defects on IoT surfaces: contrast on tinted cards, and duplicate landmark names.
  
  A real-browser axe pass over the IoT stories found nine colour-contrast failures and two duplicated
  navigation landmarks. Both are genuine WCAG failures, not false positives, and both predate the pull
  request that surfaced them.
  
  **Contrast.** `--muted-foreground` is tuned against `--background` and `--muted`, where it clears AA
  at 5.17:1. IoT device, group and activity cards tint their surface to carry state, and a 10% tint
  spends the whole margin: secondary text landed at 4.43:1 on `bg-primary/10` and 4.33:1 on
  `bg-destructive/10`, under the 4.5:1 that WCAG 1.4.3 requires. The token itself is not wrong —
  `neutral.600` is a published Figma value — so the fix is a new semantic token for the surfaces that
  tint, `--semantic-muted-on-container`, exposed as `text-muted-on-container`. This follows
  `--semantic-on-info-container`, which exists for the same reason on `bg-info/10`. It clears AA on
  every tint those cards use, worst case 4.79:1, and stays visibly lighter than `--foreground` so the
  type hierarchy is unchanged. Dark mode needed no new value and reuses `--muted-foreground`: a tint
  lightens a dark surface away from its text rather than toward it, so dark was already at 6.9–8.4:1.
  
  `DeviceControlCard`, `DeviceGroupCard`, `DeviceIdentity` and `ActivityTimeline` now use it for the
  text that sits on those surfaces. Nothing is restyled beyond the colour of that text.
  
  **Landmarks.** `SpaceBreadcrumb` named its `<nav>` "Location" for every instance, so a screen
  listing several places produced several identically-named navigation landmarks — which is no more
  useful than none when picking one from a landmark list. The accessible name now defaults to
  `Location: <current place>`, taken from the last item in `path`, and remains overridable with
  `label`. A breadcrumb rendered without a path still falls back to "Location".
  
  Patch rather than minor: the new token and utility exist only to carry the correction. Nothing is
  removed or renamed, no consumer has to adopt anything, and upgrading changes what was already wrong
  rather than adding capability to take up.

## 0.23.3

No changes in this release.

## 0.23.2

No changes in this release.

## 0.23.1

No changes in this release.

## 0.23.0

No changes in this release.

## 0.22.1

No changes in this release.

## 0.22.0

### Minor Changes

- cf25de2: Foundations: the spatial scale is now documented as an **8-unit grid with a 4-unit half-step**, and extended additively. New tokens: `spacing.10`, `12`, `16`, `20`, `24`, `32` (40, 48, 64, 80, 96, 128 — the layout scale; the numbering stays n × 4, matching Tailwind), `radius.xxl` (24), `duration.instant` (100ms) and the `easing.enter`, `easing.exit` and `easing.emphasized` curves. Nothing existing was renamed or changed.
  
  The SwiftUI, Compose and Flutter outputs now also include `KinetixSpacing` (`space0`…`space32`) and `KinetixRadius` (`none`…`full`) alongside `KinetixDuration` / `KinetixEasing` — spacing and radius previously reached only web and Android. `pnpm check:grid` (new, in CI) keeps every spacing token a multiple of 4 and stops the component library gaining new off-grid arbitrary pixel values. See `/docs/foundations`.
- c2f491f: Radius **role aliases**: `radius.field` (→ `sm`, 4), `radius.control` (→ `md`, 8), `radius.container` (→ `lg`, 12) and `radius.surface` (→ `xl`, 16). Sizes say how round; roles say what is round, so a theme can reshape every field or every card by overriding one token without disturbing the size steps. On the web each is a live reference (`--radius-control: var(--radius-md)`), the Tailwind preset gains `rounded-field`, `rounded-control`, `rounded-container` and `rounded-surface`, and the SwiftUI, Compose and Flutter `KinetixRadius` gain `field`, `control`, `container` and `surface`. The mapping is measured from how the components use radius today. Additive: no existing token, utility or component changed, and components move to the roles incrementally. See `/docs/foundations`.

## 0.21.0

No changes in this release.

## 0.20.1

### Patch Changes

- 174c1fe: Light `--shadow-focus-warning` now uses `amber.800` (`#7f5b21`, 5.8:1) instead of the old Figma orange `#f97907` (2.70:1), which failed WCAG 1.4.11 as a focus indicator. It matches the light `--warning` colour. `check:contrast` now checks the edge of every `--shadow-focus*` ring against the page in both themes, so a regression fails CI.

## 0.20.0

No changes in this release.

## 0.19.0

No changes in this release.

## 0.18.0

### Minor Changes

- 5d5fdcf: Add role tokens on top of `primary`: `action` (+ `action-foreground`), `link`, `focus` and `brand` (+ `brand-foreground`), plus explicit `action-hover` / `action-pressed` for the native ports. `action`, `link` and `focus` default to `primary` / `ring` as live `var()` references in both themes, so an existing theme that only sets `--primary` keeps working, while `--action` can now be overridden on its own to split the interactive colour from `primary`. Components now read the role tokens (`bg-action`, `text-link`) instead of `primary` — no visual change with the default theme — and `Fab` no longer uses a hard-coded blue hover that inverted in dark mode. `kinetixui theme create/build` and the web theme-builder accept the new tokens (optional overrides). SwiftUI, Compose and Flutter get `action`, `actionHover`, `actionPressed`, `brand`, `link` and `focus` colours in their compiled tokens. **Upgrade note:** components using `bg-action` / `text-link` need the matching `@kinetixui/ui/tailwind.config` preset, so update the package when re-adding components.

## 0.17.0

### Patch Changes

- 5b5b2d6: Fix low contrast on tinted info surfaces: Banner and Inform `information` text used `--info` (#57788e) on its own 10% tint, only 4.15:1. They now use a new `text-info-on-container` utility backed by `--semantic-on-info-container` (light #395a70; dark now defined too, matching `--info`). Adds the dark value for `semantic.on-info-container` to the token contract; SwiftUI, Compose and Flutter get `colorSemanticOnInfoContainer` in their compiled tokens. Found by the new real-browser axe pass.

## 0.16.1

No changes in this release.

## 0.16.0

No changes in this release.

## 0.15.0

No changes in this release.

## 0.14.0

No changes in this release.

## 0.13.0

### Minor Changes

- f2dea24: Add an `interaction` token category — `target.minimum` (44px), `target.default` (40px), `focus.width` (1px), `focus.offset` (2px), `press.opacity` (0.8), `drag.threshold` (4) — behavioral values that sit alongside the existing theme-independent `motion`/`opacity` primitives rather than colors or spacing. Two are wired into real consumers in this slice: `focus.width` now backs the `spread` of every `shadow.focus*` entry (compiled CSS is unchanged — same `0 0 0 1px …`, now token-backed instead of a magic number), and `drag.threshold` drives `KanbanBoard`'s `PointerSensor` activation distance via `tokens.interaction.drag.threshold` from `@kinetixui/ui`'s new runtime dependency on `@kinetixui/tokens`. The rest (`target.*`, `focus.offset`, `press.opacity`) are defined but not yet wired to a component — see `/docs/tokens`'s "Interaction tokens" section for why each one is or isn't, and what a follow-up slice would need. Web/tokens only in this slice; the native ports don't consume `interaction.*` yet.

## 0.12.0

No changes in this release.

## 0.11.0

No changes in this release.

## 0.10.0

No changes in this release.

## 0.9.0

No changes in this release.

## 0.8.0

No changes in this release.

## 0.7.0

### Minor Changes

- 7d1ef8f: Add three new DTCG token primitives — `duration`/`easing` (motion), `opacity`, and `z-index` — grounded in the values already hardcoded across the component library (`duration-200/300/500/1000`, `ease-linear`/`ease-in-out`, `opacity-0/50/70/100`, `z-[1]/z-10/z-20/z-40/z-50`), rather than invented from scratch. Compiled to `--duration-*`/`--easing-*`/`--opacity-*`/`--z-index-*` CSS custom properties, `KinetixMotion.swift`/`.kt`/`.dart` on the three native platforms, and new `packages/ui`'s `tailwind.config.ts` utilities (`duration-fast`, `ease-standard`, `opacity-disabled`, `z-overlay`, etc.) that every component that previously hardcoded these values now uses directly.
  
  A handful of pre-existing values that don't cleanly match a token step (`disabled:opacity-40` in `AudioPlayer`, `opacity-60` in `DropdownMenu`/`Select`, the `Calendar` nav buttons' resting `opacity-50`) are left as literals with a comment rather than silently normalized to the nearest token — that's a design call for later, not a rename.

## 0.6.5

No changes in this release.

## 0.6.4

No changes in this release.

## 0.6.3

### Patch Changes

- ff37bef: Release plumbing: publish via npm **trusted publishing** (OIDC) instead of a long-lived `NPM_TOKEN`. Each package has a trusted publisher (this repo + `release.yml`) configured on npmjs.com; `pnpm publish` exchanges the GitHub Actions OIDC token for a short-lived registry token. No package contents change.

## 0.6.2

### Patch Changes

- ce4184f: The release now publishes via `pnpm -r publish --provenance` (a directory publish) instead of `changeset publish` (which packs to a tarball first — that path drops provenance). Git tags are created with `changeset git-tag`. This is the release that should finally carry an npm provenance attestation.

## 0.6.1

### Patch Changes

- 7f749b9: Publishes now carry an npm **provenance** attestation.
  
  `changeset publish` in this pnpm workspace shells out to `pnpm publish`, which didn't pick up the `NPM_CONFIG_PROVENANCE` workflow env var — so 0.5.1 / 0.6.0 shipped without attestations. `publishConfig.provenance: true` in each package's `package.json` is the tool-agnostic switch; it only fires in CI (OIDC), which is the only place these publish.

## 0.6.0

## 0.5.1

## 0.5.0

### Minor Changes

- 3e0dc4b: **New `azure` primitive ramp + `--primary` is an action blue, set independently
  per theme.** The desaturated navy (`Primay` from Figma) read as near-black once
  pushed for contrast, so `--primary` is now a real blue that pops as a button/link
  colour. A new `color.azure` ramp (15 steps, Tailwind-blue-derived) backs it;
  light and dark map to different steps — two palettes, not one flipped:
  
  - light `--primary` / `--ring` / `--accent-foreground` / `--sidebar-primary` /
    `--sidebar-accent-foreground` / `--sidebar-ring` → `azure.700` `#1d4ed8`
    (6.7:1 on the background, 6.2:1 under `--primary-foreground`).
  - dark `--primary` / `--ring` / `--sidebar-primary` / `--sidebar-ring` →
    `azure.400` `#60a5fa` (`#1d4ed8` would be ~2.9:1 on the near-black dark
    surface; `#60a5fa` clears 7.7:1).
  - `shadow.focus` re-baked per theme (`#1d4ed8` light, `#60a5fa` dark).
  
  **`--secondary` deepened** `green.50` → `green.200` (`#f1f3f1` → `#c7cfc7`) so a
  secondary button/chip actually stands off the white page; `--secondary-foreground`
  `green.600` → `green.700` (`#465245`), 5.2:1 on the new surface.
  
  `--chart-1` stays navy (`blue.500`) — the data-viz ramp is tuned for categorical
  separation, not brand. `check:contrast` passes AA in both themes. Native token
  sets (SwiftUI / Compose / Flutter) and the CLI registry `tokens` style are
  regenerated.

## 0.4.3

### Patch Changes

- 196d4b0: **`--chart-6`, `--chart-7`, `--chart-8`** added to the token contract (light +
  dark, plus the `chart.6/7/8` Tailwind colours) so stacked / categorical charts
  with more than five series stay distinguishable.
  
  **`ChartContainer`** gains `state` (`"loading" | "empty" | "error"` — renders a
  shimmer / message / alert placeholder), `stateMessage`, and `srTable` (a
  visually-hidden `<table>` of the underlying numbers for screen readers).

## 0.4.2

### Patch Changes

- 7ad6a21: **Chart text alternative.** `ChartContainer` now renders `role="img"` with an
  `aria-label` — pass `label` with a one-line summary of what the chart shows
  (WCAG 1.1.1); it falls back to `"Chart"`. Cartesian recipes already pass
  `accessibilityLayer` for keyboard data-point navigation.
- 32779bc: `ChartContainer` now scrubs two redundant Recharts a11y artefacts from its
  rendered output: the `role="img"` (no `<title>`) that Recharts stamps on every
  sector / dot `<path>` — noise, since the container already carries the text
  alternative — and the unnamed `<svg role="application">` its
  `accessibilityLayer` leaves behind, which now gets the container's label. Clears
  axe `svg-img-alt` on chart pages.
- f44e7a2: **Dark-mode focus ring.** The `--shadow-focus{,-destructive,-success,-warning}`
  composites now carry a real dark set built from the dark `--ring` / semantic
  primitives (`tokens/semantic/shadow.dark.json`). Previously they baked a
  light-theme navy that measured ~1.7:1 against the dark surface — below WCAG 2.2
  SC 1.4.11 (3:1); it now clears 8.8:1. New export
  `@kinetixui/tokens/css/extras/dark` (also bundled into
  `registry/kinetixui/globals.css`); add its `@import` after
  `@kinetixui/tokens/css/extras`.
  
  **NumberInput** — the −/+ stepper buttons now draw a `--ring` inset outline on
  `:focus-visible` so keyboard users can tell which control is focused (they
  previously showed only a container-level ring).
- 183abbf: Light-mode `--warning` moved from the Figma `onWarningContainer` orange
  (`#f97907`) to `amber.800` (`#7f5b21`). The orange was **2.7:1** as `text-warning`
  on the page and **2.6:1** in the `Tag` warning variant — both fail WCAG AA; the
  dark-amber clears 5.8–6.1:1. Dark-mode `--warning` is unchanged (bright
  `amber.400`). `check:contrast` now enforces every warning pair with no
  allow-list.

## 0.4.1

### Patch Changes

- 1fc0e08: Light-mode `--destructive` now resolves to `red.500` (`#c60a0a`) instead of the
  Figma `error` value (`#ec5047`), which failed WCAG AA — 3.33:1 as destructive-
  button text and 3.62:1 as `text-destructive` on the page. It now clears
  5.6–6.1:1. Dark mode is unchanged.
  
  Repository metadata (`repository` / `homepage` URLs) updated for the `zedalleys`
  GitHub org.

## 0.4.0

### Minor Changes

- a2e5706: Token engine now emits additive **SwiftUI-`Color`**
  (`KinetixColorsSwiftUI` / `KinetixColorsSwiftUIDark`) and
  **Flutter-`Color`** (`KinetixColorScheme` / `KinetixColorSchemeDark`)
  semantic colour sets, on **both** the light and dark passes — the real
  dark values the `packages/ui-swiftui` and `packages/ui-flutter`
  `KinetixTheme`s need. The `--chart-1…5` palette is included.
  
  Purely additive: the existing `KinetixColors.swift` / `Theme.swift`
  (UIColor) and `app_theme.dart` / `app_colors.dart` outputs are
  byte-identical and untouched — a rename would collide with the native
  libraries' own `KinetixTheme` / `KinetixColors` types.
  
  `@kinetixui/cli` and `@kinetixui/ui` version alongside (fixed group);
  there is no change to the CLI or the React components.

## 0.3.1

## 0.1.0

### Minor Changes

- 1a727a7: First public release.
  
  - **@kinetixui/tokens** — the KinetixUI token contract: `--*` CSS variables
    (light + dark), `--shadow-*` / `--text-*` composites, a typed `tokens` object,
    and native text styles (`KinetixType.swift`, `KinetixType.kt`, `app_text.dart`).
  - **@kinetixui/ui** — 56 React components on the token contract (CVA + Radix +
    Tailwind), plus the `tailwind.config` preset. Also installable via the shadcn
    registry at `kinetixui.com/r/*.json`.
