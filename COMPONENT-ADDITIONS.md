# KinetixUI — Additions Roadmap

What to add next: **components**, **chart types**, and **infographic modules**.
Written as a prioritised backlog — nothing here is built yet.

**Baseline:** 72 components shipped, 13 chart recipes on `/charts`, `/blocks`
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
| **Kbd** | Inline `<kbd>` key cap, single or combo (`⌘ K`). | Every doc/shortcut UI needs it; the site's own `CommandMenu` fakes it. shadcn, Radix Themes, Nextra, MUI all ship one. | **S** |
| **Empty State** | Icon + title + body + action slot for "no data / no results". | `/blocks` hand-rolls "No messages yet" twice; the new `/components` empty state is bespoke. Ant `Empty`, Chakra, Park UI, Atlassian. | **S** |
| **Description List** | `<dl>` term/detail rows with a spec-sheet skin. | `ComponentMeta` and several blocks re-implement it inline; matches the site's own visual language. | **S** |
| **Banner / Announcement** | Full-bleed page-level notice (info/promo/maintenance), dismissible, optional `sticky`. | Distinct from `Alert` (in-flow) and `Sonner` (transient). GitHub, Vercel, Ant `Alert banner`, Polaris `Banner`. | **S** |
| **Timeline** | Ordered events down a rail — dot, connector, time, content; left / alternating. | No way to show history/activity/changelog today. Ant, MUI Lab, Mantine, Primer. | **M** |
| **Stat / KPI** | Label + big value + delta (▲ 12% vs prev) + optional sparkline. | `Metric` exists but is a single number with no trend/delta. Tremor's core primitive; Ant `Statistic`. Pairs with §2 chart tiles. | **M** |
| **Segmented Control** | iOS-style single-select strip. | Functionally `ToggleGroup type="single"` — ship as a **thin documented preset** so people stop rebuilding it (the `/colors` format switch, `Showcase` tabs, etc.). | **S** (alias) |
| **Avatar Group** | Overlapping avatars + "+N" overflow. | Already in `component-meta`'s `PRIMITIVE` map and referenced by blocks, but **not in the gallery / registry**. Promote it. | **S** |

### Tier 2 — fills a category, moderate cost

| Component | What it is | Why | Effort |
|-----------|-----------|-----|--------|
| **Tree View** | Nested expand/collapse rows, keyboard roving tabindex, optional checkboxes. | Sidebar/file/nav trees have no primitive; `Sidebar` is flat. Radix has no tree; Base UI, MUI X, Ark UI, Spectrum do. | **M** |
| **Multi-Select / Tags Input** | `Combobox` that keeps multiple chips; free-entry token field variant. | `Combobox` is single-value; `Tag` is display-only. Very common form need. Downshift, Ark, Mantine, Ant `Select mode=multiple`. | **M** |
| **Notification Center** | Bell trigger → popover list of read/unread items, "mark all read". | Composable from `Popover` + `List` today but everyone rebuilds the read-state logic. Novu, Knock, Ant. | **M** |
| **Comparison Slider** | Drag handle wiping between two layers (before/after image). | Common marketing/media pattern; nothing close in the set. | **S** |
| **Marquee** | Auto-scrolling logo/testimonial strip, pauses on hover, motion-safe. | The CSS already lives in the marketing site's `globals.css` (`.kx-marquee-track`) — componentise it into the registry. | **S** |
| **Chat / Message Bubble** | Sent/received bubble, grouping, timestamp, status tick, typing indicator. | `/blocks` has a chat block but no reusable bubble. Growing need for AI UIs. | **M** |
| **Page Header** | Title + breadcrumb + description + action cluster + optional tabs row. | Every docs/app screen re-lays this out; `/blocks` "dashboard header" is a one-off. Polaris, Ant `PageHeader`, Primer. | **S** |

### Tier 3 — powerful, expensive, do when demanded

| Component | What it is | Why / cost note | Effort |
|-----------|-----------|-----------------|--------|
| **Data Grid** | Virtualized rows/cols, column resize/reorder/pin, sort, inline edit. | `DataTable` is TanStack-Table-light with no virtualization. This is a product on its own — native ports are hard. | **L** |
| **Kanban Board** | Draggable cards across columns, keyboard DnD. | No DnD primitive at all today. Consider adopting `@dnd-kit` and shipping `Sortable` first. | **L** |
| **Rich Text / Markdown Editor** | Toolbar + contenteditable (Tiptap/Lexical) or a Markdown textarea with preview. | `Textarea` only. `contenteditable` doesn't port to native — scope as web-only or Markdown-mode. | **L** |
| **Color Picker** | Saturation/value square, hue/alpha sliders, eyedropper, swatches. | `/theme-builder` hand-rolls parts of this. Canvas interaction — heavy native port. | **M–L** |
| **Tour / Coachmark** | Sequenced spotlight popovers over real elements, dismiss/skip/next. | Onboarding pattern; nothing today. Driver.js, Reactour, Shepherd. | **M** |
| **JSON / Tree Viewer** & **Diff Viewer** | Collapsible JSON; side-by-side / inline text diff with line markers. | Dev-tool surfaces (registry payloads, token diffs) — the site itself could use both. | **M** each |
| **Virtualized List** | Windowed rendering primitive (`react-virtual`). | Prerequisite for Data Grid / big `Command` / `Combobox` result sets. | **M** |

### Also worth a doc page (already have the primitive)

- **Command Palette** — promote `Command` from a component demo to an
  app-level pattern page (global `⌘K`, route actions, recents) like the site's
  own `CommandMenu`.
- **Splitter** — `Resizable` covers it; add a "split view" recipe.
- **Stepper / Wizard** — `Stepper` exists; add a multi-step **form** wizard
  recipe wiring it to `Form`.

---

## 2. Charts

`/charts` ships **13**: bar (grouped / stacked / horizontal), line, step, area,
sparkline, composed, pie, donut, radial bar, radar, scatter.

### New chart types (ranked by demand)

| Chart | Use | Note | Effort |
|-------|-----|------|--------|
| **KPI / Stat tile row** | Dashboard headline numbers + delta + mini-trend. | Not a "chart" but the #1 dashboard need; pairs with the **Stat** component (§1). Tremor leads here. | **S** |
| **Funnel** | Conversion drop-off across stages. | Recharts has `<Funnel>`; just a themed recipe. | **S** |
| **Gauge / radial gauge** | Single value against a range (score, utilisation). | Compose from `RadialBarChart` + center label. | **S** |
| **Heatmap / matrix** | Value grid (cohort, correlation, activity by hour×day). | No Recharts primitive — SVG `<rect>` grid + sequential scale. Needs a **sequential palette** (see `dataviz` skill). | **M** |
| **Calendar heatmap** | GitHub-style contributions grid. | Specialised heatmap; high recognition. | **M** |
| **Treemap** | Part-to-whole with nesting (bundle size, spend). | Recharts `<Treemap>` exists; theme + labels. | **S** |
| **Waterfall** | Running total up/down (P&L bridge). | Stacked bar with invisible base series + up/down colours. | **M** |
| **Bullet** | Actual vs target vs qualitative bands — compact. | Great in tables/KPI rows; hand-drawn SVG. | **S** |
| **Histogram / density** | Distribution of one variable. | Binning helper + bar chart. | **S** |
| **Box plot** | Distribution summary across groups. | Custom SVG shape layer on a Recharts cartesian grid. | **M** |
| **Sankey** | Flow between nodes (token flow, funnel with branches). | Recharts `<Sankey>` exists — also feeds `/infographic` §3. | **M** |
| **Candlestick / OHLC** | Financial ranges over time. | Custom bar shape; niche but expected in a "complete" set. | **M** |

### Cross-cutting (do these before adding more types)

| Item | Why | Sev if skipped |
|------|-----|----------------|
| **`accessibilityLayer` on every chart + `role="img"` + `aria-label` summary + optional visually-hidden data `<table>`** | Charts today are keyboard-inert and colour-only — fails WCAG 1.1.1 / 1.4.1 / 2.1.1. Ties to **B10** in the audit. | **Serious** |
| **Loading / empty / error states for `ChartContainer`** | Every real dashboard needs them; nothing exists. | Moderate |
| **Reference lines & annotations** | "Target", "launch date", threshold bands — extremely common ask. | Moderate |
| **Legend as toggle** | Click a series to mute/solo it. | Minor |
| **Brush / zoom** for dense time series | Recharts `<Brush>` — one themed recipe. | Minor |
| **Pattern/texture fills** (not just hue) | Colour-blind safety for stacked/categorical. | Moderate |
| **`isAnimationActive={false}` in every docs snippet** | Recharts' mount animation causes below-the-fold charts to scroll into view (already a noted gotcha for the gallery). | Minor |

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
