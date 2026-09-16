# @kinetixui/ui

## 0.10.0

### Minor Changes

- 9db6327: Add `Banner` — a full-bleed, page-level notice (info/promo/maintenance), optionally dismissible with an optional action. Fourth pick from the `COMPONENT-ADDITIONS.md` Tier 1 backlog. Distinct from `Alert` (in-flow, static) and `Sonner` (transient toast): persistent and edge-to-edge. Distinct from `Inform` (contained, rounded inline card): `Banner` has no rounded corners or own width — it spans whatever it's placed in, typically the full viewport. Reuses `Inform`'s intent taxonomy and icon set for a consistent look.
  
  Ships on all four platforms per the four-platform rule: `KinetixBanner` on Jetpack Compose, SwiftUI, and Flutter too. The web version's `sticky` prop has no component-level native equivalent — the native ports document pinning by placement instead (a `Scaffold`'s top bar, `.safeAreaInset(edge: .top)`, or the first child of a non-scrolling container), the same convention already established for `AppBar`.
- 17e6930: Add `DescriptionList`/`DescriptionListItem` — `<dl>` term/detail rows with the site's own spec-sheet skin (mono, uppercase, tracked term labels; a divided rounded shell). Third pick from the `COMPONENT-ADDITIONS.md` Tier 1 backlog — lifted out of two hand-rolled call sites (`ComponentMeta`'s doc-page spec strip and the homepage's "spec" card) into a reusable component; those two call sites were left as-is rather than migrated, which is out of scope here.
  
  `layout="row"` (default, term and value side by side) or `layout="stacked"` (value below a full-width term, for longer values); `showDivider` on each item. Ships on all four platforms per the four-platform rule: `KinetixDescriptionList`/`KinetixDescriptionListItem` on Jetpack Compose, SwiftUI, and Flutter too — each draws its own bottom divider per item rather than a shared `divide-y`, the same documented simplification already established for `List`/`ListItem`.
- 70a6d44: Add `SegmentedControl`/`SegmentedControlItem` — an iOS-style single-select strip. Fifth pick from the `COMPONENT-ADDITIONS.md` Tier 1 backlog. Functionally `ToggleGroup type="single"`: a thin, documented preset over the same Radix primitive (`type="single"` is fixed, not exposed) with `Tabs`' visual treatment — a filled `bg-muted` track and a raised, shadowed active segment — instead of `Toggle`'s individually-outlined-button look.
  
  Ships on all four platforms per the four-platform rule: `KinetixSegmentedControl`/`KinetixSegmentedControlItem` on Jetpack Compose, SwiftUI, and Flutter too, reusing each platform's existing `Tabs` visual treatment and its stateless, caller-owns-the-selected-value shape (no context to thread a shared value through the way Radix's `ToggleGroup` does).
- 89ca728: Add `Timeline` — ordered events down a rail (dot, connector, time, content). Sixth pick from the `COMPONENT-ADDITIONS.md` Tier 1 backlog, the first of the two remaining M-effort items. `alternating` lays content left/right of a centered rail (desktop); the default is a single left-aligned rail. Same rail/dot/connector technique as `Stepper`, but for a history/activity log rather than a progress indicator — an array of arbitrary events instead of complete/current/upcoming states.
  
  Ships on all four platforms per the four-platform rule: `KinetixTimeline` on Jetpack Compose, SwiftUI, and Flutter too. Compose/SwiftUI reuse `Stepper`'s documented connector simplification (a fixed minimum height instead of React's dynamic `flex-1` stretch — neither platform has a cheap equivalent without a custom layout); Flutter's `IntrinsicHeight` + `Expanded` gets a genuine dynamic-stretch connector, matching the web exactly.

## 0.9.0

### Minor Changes

- 3eb8edc: Add `ButtonGroup`/`ButtonGroupSeparator`/`ButtonGroupText` and `NativeSelect`/`NativeSelectOption`/`NativeSelectOptGroup` — the third and fourth picks from the "missing components" gap flagged in the infra/design-system audit against shadcn/ui's current matrix.
  
  `ButtonGroup` visually joins a row or column of independent `Button`s into a connected, segmented-control-style cluster. Ships on all four platforms per the four-platform rule: `KinetixButtonGroup` family on Jetpack Compose, SwiftUI, and Flutter too (each with a documented simplification — no cross-child border/radius override mechanism on those platforms, so only the group's outer corners are squared).
  
  `NativeSelect` is a styled wrapper around the browser's own `<select>`, for callers who want the OS-native picker instead of `Select`'s custom popover. This is a **standing non-port** (React/HTML only, alongside `Form`/`NavigationMenu`/`Combobox`): `Select` already wraps each native platform's own picker mechanism (Material3 `DropdownMenu`, SwiftUI `Menu`, Flutter `MenuAnchor`), so there's no further "more native" fallback to build there — see `/docs/contributing`.
  
  `Item` (a fifth candidate from the same gap list) was evaluated and deliberately skipped: its API is functionally near-identical to the existing `List`/`ListItem` (leading/title/description/trailing/disabled/onSelect), and shipping both would just create API confusion.

## 0.8.0

### Minor Changes

- 419ae12: Add `Empty`/`EmptyHeader`/`EmptyMedia`/`EmptyTitle`/`EmptyDescription`/`EmptyContent` — a composable placeholder for zero-results states (an empty table, an empty search, a fresh workspace). Second pick from the "missing components" gap flagged in the infra/design-system audit against shadcn/ui's current matrix. Ships on all four platforms per the four-platform rule: `KinetixEmpty` family on Jetpack Compose, SwiftUI, and Flutter too.
- 83830b2: Add `Kbd` and `KbdGroup` — a single keyboard key glyph, plus a wrapper for shortcut combos (`⌘` `K`). Fills the "missing components" gap flagged in the infra/design-system audit against shadcn/ui's current matrix. Ships on all four platforms per the four-platform rule: `KinetixKbd`/`KinetixKbdGroup` on Jetpack Compose, SwiftUI, and Flutter too.

## 0.7.0

### Minor Changes

- 7f19c38: Add `asChild` support to `Badge` and `Tag`, so both can render as a single wrapped element (e.g. `<Badge asChild><a href="/new">New</a></Badge>`) instead of always forcing a `<div>`/`<span>`. `Toggle` and `ToggleGroup` already supported `asChild` transparently via their underlying Radix primitives — no change needed there, just confirming for the record.
  
  `Tag`'s `onRemove` dismiss button still works with `asChild`: it nests inside the slotted element (Radix `Slot` can only render one root node). Avoid pairing `asChild` + `onRemove` with an `<a>` child specifically, since a nested `<button>` inside an anchor is invalid HTML.
- 7d1ef8f: Add three new DTCG token primitives — `duration`/`easing` (motion), `opacity`, and `z-index` — grounded in the values already hardcoded across the component library (`duration-200/300/500/1000`, `ease-linear`/`ease-in-out`, `opacity-0/50/70/100`, `z-[1]/z-10/z-20/z-40/z-50`), rather than invented from scratch. Compiled to `--duration-*`/`--easing-*`/`--opacity-*`/`--z-index-*` CSS custom properties, `KinetixMotion.swift`/`.kt`/`.dart` on the three native platforms, and new `packages/ui`'s `tailwind.config.ts` utilities (`duration-fast`, `ease-standard`, `opacity-disabled`, `z-overlay`, etc.) that every component that previously hardcoded these values now uses directly.
  
  A handful of pre-existing values that don't cleanly match a token step (`disabled:opacity-40` in `AudioPlayer`, `opacity-60` in `DropdownMenu`/`Select`, the `Calendar` nav buttons' resting `opacity-50`) are left as literals with a comment rather than silently normalized to the nearest token — that's a design call for later, not a rename.

## 0.6.5

No changes in this release.

## 0.6.4

### Patch Changes

- ea63e52: Upgrade the React platform to its latest supported toolchain: React 19, all Radix UI primitives, and the component library's other dependencies (recharts, react-day-picker, @tanstack/react-table, react-resizable-panels, zod, etc.) bumped to their current major releases.
  
  `Calendar`, `Chart`, `DataTable`, and `ResizablePanelGroup`/`ResizablePanel`/`ResizableHandle` were ported to the new APIs of `react-day-picker` v10, `recharts` v3, `@tanstack/react-table` v9, and `react-resizable-panels` v4 respectively — their own public props are unchanged, but anything reaching past them into the underlying library's DOM structure, class names, or data attributes (e.g. `.day-range-start`, `data-panel-group-direction`) should double check against the new libraries' output.

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

### Minor Changes

- fa72913: Add **AppBar** — a web application top bar.
  
  `AppBar` + `AppBarBrand` / `AppBarNav` / `AppBarLink` / `AppBarActions`: a sticky bordered header with a brand slot, a row of primary nav links (`active` marks the current one, `asChild` forwards to a framework `<Link>`), and a trailing actions slot. Below the `md` breakpoint the nav collapses behind a menu toggle into a panel under the bar. `useAppBar()` exposes the menu open state.
  
  `NavigationBar` remains the mobile back-button bar; `AppBar` is the desktop app shell. Registry / Storybook / docs entry included; native ports (SwiftUI / Compose / Flutter) to follow.

## 0.5.1

### Patch Changes

- bec7a0c: Security hardening.
  
  - **`@kinetixui/cli`** — validates the registry base URL (http/https only), every component / registry-dependency name, and every npm dependency spec before it reaches a fetch URL or the package manager, and refuses to write a file outside the project root. A hostile registry or a checked-in `kinetixui.json` can no longer steer where files land or what gets installed.
  - **`@kinetixui/ui`** — `chart.tsx` sanitises the identifiers and colour values it interpolates into its inline `<style>` (strips everything but `[\w-]` from identifiers; drops colour values carrying characters that could close the declaration, the rule, or the element).
  
  Published with npm provenance for the first time.

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

## 0.3.1

### Patch Changes

- 0c2b89c: Put `@kinetixui/cli`, `@kinetixui/tokens` and `@kinetixui/ui` on one shared version line (changesets `fixed` group). `@kinetixui/tokens` and `@kinetixui/ui` were realigned from 0.1.0 to match `@kinetixui/cli`; from here they always version and publish together.

## 0.1.0

### Minor Changes

- 07db4b3: Add 4 more components on the existing token contract:
  
  - **`AudioPlayer`** — native `<audio>` playback with a scrubber, `mm:ss` time
    labels, ±10s skip and prev/next callbacks. `variant="full" | "mini"`.
  - **`CircularProgress`** — ring progress indicator with an optional centre value.
  - **`Image`** — ratio-locked image (`1:1` / `3:2` / `4:3` / `3:4` / `3:1` /
    `16:9` presets or a number), muted loading placeholder, error fallback.
  - **`Inform`** — persistent, dismissible, intent-tinted inline notice with an
    optional CTA. `variant="information" | "warning" | "success" | "error" | "action"`.
- 3d87f1c: Add 10 more mobile-pattern components on the existing token contract:
  
  - **`Rating`** — star rating input / display, controlled or uncontrolled.
  - **`Spinner`** — lightweight loading indicator (`size`, `variant`).
  - **`List` / `ListItem`** — leading icon/avatar, title, description, trailing
    content; for mobile menus, settings screens, search results.
  - **`Stepper`** — numbered multi-step progress, `orientation="horizontal" |
    "vertical"`.
  - **`Fab`** / `fabVariants` — floating action button, circular or `extended`.
  - **`TabBar` / `TabBarItem`** — mobile bottom navigation, with an optional
    badge.
  - **`NavigationBar`** — mobile top app bar (back button, title, info text,
    actions).
  - **`FileUpload` / `FileUploadItem`** — drag-and-drop zone plus a file list
    (loading / uploaded / error states); upload logic stays the consumer's.
  - **`AvatarGroup`** — stacked avatars with a "+N" overflow marker.
  - **`DatePicker`** — promoted from a Popover+Calendar doc recipe to a real
    component, with `label` / `helperText` / `error` states.
- 3d87f1c: Add 6 more components on the existing token contract:
  
  - **`CodeBlock`** — code display with a copy button and, for more than one
    file, a tab strip.
  - **`Metric`** — stat / KPI display (label, value, trend indicator, optional
    chart or icon slot).
  - **`NumberInput`** — numeric field with increment / decrement controls.
  - **`Quote`** — blockquote with an optional attributed author.
  - **`Footer`** / `FooterColumn` / `FooterLink` / `FooterBottom` — page footer
    shell, columns of nav links plus a bottom bar.
  - **`TableOfContents`** — anchor-link nav list with indent levels and an
    active-item state.
- 1a727a7: First public release.
  
  - **@kinetixui/tokens** — the KinetixUI token contract: `--*` CSS variables
    (light + dark), `--shadow-*` / `--text-*` composites, a typed `tokens` object,
    and native text styles (`KinetixType.swift`, `KinetixType.kt`, `app_text.dart`).
  - **@kinetixui/ui** — 56 React components on the token contract (CVA + Radix +
    Tailwind), plus the `tailwind.config` preset. Also installable via the shadcn
    registry at `kinetixui.com/r/*.json`.
