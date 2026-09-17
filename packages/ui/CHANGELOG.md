# @kinetixui/ui

## 0.12.0

### Minor Changes

- d6939d5: Add `ColorPicker` — a saturation/value square, hue and (optional) alpha sliders, a hex field, swatches, and an eyedropper (where `window.EyeDropper` exists). The 2D square is hand-rolled (no Radix primitive for a 2D gesture); the hue and alpha rails reuse `@radix-ui/react-slider` directly, not the package's own `Slider` wrapper, whose track styling is fixed, for their keyboard and ARIA handling.
  
  Internal HSV state, not derived from the hex `value` prop on every render: saturation 0 or value 0 erase hue information (every hue produces the same RGB there), so re-deriving HSV from the emitted hex on every change would make the hue thumb jump to red the moment a drag crosses either edge. `value` only resyncs the internal state when it changes from something other than the component's own last emission — the standard fix for this class of controlled color-picker bug.
  
  Ships on all four platforms with the same feature set except the eyedropper, which is web-only: no native platform exposes a public "sample a pixel anywhere on screen" API. The HSV math is hand-rolled identically (formula-for-formula) across React/Compose/SwiftUI/Flutter, same rationale as `DiffViewer`'s LCS diff.
- 4460c33: Add `DataGrid` — the "product on its own" the `COMPONENT-ADDITIONS.md` Tier 3 entry called for: a row-virtualized grid (the same fixed-row-height windowing `VirtualList` uses) with column resize, drag-to-reorder, left/right pin, single-column sort, and double-click-to-edit cells. `DataTable` stays the `@tanstack/react-table`-backed option for a plain sortable/paginated table; reach for `DataGrid` once the row count or column-manipulation needs outgrow it. Rendered as ARIA `grid`/`row`/`columnheader`/`gridcell` divs rather than a real `<table>`, since sticky pinned columns and a sticky header row need that flexibility. Deliberately out of scope: column *virtualization* (rare enough at typical column counts not to be worth it) and multi-column sort.
  
  Ships on all four platforms. Column resize, drag-to-reorder, and column pin are web-only — none of Compose, SwiftUI, or Flutter have a touch-friendly drag-a-column-border gesture convention, and a sticky column needs a custom layout none of their scroll containers give for free. Native ports carry the three features that map directly onto each platform's own primitives instead: row virtualization (`LazyColumn`, a `LazyVStack` pinned-header `ScrollView`, `ListView.builder`), tap-to-sort headers, and tap-to-edit cells that commit on the keyboard's submit action rather than the web's blur-also-commits.
- 40b45ac: Add `DiffViewer` — a side-by-side (`split`) or inline (`unified`) text diff with gutter line numbers, over a hand-rolled LCS line diff. Fifth pick from the `COMPONENT-ADDITIONS.md` Tier 3 backlog, closing it out. Not built on a diff package: the algorithm needs to behave identically across all four platforms, and a ~30-line DP table is easier to keep in lockstep across React/Compose/SwiftUI/Flutter than four bindings to (or ports of) someone else's diff library. `split` mode doesn't pair adjacent remove/add runs onto the same row the way GitHub's split view does — each op renders in its own column, blank on the other side, a documented simplification over that extra alignment heuristic.
  
  Ships on all four platforms with the same feature set and the same LCS algorithm.
- 2f93583: Add `JsonViewer` — a collapsible, syntax-colored tree for arbitrary JSON data (API responses, registry payloads, token diffs), with a copy-to-clipboard button. Fourth pick from the `COMPONENT-ADDITIONS.md` Tier 3 backlog. Distinct from `TreeView`: this renders a *data structure* (object/array/primitive), not a caller-composed hierarchy of `TreeItem`s, so expand state is per-node uncontrolled rather than a lifted `expanded` prop. Value colors reuse the existing `--success`/`--info`/`--warning` semantic tokens rather than introducing a separate syntax-highlighting palette.
  
  Ships on all four platforms with the same feature set — unlike `DataGrid`, a recursive expand/collapse tree needs no gesture or layout primitive any platform lacks. SwiftUI's port introduces a small `KinetixJSONValue` recursive enum (Swift has no equivalent to TypeScript's `unknown` for this) with an ordered `.object([(String, KinetixJSONValue)])` case, since Swift dictionaries don't preserve key order; Compose and Flutter accept the ad-hoc `Map`/`List` shape their own JSON deserialization already produces.
- e3195a6: Add `KanbanBoard` — draggable cards across columns with keyboard DnD, built on `@dnd-kit`'s "multiple containers" sortable pattern. No DnD primitive existed in this package at all; hand-rolling accessible pointer/touch/keyboard drag-and-drop with collision detection and live reordering from scratch would take far longer than this component's own logic and likely be worse than a battle-tested library, so `@dnd-kit` is a new dependency.
  
  Uses a custom collision detection strategy (`pointerWithin` → `rectIntersection` fallback, re-scoped to `closestCenter` against just the hovered column's cards when the initial hit is the column itself) — this is dnd-kit's own documented fix for a specific multi-container gotcha: each column is both a `useDroppable` (so an empty column, or the space below its last card, is still a valid drop target) and wraps a `SortableContext`, and a column's rect is a strict superset of its cards' rects, so plain `closestCorners`/`closestCenter` alone almost always reports the column itself as the collision and item-level reordering never fires.
  
  A **seventh standing non-port** (documented at `/docs/contributing`): no equivalent dependency exists in the native packages, and hand-rolling accessible drag-and-drop from scratch on three more platforms is a far bigger lift than porting the component's own logic. Each platform reaches for its own idiomatic drag primitive instead (Compose drag gestures, SwiftUI `.draggable`/`.dropDestination`, Flutter `Draggable`/`DragTarget`).
- df37573: Add `MarkdownEditor` — a formatting toolbar over a plain text field (never `contenteditable`) with an optional rendered preview pane. Closes out the last item in the `COMPONENT-ADDITIONS.md` Tier 3 backlog. Shipped as "Markdown-mode" rather than a `contenteditable`-based WYSIWYG (Tiptap/Lexical): `contenteditable` has no native-platform analogue, which would have made this an eighth standing non-port. A markdown textarea is just a text buffer the toolbar inserts syntax into, so it ports cleanly to all four platforms instead.
  
  Includes a small hand-rolled Markdown → HTML/native-view renderer covering exactly the syntax the toolbar produces (headings, bold, italic, links, inline/block code, bullet/numbered lists, blockquotes, paragraphs) — not a full CommonMark implementation, kept dependency-free and ported identically across platforms rather than pulling in a markdown parser, the same reasoning as `DiffViewer`'s hand-rolled LCS diff.
  
  Ships on all four platforms. React, Compose, and Flutter insert/wrap syntax at the real cursor position (`selectionStart`/`TextFieldValue`/`TextEditingController.selection`); SwiftUI's `TextEditor` has no selection API before iOS 17, so its toolbar appends the snippet at the end of the text instead — a documented scope-down, not a silent one.
- bfa8d01: Add `MessageBubble`/`TypingIndicator` — a sent/received chat bubble with grouping, timestamp, and a status tick, plus an animated typing indicator. Last pick from the `COMPONENT-ADDITIONS.md` Tier 2 backlog — just the bubble primitive, not the broader "AI-chat kit" (Attachment/Bubble/Message Scroller/Questionnaire), which stays a separate roadmap decision. `grouped` reduces the outer top corner's radius as a lightweight consecutive-run cue — the caller already knows which messages are consecutive, so it stays a single boolean rather than the component inferring group position itself.
  
  Ships on all four platforms per the four-platform rule: `KinetixMessageBubble`/`KinetixTypingIndicator` on Jetpack Compose, SwiftUI, and Flutter too. Compose and Flutter reproduce the web's precise single-corner rounding for `grouped`; SwiftUI falls back to a uniform radius reduction instead, since `UnevenRoundedRectangle`'s exact OS-version floor couldn't be verified against this package's iOS 16.0 floor without a local toolchain — a documented, deliberate simplification.
- 34e6cd5: Add `MultiSelect` — a `Combobox` that keeps multiple `Tag` chips, with a `creatable` free-entry mode. Sixth pick from the `COMPONENT-ADDITIONS.md` Tier 2 backlog. Built directly on `Popover` + `Command` + `Tag` rather than staying a doc-only recipe like `Combobox`. The trigger is `role="combobox"` on a plain `div`, not a `<button>` — `Tag`'s own remove control is a real `<button>`, and a `<button>` can't nest inside a `<button>` (invalid HTML); using `PopoverAnchor` + manual open-state instead of `PopoverTrigger` avoids that while keeping the whole thing keyboard-operable.
  
  Ships on all four platforms per the four-platform rule: `KinetixMultiSelect` on Jetpack Compose, SwiftUI, and Flutter too, each built directly on that platform's own anchored-popover primitive with its own `Input`/`Tag` components — no new text-entry or chip mechanism. Filtering is a plain substring check on every native platform (the web version's search is driven by `cmdk`'s own filtering, which has no native equivalent to lean on). SwiftUI's chip row scrolls horizontally rather than wrapping to multiple lines — SwiftUI has no built-in flow layout the way Compose's `FlowRow` or Flutter's `Wrap` are, a documented simplification, not a silent one.
- 22bd801: Add `NotificationCenter`/`NotificationCenterTrigger`/`NotificationCenterContent`/`NotificationItem` — a bell trigger opening a popover list of read/unread items with a "mark all read" action. Fourth pick from the `COMPONENT-ADDITIONS.md` Tier 2 backlog. Built directly on `Popover` (re-exported as the root) rather than a new open-state mechanism; `NotificationItem` follows `ListItem`'s interactive-row convention. Read-state (`unread`/`unreadCount`/`onMarkAllRead`) stays the caller's, the same as every other controlled component in this library.
  
  Ships on all four platforms per the four-platform rule: `KinetixNotificationCenter` family on Jetpack Compose, SwiftUI, and Flutter too, each built on that platform's own anchored-popover primitive (`KinetixDropdownMenu`, `.popover`, `KinetixPopover`/`MenuAnchor`) rather than a hand-rolled overlay.
- 6bd3e7d: Add `Tour` — sequenced spotlight popovers over real elements (onboarding walkthroughs), with dismiss/skip/next. First pick from the `COMPONENT-ADDITIONS.md` Tier 3 backlog. `target` is a CSS selector resolved against the live DOM on every step change (and on resize/scroll, so the spotlight tracks a target that moves or resizes) rather than a ref, since steps are authored as plain data ahead of the elements existing. The spotlight itself is a single positioned `div` with a `box-shadow: 0 0 0 9999px` — a well-known CSS-only cutout technique, no SVG mask or second overlay layer needed. No focus trap: a tour narrates the page rather than blocking interaction with it.
  
  This is a sixth standing non-port (documented at `/docs/contributing`, alongside `Combobox`/`NativeSelect`): targeting an arbitrary already-rendered element by CSS selector has no native-platform equivalent — every native platform only offers opt-in position *reporting* (a target must wrap itself in a registry ahead of time via `Modifier.onGloballyPositioned`, a `PreferenceKey`, or a `GlobalKey`), a materially different API shape than "point a selector at any element." Reach for a sequence of `KinetixPopover`/`KinetixDropdownMenu` steps on native platforms instead, each anchored to the element it explains.
- 2e9f289: Add `TreeView`/`TreeItem` — nested expand/collapse rows with keyboard roving tabindex and optional checkboxes. Fifth pick from the `COMPONENT-ADDITIONS.md` Tier 2 backlog. Hand-rolled (Radix has no tree primitive to build on): `role="treeitem"` sits on each item's own container rather than a separate "row" element, so a nested item's `closest('[role="treeitem"]')` correctly walks up to its real ancestor; visible items are queried live from the DOM on every arrow-key press, since collapsed subtrees simply don't render — no separate registration bookkeeping needed to stay in sync with expand/collapse state. `checkable` checkboxes are independent per item — no automatic parent-selects-all-children / indeterminate propagation, a documented simplification, not a silent one.
  
  Ships on all four platforms per the four-platform rule: `KinetixTreeView`/`KinetixTreeNode` on Jetpack Compose, SwiftUI, and Flutter too — data-driven (a plain tree of nodes) rather than the React composition API, since recursion over a data structure is far simpler than threading state through arbitrarily-nested children on those platforms. The native ports are tap-to-expand/select only; the web version's keyboard roving-tabindex arrow-key navigation isn't ported, a documented scope-down since touch is the primary interaction model there.
- 3fd4b7a: Add `VirtualList` — a windowed-rendering primitive: only the rows visible in the scroll viewport (plus `overscan`) actually mount, so a list of thousands of items costs the same as rendering a couple dozen. Second pick from the `COMPONENT-ADDITIONS.md` Tier 3 backlog, and a prerequisite for a future `DataGrid` or any `Command`/`Combobox`/`Select` with a large option list. Web is fixed-row-height only — variable-height virtualization needs a per-row measurement pass, out of scope for this primitive (that's `@tanstack/react-virtual`'s job).
  
  Ships on all four platforms with no fixed-height limitation on native: Compose's `LazyColumn`, SwiftUI's `List`, and Flutter's `ListView.builder` each already only build the rows near the viewport, so these ports just wrap the platform's own windowing rather than porting the web's scrollTop/ResizeObserver math.

## 0.11.0

### Minor Changes

- 17062c4: Add `ComparisonSlider` — a drag handle wiping between two stacked layers (before/after image, a redesign preview). Second pick from the `COMPONENT-ADDITIONS.md` Tier 2 backlog. Built on Radix's `Slider` for the drag/keyboard/ARIA behavior (a plain 0–100 value), but fully custom-drawn — Radix's own `Range` fill can't be reused as the divider line since it's Radix's own inline `width` style, which would win over any Tailwind width class, so the line is a separate element positioned from the same value instead.
  
  Ships on all four platforms per the four-platform rule: `KinetixComparisonSlider` on Jetpack Compose, SwiftUI, and Flutter too, each using the same "duplicate the layers, clip one of them from the handle position" technique the web's CSS `clip-path` uses. The Compose and SwiftUI ports only support dragging the handle itself, not clicking anywhere on the track to jump (the web's Radix `Slider` supports both) — a documented scope-down, not a silent gap; Flutter's plain `GestureDetector` gets both for free.
- f591419: Add `Marquee` — an auto-scrolling horizontal ticker (logo strip, testimonials), pausing on hover and respecting `prefers-reduced-motion`. First pick from the `COMPONENT-ADDITIONS.md` Tier 2 backlog. Lifted out of the marketing site's `reveal.tsx` (which leaned on a hand-written `.kx-marquee-track`/`@keyframes marquee` in its own `globals.css` — not something a CLI-installed app would have) onto the shared Tailwind preset (`animate-marquee`, `motion-reduce:animate-none`) instead, so it's portable. Also fixes an accessibility bug found in the site version: both content copies were marked `aria-hidden`, hiding the whole marquee from screen readers — only the duplicate copy needed for the seamless loop is hidden here.
  
  Ships on all four platforms per the four-platform rule: `KinetixMarquee` on Jetpack Compose, SwiftUI, and Flutter too, each using the same "duplicate the content, measure it, translate by exactly one content-width in an infinite loop" technique (no CSS keyframe to lean on natively). `pauseOnHover` is web-only — hover isn't a primary mobile interaction, so the native ports don't carry it.
- 612b21c: Add `PageHeader` — title + optional breadcrumb + description + action cluster + optional tabs row, closed off with a bottom border. Third pick from the `COMPONENT-ADDITIONS.md` Tier 2 backlog, and the last S-effort item on it. `breadcrumb`/`actions`/`tabs` are plain slots — `PageHeader` doesn't re-implement `Breadcrumb`, `Button`, or `Tabs`, callers compose their own into it.
  
  Ships on all four platforms per the four-platform rule: `KinetixPageHeader` on Jetpack Compose, SwiftUI, and Flutter too, each with the same plain-slot shape and closed off with the platform's own `Separator`.

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
