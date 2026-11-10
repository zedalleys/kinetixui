# CAT-1 — Catalogue architecture and UX quality audit

Audited `main` at `984792b3407f457b02c36c7583419a4dc9479560` (2026-10-18, after #404 and #407 merged).
Branch `claude/project-thread-jzj4z1`. CAT-1 is an audit and planning slice: it changes documentation, adds one
measurement script, and touches no production component, manifest, generator or analytics contract.

Companion documents:

- [`CAT-1-COMPONENT-INVENTORY.md`](CAT-1-COMPONENT-INVENTORY.md) — one row per catalogue entry (109).
- [`CAT-1-BLOCK-INVENTORY.md`](CAT-1-BLOCK-INVENTORY.md) — one row per block (21).
- [`../../UX-QUALITY-BACKLOG.md`](../../UX-QUALITY-BACKLOG.md) — CAT-BUG-001…016, durable across sessions.
- [`../roadmaps/CATALOGUE-QUALITY-ROADMAP.md`](../roadmaps/CATALOGUE-QUALITY-ROADMAP.md) — CAT-2…CAT-6.
- [`../../scripts/catalogue-preview-audit.mjs`](../../scripts/catalogue-preview-audit.mjs) — the instrument every
  number below comes from. It measures; it asserts nothing. Re-run it with
  `pnpm build:web`, `next start -p 3000`, then
  `PLAYWRIGHT_CHROMIUM_PATH=… node scripts/catalogue-preview-audit.mjs --out <dir>`.

## 1. Executive verdict

**The catalogue's data architecture is sound; its presentation layer is where the defects are.**

Nothing in this audit found an over-claim. Platform badges, evidence tiers, maturity and the non-port reasons are
all derived from canonical sources, and a cross-check of all 545 component/platform cells found **zero**
contradictions between `components.manifest.json` and `verification.json`. CAT-BUG-016 is **not reproducible as an
accuracy defect**.

What is wrong is narrower and real:

1. **One framing policy for 109 different shapes.** Gallery thumbnails live in a fixed 184px frame at a fixed
   `scale(0.72)`; detail previews live in a fixed `min-h-[350px]` stage. Measured in Chromium: **11 of 109**
   thumbnails have content clipped by that frame at 1280px (up to 92px per edge), **21 of 109** cover less than 5%
   of it, and a Toggle detail preview is **99% empty** with 314px of vertical slack. At 200% text the clipping
   count rises to **50–62 of 109**. One number cannot frame a Toggle and a Pass Card.
2. **Two hand-maintained category maps, already drifted.** `COMPONENT_CATEGORY` in `apps/web/src/lib/site.ts`
   (109 entries) and `GROUP` in `scripts/gen-stories.mjs` (107 entries) are copies of each other. They already
   disagree: `app-bar` and `direction-provider` are missing from the Storybook copy. Neither is generated, nothing
   compares them, and the site falls back to `"Data Display"` for an unknown slug, so a missing entry is silent.
3. **The card's meta slot carries two different dimensions.** `item.primitive ?? item.category` means **40** cards
   show a technology (`RADIX DIALOG`, `RECHARTS`, `VAUL`, 34 distinct strings) and **69** show a functional
   category, in the same pill, in the same position. CAT-BUG-012 confirmed.
4. **Blocks have no business-capability classification for 8 of 21.** The capability vocabulary already exists and
   is canonical (`docs/business-capabilities.json` → `discovery-index.json`), but `cta-banner`, `editor-toolbar`,
   `empty-state`, `onboarding-checklist`, `profile-form`, `settings-list`, `team-members` and `testimonial` map to
   no capability at all, so a capability-first /blocks today would leave 38% of the catalogue uncategorised.
5. **State coverage is undocumented rather than absent.** `Alert` implements four semantic statuses and shows them;
   `Chart` has a `state` prop taking `loading`, `empty` or `error` and demonstrates none of them; `DataTable` and `DataGrid`
   implement no data-state API at all. 68 of 109 components have one story export or fewer.

Grade: **B−**. The honesty infrastructure is better than the catalogue it describes.

## 2. Repository baseline and open PRs

| Item | State at audit time |
|---|---|
| `main` | `984792b` — "MX1b-1c — Switch Regression & Selection Motion Closure (#404)" |
| #404 React selection motion | **merged** (`984792b`) |
| #407 verification evidence tiers | **merged** (`6926d07`) |
| #408 BD-W5 adoption funnel | **open, draft** (head `8dcd945`, base `6926d07`) — not touched by CAT-1 |
| #409 M3.1 attribution hotfix | **open, draft** (head `eee2b25`) — not touched by CAT-1 |
| #348 version packages | open — not touched by CAT-1 |
| #325 IoT M4C-A harness | open — not touched by CAT-1 |

The brief's statement that #408 and #409 might be merged is **not** the case: both are open drafts.

## 3. Catalogue architecture as it stands

### 3.1 Canonical sources, and what is derived from them

| Field | Canonical source | Generated / derived into | Hand-maintained duplicate? |
|---|---|---|---|
| Entry existence, platforms, maturity, non-port reason | `components.manifest.json` → `components.<slug>` | `component-status.json`, `platform-parity.json`, `block-parity.json`, registry index, `platform-support.ts` counts | `componentDocs` in `site.ts` (109 titles + slugs, hand-listed) |
| Platform definitions, family, package, distribution | `components.manifest.json` → `platformDefinitions` | nav badges, platform chips, `/docs/platforms` | none |
| Evidence tier per platform | `verification.json` (`gen:verification`, ladder in `scripts/evidence-levels.mjs`) | component pages, `/use-cases`, evidence tables | none |
| Block existence, platform sources, structural category | `blocks.manifest.json` | `block-examples.generated.ts`, `/blocks` filters | none |
| Business capability, domain, workflow, layer | `docs/business-capabilities.json` → `discovery-index.json` (`gen:capabilities`) | `/capabilities`, catalogue business facets, Cmd-K | none |
| **Functional category** | **none — the map *is* the source** | — | **`COMPONENT_CATEGORY` (site.ts) and `GROUP` (gen-stories.mjs)** |
| **Implementation technology** | **none — `PRIMITIVE` in `component-registry.ts`** | card meta pill, `<ComponentMeta>` | single map, but it shares the card's category slot |
| Thumbnail choice | `THUMBNAIL_MOCKS` (26 slugs) + `demoRegistry` (109 demos) | /components cards | `NO_LIVE_THUMBNAIL` is now dead: every slug in it also has a mock, so no card renders the text-label fallback |
| Preview framing | `h-[184px]` + `scale-[0.72]` (cards), `min-h-[350px]` + `p-6 sm:p-10` (detail), `min-h-[280px]` + `p-8` (blocks), plus per-slug `PADDED` in `gen-stories.mjs` and per-block `contentClassName` | — | three independent framing policies |

**The single architectural finding:** functional category is the only catalogue dimension with no canonical home.
Everything else in the catalogue is generated and gated; the taxonomy is two literals in two languages.

### 3.2 Dependencies between cards and detail pages

The card reads `componentDocs` (title, href), `categoryOf` (site.ts map), `PRIMITIVE`, `STATUS`
(`component-status.json`), `platformsFor`/`platformStateFor` (manifest) and the demo registry. The detail page
reads the same manifest and status, plus `verification.json` and the generated per-platform snippets. Only the
category and technology maps are unshared with any generator, which is exactly where drift has happened.

### 3.3 What the filters already do well

/components has search, category, platform, beta and three business facets (capability, domain, layer) in the URL,
with counts, a live-region status line, removable active chips, a phone sheet, and `/components` kept canonical.
/blocks has search plus five facets as labelled selects with per-option counts, disabled zero-count options, an
actionable empty state and single-URL-per-state serialisation. **Filtering is not the problem**; the primary
taxonomies they filter on are.

Measured: no horizontal page overflow on /components at 320, 390, 768 or 1280, in light, dark, RTL, 200% text,
forced colors or reduced motion.

## 4. Proposed component taxonomy

The brief's eight categories were validated against all 109 entries. They work: every entry has exactly one
primary category, nothing is orphaned, and the smallest category holds 6.

| Proposed category | Count | Rule |
|---|---|---|
| Forms & Inputs | 29 | Collects a value from the user, or labels/structures the field that does |
| Data Display | 22 | Presents data the user reads rather than operates |
| Feedback & Status | 13 | Reports state, progress, outcome or guidance |
| Navigation | 13 | Moves the user between places or levels |
| Overlays | 10 | **Purpose is presenting arbitrary content above the page** |
| Layout & Structure | 9 | Arranges or contains other components; no content of its own |
| Actions & Controls | 7 | Performs or toggles an action |
| Media & Content | 6 | Presents authored media or editorial content |

Renames: `Form Inputs` → `Forms & Inputs`, `Controls & Actions` → `Actions & Controls`, `Feedback` →
`Feedback & Status`. `Foundations` is retired: it described how mature a component was, not what it does, and its
nine entries belong in five different functional homes.

25 entries change category. The full list is in the inventory; the reasoning for the contested ones:

| Entry | From → To | Why |
|---|---|---|
| `tour`, `notification-center` | Overlays → Feedback & Status | Overlays is for components whose *purpose* is floating arbitrary content. These two have their own content purpose and merely happen to float. |
| `pagination` | Actions & Controls → Navigation | It moves the reader between pages of a result set. |
| `skeleton`, `spinner` | Foundations → Feedback & Status | Both report a loading state; that is their only job. |
| `metric` | Feedback → Data Display | A KPI readout is data, not a status report. |
| `card`, `accordion`, `collapsible`, `scroll-area`, `resizable`, `separator`, `aspect-ratio`, `footer` | Data Display / Foundations → Layout & Structure | Each contains or arranges other content and has none of its own. |
| `kbd`, `code-block` | Foundations → Data Display | Both render a value for reading. |
| `comparison-slider` | Actions & Controls → Media & Content | Its subject is two images; the handle is the mechanism. |
| `direction-provider` | Foundations → Layout & Structure | A structural provider with no rendered UI. A one-item "Utilities" category would breach the brief's no-fragmentation rule; a `utility` secondary facet is the better answer. |

### 4.1 Technology is a separate dimension

`PRIMITIVE` is useful developer information — "this is Radix Dialog underneath" answers a real evaluation question
about accessibility inheritance and bundle cost. It is not a category. Recommendation:

1. **Detail pages: yes** (already there, via `<ComponentMeta>`).
2. **Gallery card: not in the category slot.** The card should show its functional category; technology moves to a
   quieter line or the detail page only.
3. **A technology filter: no, for now.** 40 of 109 entries have a technology, 34 distinct values, most with one
   member — a filter whose options are mostly single-item does not improve discovery. Revisit if a `headless base`
   grouping (Radix / cmdk / other / hand-built) proves useful; that grouping would also need a canonical home.

### 4.2 Component vs Block vs Pattern

Definitions used:

- **Component** — a reusable element with a general-purpose, prop-driven API, published from a platform package.
- **Block** — a composition of components solving a recognisable user task, published as copyable example source.
- **Pattern** — a documented approach with no published component of its own.

The repository already encodes "Pattern": `combobox` carries `platformNote: "not a component — a documented
composition of Command … in a Popover"`, and `platform-support.ts` derives `recipes` from that note, which is why
the site says "108 components and 1 documented recipe" rather than "109 components". That derivation is the hook a
`kind` field should formalise — not a new system.

The eleven entries the brief asked about:

| Entry | Verdict | Evidence |
|---|---|---|
| **Footer** | **Component — keep** | `packages/ui/src/components/footer.tsx` with a general API, implemented on all 5 platforms, evidence on all 5. Its *thumbnail* is a skeleton; that is CAT-BUG-006, not a classification problem. |
| **Message Bubble** | **Component — keep** | Own source, `status` and `variant` props, 5/5 platforms. A chat transcript built from it would be the block. |
| **Price Breakdown** | **Component — keep** | Own source, React-only by a recorded roadmap decision (`platformNote`, Phase 1). A general line-items/total API, not a composition of others. |
| **Pass Card** | **Component — keep** | Same shape as Price Breakdown: own source, React-only by recorded decision. |
| **Data Grid** | **Component — keep** | 792 lines of hand-built grid with its own keyboard, selection and copy model; nothing else composes it. |
| **Data Table** | **Component — keep** | Own source, 5/5 platforms. |
| **Form** | **Component — keep**, flag | Own source, React Hook Form + Radix, `standing non-port`. It is a provider/field-wiring API, not a composition. |
| **Address Fields** | **Component — keep**, flag | A composed field group: the consumer passes an ordered `fields` array, and the component supplies each field's `autocomplete` token, label, requiredness and `invalid` wiring (`address-fields.tsx:9-49`). Closest to the Block line of the eleven, since it composes Input/Select/Field around a recognisable task. Kept because the autocomplete and label mapping is API, not example code. Worth a `composed` secondary facet. |
| **Amount Display** | **Component — keep** | A currency/locale formatter with a display contract. |
| **Kanban Board** | **Component — keep** | `@dnd-kit`-based with an accessible multi-container drag model; `standing non-port` with a recorded reason. |
| **Chart** | **Component — keep** | Recharts wrapper with a token-bound theme and a `state` prop for loading, empty and error. |

**No entry moves from Components to Blocks in CAT-1.** Visual complexity drove the suspicion; API shape and
ownership do not support a move. Two entries (`address-fields`, `form`) deserve a `composed` facet so a reader can
see they are field groups rather than primitives, and `combobox` should be surfaced as a Pattern rather than
counted silently.

## 5. Proposed block taxonomy

Primary axis: **business capability, from the existing canonical vocabulary**, not a new list. Mapping all 21
blocks needs **two additions** to `docs/business-capabilities.json`, both justified by real blocks:

| Capability | Blocks | New? |
|---|---|---|
| Identity & security | `sign-in`, `create-account`, `account-security`, `onboarding-checklist` | existing |
| Data & analytics | `stat-cards`, `table-toolbar`, `filter-panel`, `dashboard-tabs` | existing |
| Transactions & money | `order-summary`, `receipt`, `pricing-tier` | existing |
| Application foundations | `alert-stack`, `loading-state`, `empty-state` | existing |
| **Account & settings** | `profile-form`, `settings-list`, `team-members` | **new** |
| **Content & marketing** | `cta-banner`, `testimonial` | **new** |
| Communication | `comment-box` | existing |
| Documents & files | `editor-toolbar` | existing |

No empty categories; the two single-member capabilities already exist for components (Communication has 1
component, Documents 1), so they are not fragmentation introduced here.

The brief's eight candidate labels map onto this: Authentication & Onboarding → Identity & security; Commerce &
Payments → Transactions & money; Data & Analytics → Data & analytics; Communication → Communication; Account &
Settings → **new**; Content & Publishing → **new** (Content & marketing); Scheduling & Booking and Operations &
Management would be **empty today** — the capabilities exist for components (`booking-scheduling`, `workflow`) but
no block implements them. They are a **gap**, recorded below, not a category to create.

Secondary facets, recommended:

- **Workflow** — already canonical; only `order-summary` and `receipt` carry one today.
- **Platform** — already there.
- **Industry** — expose only once more than a handful of blocks carry one. Today a defensible mapping covers five
  blocks (`receipt`: finance, commerce; `order-summary`: commerce; `pricing-tier`: saas; `account-security`: saas,
  enterprise; `stat-cards`: saas, healthcare, logistics). Below the threshold; keep it out of the UI for now.
- **Complexity** and **user role** — not recommended: neither has a canonical source, and both invite opinion.

`category` in `blocks.manifest.json` (Forms/Data/Application/Commerce/Feedback/Marketing) stays in the file and
`?cat=` keeps working, but should stop being the primary axis: "Application" holds 7 of 21 blocks and tells a
reader nothing about what task they solve.

### 5.1 Block catalogue gaps against useful workflows

Measured against the canonical workflows: **checkout** has blocks at 2 of 6 stages; **flight booking** has none;
`booking-scheduling` (5 components) and `workflow` (3 components) have **no block at all**. The most valuable
additions, in order: a checkout/payment step, a booking or time-slot step, and an approval/request step. Not
CAT-1's work — recorded so CAT-5 can propose them with evidence.

## 6. Owner-reported defects — investigation summary

Full entries, with reproduction steps and proposed fixes, are in
[`UX-QUALITY-BACKLOG.md`](../../UX-QUALITY-BACKLOG.md). Verdicts:

| ID | Subject | Verdict | Headline measurement |
|---|---|---|---|
| 001 | Toggle thumbnail nearly empty | **REPRODUCED** | ink 2.26% (3rd lowest of 109); content covers **1%** of the frame |
| 002 | Message Bubble clipped at top | **REPRODUCED at 200% text only** | 0px clipping at 320/390/768/1280 default; **100px top / 99px bottom** at 200% text |
| 003 | Price Breakdown clipped | **REPRODUCED** | 8px top / 7px bottom at 1280; 46px at 390; 237px at 200% text |
| 004 | Pass Card clips information | **REPRODUCED** | **85px top / 84px bottom** — the boarding-pass header and footer rows are cut |
| 005 | Data Grid cropped, hard to read | **REPRODUCED, different cause** | real clipping is only 9px; the grid sits in its own scroll container, so the card shows part of it with no scrollbar to say so, and every cell renders at **10.1px** after `scale(0.72)` |
| 006 | Footer thumbnail is skeleton bars | **REPRODUCED** | `FooterMock` draws 11 grey bars under 3 grey heading bars and renders **no text at all** (no text node was measurable in the frame) |
| 007 | Data Table thumbnail is skeleton bars | **REPRODUCED** | `TableMock` has three 12px header words and **9 grey bars** for the cells; `table` and `data-table` share the same mock — 0.50% of pixels differ |
| 008 | Dialog vs Alert Dialog not differentiated | **REPRODUCED** | **3.51%** of pixels differ. Four pairs are worse: popover/hover-card 0.40%, table/data-table 0.50%, dropdown/context-menu 0.65%, dialog/modal 2.21% |
| 009 | Input previews have excessive empty space | **REPRODUCED** | detail stage is `min-h-[350px]`: Input fills 7%, Toggle **1%** (314px slack), Label 2%, Button 1% |
| 010 | Preview/Code tabs touch the panel border | **REPRODUCED** | control inset is **1px** top and start — the panel's own border width. Its 12px radius sits inside the panel's 16px radius |
| 011 | Preview toolbar spacing inconsistent | **REPRODUCED** | one panel, three horizontal insets: **1px** (Preview/Code), **12px** (`px-3` environment toolbar), **24/40px** (`p-6 sm:p-10` stage) |
| 012 | Technology labels confused with categories | **REPRODUCED** | 40 cards show a technology and 69 a category in the same pill |
| 013 | Entries misclassified as Components | **NOT REPRODUCED** | all eleven investigated entries have their own source and a general API (§4.2) |
| 014 | Blocks lack business categorisation | **REPRODUCED** | 8 of 21 blocks map to no capability; the primary axis is structural |
| 015 | State examples and tags incomplete | **REPRODUCED, partly** | see §8 — `Chart` implements 3 data states and demonstrates 0; `DataTable`/`DataGrid` implement none; 68 of 109 have ≤1 story |
| 016 | Platform badges need verification | **NOT REPRODUCED** | 0 contradictions across 545 component/platform cells; 0 across 105 block cells. Real gap: badges show availability, not evidence tier or Angular's Preview maturity |

Two findings the owner did not report, both from the same root cause as 001–005:

- **200% text is where the frame fails at scale**: 50–62 of 109 thumbnails clip, against 10–12 at default text.
  `description-list` loses 602px, `result-state` 504px, `pass-card` 403px.
- **Thumbnail text is below legibility** on 41 of 109 cards (under 10px after the 0.72 scale), as low as **7.2px**
  (`tab-bar`, `description-list`). Inside scroll containers it is no better: `json-viewer`, `diff-viewer` and
  `kanban-board` render at **8.6px**, `calendar` at 9.3px, `data-grid` and `virtual-list` at 10.1px.

## 7. Preview and framing architecture

Three independent framing policies exist, none shared:

| Surface | Frame | Content policy |
|---|---|---|
| Gallery card | `h-[184px]`, `overflow-hidden`, dot grid, 56px bottom scrim, slug chip top-start | mock, or live demo at `scale(0.72)`, centred |
| Component detail | `min-h-[350px]`, `p-6 sm:p-10`, `items-center` (or `start`) | live demo at full scale |
| Block showcase | `min-h-[280px]`, `p-8`, `items-center`, per-block `contentClassName` | live block fixture at full scale |
| Storybook | per-slug `PADDED` set in `gen-stories.mjs` | the only surface that already admits per-entry framing |

**A shared preview contract is justified** — but as a small per-entry framing record, not a new abstraction:

```
previewFraming: { fit: "auto" | "fill" | "scale", scale?: number, align?: "center" | "start" | "end",
                  stage?: "narrow" | "default" | "wide", crop?: "none" | "top" | "bottom" }
```

Two things make this the right shape. It replaces four scattered policies with one canonical record (removing
duplication, per the brief's constraint), and it is per-entry, so a Toggle can declare `stage: "narrow"` while a
Pass Card declares `fit: "auto"`. Measured evidence that one number cannot serve: content heights behind the 184px
frame range from 26px (Toggle) to 491px (Pass Card) — a factor of 19.

Centred overflow is also worth fixing structurally: because content is centred in a fixed frame, a tall demo loses
an *equal slice from the top and the bottom* (Pass Card: 85 top / 84 bottom). Top-aligning a too-tall preview and
fading the bottom edge loses the footer only, which is almost always the less important half. That is a framing
decision, not hiding content: the card links to the full preview.

On the detail panel, the fix is a shared one, not a page-specific margin. The Preview/Code control is rendered as
a direct child of the panel with no padding; the panel is a `rounded-xl border` box. Giving the panel's control row
the same inset as the environment toolbar (`px-3 py-2` = 12px/8px, both multiples of 8 in the existing scale) makes
all three regions agree and keeps the control's 12px radius clear of the 16px panel corner. Measured, nothing else
is wrong with it: the control mirrors correctly in RTL (inline start 1px and inline end 563.3px, the same pair of
numbers as LTR), is unchanged under forced colors and reduced motion, and grows to 44px targets on touch.

## 8. State coverage

The brief's five dimensions map onto the repository as follows.

| Dimension | Canonical source today | State |
|---|---|---|
| Semantic status | per-component `cva` variants | real, but inconsistently demonstrated |
| Data state | per-component props (`loading`, `empty`, `error`, `state`) | exists on a handful; no vocabulary |
| Interaction state | `cva` `state` variants (Button, Input) plus CSS | partly documented; Storybook `States` stories where they exist |
| Environment | `PreviewEnvironment` (direction real, reduced motion reported, theme at page level) | honest by construction |
| Maturity / verification | `component-status.json`, `verification.json` | canonical, do not duplicate |

Findings, from the API surface rather than from tags (`cva` variant keys and declared props, cross-checked against
story exports and `page.mdx`):

- **68 of 109** components have one story export or fewer; 1 (`input-otp`) has none.
- `Alert` implements `destructive`/`success`/`warning`/`info` **and** shows all four — the pattern to copy.
- `Chart` has `state?: "loading" | "empty" | "error"` and `stateMessage`, with default copy for all three
  (`chart.tsx:42-43`, `122-124`), and demonstrates **none** of them: a developer evaluating whether KinetixUI
  handles an empty chart cannot find out from the catalogue.
- `DataTable` and `DataGrid` implement **no** data-state API. For these the honest label is **NOT IMPLEMENTED**,
  not "undocumented" — and the owner's expectation (populated / empty / loading / error on a table) is a product
  gap worth its own slice.
- `ResultState` is the best-covered entry: five statuses, demonstrated and documented.

Recommended vocabulary, with the five-value claim ladder the brief asks for — **SUPPORTED** (the API does it),
**TESTED** (a CI-executed test asserts it), **DOCUMENTED** (a doc page or story shows it), **NOT APPLICABLE**
(recorded with a reason), **NOT IMPLEMENTED**. Two rules keep it honest: a state is SUPPORTED only when a variant
key or prop exists, never because a tag or story title mentions it; and TESTED reuses the evidence-tier machinery
(`scripts/evidence-levels.mjs`) rather than computing a second verdict.

Discovery: state examples belong on the detail page as a **States section** generated from the declared states,
not as badges on gallery cards. The card already carries title, slug, status, meta pill and five platform tags;
adding state badges would bury what is there.

## 9. Metadata architecture recommendations

1. **Add `category` to `components.manifest.json`** as the canonical functional category, with the eight-value
   enum. Derive `COMPONENT_CATEGORY` and `gen-stories.mjs`'s `GROUP` from it; delete both literals. Add
   `check:manifest` validation: every entry has a category, every category is in the enum, no category is empty.
   Remove the silent `?? "Data Display"` fallback — an unknown slug should fail the gate, not land in a bucket.
2. **Add `kind: "component" | "recipe"`**, seeded from the existing `not a component` note derivation, so the
   recipe count stops depending on prose matching.
3. **Add `facets: ["composed" | "utility" | …]`** for the secondary dimensions (`address-fields`, `form`,
   `direction-provider`), optional and non-filtering at first.
4. **Keep technology in `PRIMITIVE`** but move it out of the card's category slot. One map, one meaning.
5. **Extend `docs/business-capabilities.json`** with `account-settings` and `content-marketing`, and map the 8
   unmapped blocks. Keep `blocks.manifest.json` `category` for URL compatibility.
6. **Add `previewFraming`** per entry (§7) as the one framing record, replacing the three ad-hoc policies.
7. **Do not** add a new metadata system, recompute verification, or duplicate maturity. Everything above hangs off
   files that already exist and already have generators and gates.

## 10. Marketing and funnel alignment

Against Discover → Evaluate → Choose platform → Install → Implement → Verify, the catalogue's friction sits in
**Evaluate**: a thumbnail that shows 1% of a component, 8px text, or a skeleton where a footer should be, is the
step where an evaluator decides whether this library looks finished. Nothing here changes QER, analytics
attribution, event definitions or the publication calendar, and no new events are proposed. If CAT-2…CAT-6 want
discovery metrics, they should be proposed separately with their measurement implications stated, per the brief.

Positioning is unaffected: this audit adds no parity claim, and its one accuracy finding (badges carry availability
but not evidence tier) is a case for saying *less* on a card, not more.

## 11. Evidence and its limits

What the numbers are: Chromium 1194 (headless), one machine, production build of `apps/web` at `984792b`, served
by `next start`. Viewports 320/390/768/1280; light, dark, RTL, 200% text (CDP `Page.setFontSizes`, standard 32),
forced colors and reduced motion. Geometry from `getBoundingClientRect`; clipping measured against the nearest
clipping ancestor; ink from decoded PNG screenshots of each thumbnail.

Re-measured 2026-10-19, after review found five defects in the measuring script itself (RTL insets taken from the
physical left edge, text under an `overflow` root skipped before the font measurement, the environment toolbar
selected as whatever wrapped the Preview/Code control, each `/blocks` showcase counted twice through an
ID-bearing ancestor, and cards screenshotted wherever Playwright's scroll left them, which can paint the sticky
filter bar into the frame). Three numbers in this document moved, all in the direction of the defects being
*worse* than first reported, and they are corrected above: `dropdown-menu`/`context-menu` 1.20% → **0.65%**,
`dialog`/`modal` 2.76% → **2.21%**, and the RTL control inset, which is 1px at the inline start exactly as in LTR
rather than the 563.3px the old probe printed. Everything else held: 21 showcases on /blocks (not 22), the
environment toolbar's own 12px/8px inset now reproducible rather than asserted, `footer` still with no measurable
text at all, and `table`'s three 12px header words now visible to the instrument that had been skipping them.

Limits, stated rather than papered over:

- **No screen-reader run.** Keyboard and name wiring were read from source and from the existing jsdom tests, not
  exercised with a screen reader.
- **Forced colors on one engine.** Chromium's forced-colors emulation is not Windows High Contrast.
- **200% text via CDP font sizes**, which is the repository's established method (`large-text.mjs`) but not
  identical to browser zoom; CAT-BUG-002 reproducing only in that mode should be read with that in mind.
- **Ink coverage is relative.** It includes the dot grid, the scrim and the slug chip, so it ranks cards; it is not
  an absolute measure of how much component is visible.
- **No committed baseline.** Every number here is a single run. CAT-6 is where the ones worth defending become
  thresholds with negative controls.
- **Not re-verified on the live site.** Measurements are of the local production build, not kinetixui.com.
- **State coverage is API-derived.** Variant keys and declared props were extracted by parsing, then spot-checked
  by reading `alert.tsx`, `chart.tsx`, `data-grid.tsx` and `data-table.tsx`. A component whose state lives in a
  sub-export may be under-counted; treat per-entry state rows as candidates, not verdicts.
- **No Codex review.** Codex's usage limit has been exhausted since 2026-10-17, so this audit carries a Claude
  self-review only.
