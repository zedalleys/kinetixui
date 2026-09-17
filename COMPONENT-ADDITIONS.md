# KinetixUI — Additions Roadmap

What to add next: **components**, **chart types**, and **infographic modules**.
Written as a prioritised backlog — nothing here is built yet.

**Baseline:** 97 components shipped, 13 chart recipes on `/charts`, `/blocks`
compositions, `/infographic` is a "coming soon" preview.

**The four-platform rule** (`/docs/contributing`): a component isn't "done"
until it exists for React **and** has parity snippets / ports for SwiftUI,
Jetpack Compose and Flutter. Effort below is **React + registry + docs**; the
native ports are a roughly equal multiplier and are called out where a
component is hard to port (canvas, virtualization, contenteditable).

Effort: **S** ≈ ½–1 day · **M** ≈ 2–4 days · **L** ≈ a week+.

---

## 1. Components

### Tier 1 — real gaps, high use, cheap

| Component | What it is | Why (gap / precedent) | Effort |
|-----------|-----------|-----------------------|--------|
| ~~**Kbd**~~ | Inline `<kbd>` key cap, single or combo (`⌘ K`). | **Shipped** — `Kbd`/`KbdGroup`, all four platforms. | **S** |
| ~~**Empty State**~~ | Icon + title + body + action slot for "no data / no results". | **Shipped** — `Empty` family, all four platforms. | **S** |
| ~~**Description List**~~ | `<dl>` term/detail rows with a spec-sheet skin. | **Shipped** — `DescriptionList`/`DescriptionListItem`, all four platforms. `ComponentMeta` and the homepage's hand-rolled versions were left as-is (not migrated — out of scope). | **S** |
| ~~**Banner / Announcement**~~ | Full-bleed page-level notice (info/promo/maintenance), dismissible, optional `sticky`. | **Shipped** — `Banner`, all four platforms (`sticky` is web-only; natives document pinning by placement instead, same as `AppBar`). | **S** |
| ~~**Timeline**~~ | Ordered events down a rail — dot, connector, time, content; left / alternating. | **Shipped** — `Timeline`, all four platforms. Compose/SwiftUI reuse `Stepper`'s fixed-min-height connector simplification; Flutter's `IntrinsicHeight`+`Expanded` gets a genuine dynamic-stretch connector. | **M** |
| ~~**Stat / KPI**~~ | Label + big value + delta (▲ 12% vs prev) + optional sparkline. | **Correction, not a gap**: `Metric` already has `label`/`value`/`trend`/`change`/`icon`/`chart` (bring-your-own sparkline via the `chart` slot) on all four platforms — this row's original "single number with no trend/delta" claim was stale/wrong. No new component built. | **M** |
| ~~**Segmented Control**~~ | iOS-style single-select strip. | **Shipped** — `SegmentedControl`/`SegmentedControlItem`, a thin preset over `ToggleGroup type="single"` with `Tabs`' filled-track visual, all four platforms. | **S** (alias) |
| ~~**Avatar Group**~~ | Overlapping avatars + "+N" overflow. | **Shipped** — own gallery card + doc page at `/docs/components/avatar-group`; standing non-port on native (documented at `/docs/contributing`, same as `Combobox`). | **S** |

### Tier 2 — fills a category, moderate cost

| Component | What it is | Why | Effort |
|-----------|-----------|-----|--------|
| ~~**Tree View**~~ | Nested expand/collapse rows, keyboard roving tabindex, optional checkboxes. | **Shipped** — `TreeView`/`TreeItem`, all four platforms. Web has full keyboard roving-tabindex arrow-key navigation (hand-rolled, no Radix primitive to build on); native ports are tap-to-expand/select only, a documented scope-down since touch is primary there. Checkboxes are independent per node on every platform (no parent-selects-all-children propagation). | **M** |
| ~~**Multi-Select / Tags Input**~~ | `Combobox` that keeps multiple chips; free-entry token field variant. | **Shipped** — `MultiSelect`, all four platforms, with `creatable` for free-entry chips. Built directly on `Popover`+`Command`+`Tag` (web) / each platform's own popover+input+tag primitives (native) rather than staying a doc-only recipe like `Combobox`. | **M** |
| ~~**Notification Center**~~ | Bell trigger → popover list of read/unread items, "mark all read". | **Shipped** — `NotificationCenter`/`NotificationCenterTrigger`/`NotificationCenterContent`/`NotificationItem`, all four platforms, built directly on `Popover`. Read-state stays the caller's, same as every other controlled component here. | **M** |
| ~~**Comparison Slider**~~ | Drag handle wiping between two layers (before/after image). | **Shipped** — `ComparisonSlider`, all four platforms (built on Radix `Slider` for drag/keyboard/ARIA on web; native ports drag-gesture the handle directly, a documented scope-down from the web's click-anywhere-on-track). | **S** |
| ~~**Marquee**~~ | Auto-scrolling logo/testimonial strip, pauses on hover, motion-safe. | **Shipped** — `Marquee`, all four platforms. Ported off the site's hand-written CSS onto the shared Tailwind preset (`animate-marquee`) so a CLI-installed app gets it too; also fixed an accessibility bug in the site version (both content copies were `aria-hidden`, hiding the whole marquee from screen readers). | **S** |
| ~~**Chat / Message Bubble**~~ | Sent/received bubble, grouping, timestamp, status tick, typing indicator. | **Shipped** — `MessageBubble`/`TypingIndicator`, all four platforms. Just the bubble primitive, not the broader "AI-chat kit" (Attachment/Bubble/Message Scroller/Questionnaire) — that stays a separate roadmap decision. | **M** |
| ~~**Page Header**~~ | Title + breadcrumb + description + action cluster + optional tabs row. | **Shipped** — `PageHeader`, all four platforms. `breadcrumb`/`actions`/`tabs` are plain slots, not re-implementations of `Breadcrumb`/`Button`/`Tabs`. | **S** |

### Tier 3 — powerful, expensive, do when demanded

| Component | What it is | Why / cost note | Effort |
|-----------|-----------|-----------------|--------|
| ~~**Data Grid**~~ | Virtualized rows/cols, column resize/reorder/pin, sort, inline edit. | **Shipped** — `DataGrid`, all four platforms. Web has the full feature set (row-only virtualization — column virtualization stayed out of scope as rarely-needed); native ports are a documented scope-down (virtualized rows, tap-to-sort, tap-to-edit) — column resize/reorder/pin are web-only, since none of the three platforms have a touch-friendly drag-a-column-border convention or a sticky-column layout their scroll containers give for free. | **L** |
| ~~**Kanban Board**~~ | Draggable cards across columns, keyboard DnD. | **Shipped** — `KanbanBoard`, built on `@dnd-kit`'s "multiple containers" sortable pattern (pointer + touch + keyboard DnD, `closestCorners` collision detection, live cross-column reordering). A **seventh standing non-port** (documented at `/docs/contributing`): no equivalent dependency exists in the native packages, and hand-rolling accessible drag-and-drop from scratch on three more platforms is a far bigger lift than porting the component's own logic — each platform reaches for its own idiomatic drag primitive instead (Compose drag gestures, SwiftUI `.draggable`/`.dropDestination`, Flutter `Draggable`/`DragTarget`). | **L** |
| ~~**Rich Text / Markdown Editor**~~ | Toolbar + contenteditable (Tiptap/Lexical) or a Markdown textarea with preview. | **Shipped** — `MarkdownEditor`, all four platforms, in "Markdown-mode": a formatting toolbar over a plain text field (never `contenteditable` — that has no native analogue, which would've made this an eighth standing non-port). A small hand-rolled Markdown→HTML/native-view renderer covers exactly the syntax the toolbar produces (headings, bold, italic, links, inline/block code, lists, blockquotes) — not full CommonMark, ported identically across all four platforms rather than pulling in a parser dependency. React/Compose/Flutter insert/wrap syntax at the real cursor position (`selectionStart`/`TextFieldValue`/`TextEditingController.selection`); SwiftUI's `TextEditor` has no selection API before iOS 17, so its toolbar appends at the end of the text instead — a documented scope-down. | **L** |
| ~~**Color Picker**~~ | Saturation/value square, hue/alpha sliders, eyedropper, swatches. | **Shipped** — `ColorPicker`, all four platforms with the same feature set except the eyedropper (web-only — no native platform exposes a public "sample a pixel anywhere on screen" API the way the web's `EyeDropper` does). Internal HSV state, not derived from the hex `value` on every render/recomposition/rebuild: saturation 0 or value 0 erase hue information, so re-deriving it every time would make the hue thumb jump to red whenever a drag crosses either edge — `value` only resyncs the internal state when it changes from something other than the component's own last emission. | **M–L** |
| ~~**Tour / Coachmark**~~ | Sequenced spotlight popovers over real elements, dismiss/skip/next. | **Shipped** — `Tour`, a standing non-port (documented at `/docs/contributing`, same table as `Combobox`/`NativeSelect`): targeting an arbitrary already-rendered element by CSS selector has no native-platform equivalent — every native platform only offers opt-in position *reporting* (a target must wrap itself in a registry ahead of time), a materially different API shape than "point a selector at any element." | **M** |
| ~~**JSON Viewer**~~ | Collapsible JSON tree. | **Shipped** — `JsonViewer`, all four platforms with the same feature set (no native scope-down — a recursive expand/collapse tree needs no gesture or layout primitive any platform lacks, unlike `DataGrid`). Value colors reuse the existing `--success`/`--info`/`--warning` semantic tokens rather than a separate syntax palette. | **M** |
| ~~**Diff Viewer**~~ | Side-by-side / inline text diff with line markers. | **Shipped** — `DiffViewer`, all four platforms with the same feature set, over a hand-rolled LCS line diff (not a package — a ~30-line DP table is easier to keep behaviorally identical across four platforms than four bindings to someone else's diff library). `split` mode doesn't pair adjacent remove/add runs onto the same row the way GitHub's split view does — a documented simplification. | **M** |
| ~~**Virtualized List**~~ | Windowed rendering primitive (`react-virtual`). | **Shipped** — `VirtualList`, all four platforms. Web is fixed-row-height only (own scrollTop/ResizeObserver windowing math, no per-row measurement pass — that's `@tanstack/react-virtual`'s job); Compose (`LazyColumn`), SwiftUI (`List`), and Flutter (`ListView.builder`) each just wrap the platform's own already-windowed list, so none of the native ports carry the fixed-height restriction. | **M** |

### Also worth a doc page (already have the primitive)

- **Command Palette** — promote `Command` from a component demo to an
  app-level pattern page (global `⌘K`, route actions, recents) like the site's
  own `CommandMenu`.
- **Splitter** — `Resizable` covers it; add a "split view" recipe.
- **Stepper / Wizard** — `Stepper` exists; add a multi-step **form** wizard
  recipe wiring it to `Form`.

---

## 2. Charts

**Correction (this entry was stale — everything below was already built and
live on `/charts`, not a backlog):** `/charts` ships **37** recipes: the
original 13 core types (bar/line/area/composed/pie/donut/radial
bar/radar/scatter/step/sparkline, grouped/stacked/horizontal variants), all
12 requested new chart types below, two bonus types not on the original
list (**Bump / rank**, **Dumbbell**), and ~10 cross-cutting feature demos
(reference lines & bands, 100%-stacked area, brush + zoom, pattern fills,
number formatting, an 8-series stress test, loading/empty/error states, the
screen-reader data table, token-driven theming, and an interactive
mute/solo legend).

### New chart types (ranked by demand)

| Chart | Use | Note | Effort |
|-------|-----|------|--------|
| ~~**KPI / Stat tile row**~~ | Dashboard headline numbers + delta + mini-trend. | **Shipped** — "KPI tiles" on `/charts`. | **S** |
| ~~**Funnel**~~ | Conversion drop-off across stages. | **Shipped** — themed recipe over Recharts' `<Funnel>`. | **S** |
| ~~**Gauge / radial gauge**~~ | Single value against a range (score, utilisation). | **Shipped** — `RadialBarChart` + center label. | **S** |
| ~~**Heatmap / matrix**~~ | Value grid (cohort, correlation, activity by hour×day). | **Shipped** — SVG `<rect>` grid + sequential scale (no Recharts primitive for this one). | **M** |
| ~~**Calendar heatmap**~~ | GitHub-style contributions grid. | **Shipped** — pure CSS grid, 26 weeks × 7 days, no Recharts. | **M** |
| ~~**Treemap**~~ | Part-to-whole with nesting (bundle size, spend). | **Shipped** — themed `<Treemap>` + labels. | **S** |
| ~~**Waterfall**~~ | Running total up/down (P&L bridge). | **Shipped** — stacked bar with an invisible base series. | **M** |
| ~~**Bullet**~~ | Actual vs target vs qualitative bands — compact. | **Shipped** — hand-drawn SVG. | **S** |
| ~~**Histogram / density**~~ | Distribution of one variable. | **Shipped** — binning helper + bar chart. | **S** |
| ~~**Box plot**~~ | Distribution summary across groups. | **Shipped** — whisker bar + IQR box + median `Scatter` diamond on a `ComposedChart`. | **M** |
| ~~**Sankey**~~ | Flow between nodes (token flow, funnel with branches). | **Shipped** — themed `<Sankey>`. | **M** |
| ~~**Candlestick / OHLC**~~ | Financial ranges over time. | **Shipped** — custom bar shape. | **M** |

### Cross-cutting

| Item | Why | Sev if skipped |
|------|-----|----------------|
| ~~**`accessibilityLayer` on every chart + `role="img"` + `aria-label` summary + optional visually-hidden data `<table>`**~~ | Charts today are keyboard-inert and colour-only — fails WCAG 1.1.1 / 1.4.1 / 2.1.1. | **Shipped** — `ChartContainer` carries `role="img"`/`aria-label` (defaulting to `"Chart"`, override with `label`) and an optional `srTable` prop rendering a `sr-only` `<table>` of the underlying numbers; a `MutationObserver` also scrubs Recharts' own redundant per-element `role="img"` noise and names the `.recharts-surface`. `accessibilityLayer` is on every cartesian chart on `/charts`. See the "SR data table" recipe. | — |
| ~~**Loading / empty / error states for `ChartContainer`**~~ | Every real dashboard needs them. | **Shipped** — `state="loading" \| "empty" \| "error"` (+ `stateMessage`) renders a shimmer, a `role="status"` message, or a `role="alert"` message in place of the chart. See the "Loading / empty / error" recipe. | — |
| ~~**Reference lines & annotations**~~ | "Target", "launch date", threshold bands — extremely common ask. | **Shipped** — "Reference lines & bands" recipe. | — |
| ~~**Legend as toggle**~~ | Click a series to mute/solo it. | **Shipped** — "Interactive legend" recipe. | — |
| ~~**Brush / zoom** for dense time series~~ | Recharts `<Brush>` — one themed recipe. | **Shipped** — "Brush + zoom" recipe. | — |
| ~~**Pattern/texture fills** (not just hue)~~ | Colour-blind safety for stacked/categorical. | **Shipped** — "Pattern fills" recipe. | — |
| ~~**`isAnimationActive={false}` in every docs snippet**~~ | Recharts' mount animation causes below-the-fold charts to scroll into view. | **Shipped** — applied across all 80+ animatable chart elements; the last 3 gaps (the Box Plot and Dumbbell recipes' `Scatter` markers) were found and fixed in this pass. | — |

---

## 3. Infographic modules — for the `/infographic` page

The page lists 3 planned ideas. Turn it into a small set of self-contained
modules, each reading **live build data** where possible (token count, contrast
pass rate, per-platform component count, bundle size) rather than hand-typed
numbers.

| Module | What it shows | Data source | Effort |
|--------|---------------|-------------|--------|
| **Pipeline, to scale** *(preview exists)* | DTCG source → Style Dictionary → 5 platform outputs → components, sized by how much each hop changes. | build outputs | **M** (finish it) |
| **Token-flow Sankey** | One semantic token → the primitives it resolves to → the platform files it lands in. | `tokens/**` + `dist/**` | **M** |
| **Change-a-token explorer** *(interactive)* | Pick a semantic token; highlight the exact files, platforms and components a change touches. | static dependency map | **L** |
| **Platform coverage matrix** | Component × {React, SwiftUI, Compose, Flutter} grid with real ✓ / partial / — (SwiftUI 68, Flutter 68, Compose 1 native today). | port packages | **M** |
| **Build-stat counters** | Live: # tokens, # components, contrast pass %, gzip bundle size, a11y pairs checked. | `check-contrast` + build | **S** |
| **Architecture layer diagram** | primitives → semantic → component recipes → registry → CLI → your app. | static | **S** |
| **Release timeline** | Versions on a rail with headline changes (feeds from `CHANGELOG`). | `docs/changelog` | **S** |
| **Contrast grid** *(doubles as an a11y artifact)* | Every token pair, both themes, live ratio + AA/AAA badge — the visual form of `check-contrast.mjs`. | `check-contrast` logic in-browser | **M** |
| **"vs alternatives" table** | Honest capability matrix against shadcn/ui, Radix Themes, MUI — multi-platform, token pipeline, CLI. | static | **S** |

**Build order:** Build-stat counters + Architecture diagram + "vs alternatives"
(all **S**, ship the page) → finish Pipeline + Coverage matrix + Contrast grid →
Token-flow Sankey → Change-a-token explorer last.
