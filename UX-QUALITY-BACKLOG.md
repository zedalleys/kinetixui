# UX quality backlog

Durable record of catalogue and preview defects, opened by the CAT-1 audit
([`docs/audits/CAT-1-CATALOGUE-AUDIT.md`](docs/audits/CAT-1-CATALOGUE-AUDIT.md)). IDs are stable and are never
reused or renumbered. A later session or PR updates an entry's **Status** and **Evidence** in place; it does not
delete an entry, including one that could not be reproduced.

**Statuses:** `REPORTED` · `REPRODUCED` · `TRIAGED` · `IN PROGRESS` · `FIXED — UNVERIFIED` · `VERIFIED` ·
`NOT REPRODUCIBLE` · `DEFERRED`.

`VERIFIED` requires the entry's own regression check to have passed. A fix that looks right in a screenshot is
`FIXED — UNVERIFIED`.

**CAT-QF (2026-10-19):** CAT-BUG-006, 007, 008, 010 and 012 were fixed in the quick-fix slice and are
`VERIFIED` below. Their post-fix numbers were taken on `main` `a7127c8` plus that branch, production build of
`apps/web`, same Chromium, via `node scripts/catalogue-qf-evidence.mjs --out <dir>`. Every other entry's
evidence is still the CAT-1 run and has not been re-measured.

**CAT-2 (2026-10-19):** CAT-BUG-019 is fixed in the taxonomy slice and is `VERIFIED` below; CAT-BUG-016's
regression requirement (keep the manifest/evidence cross-check as a gate) is now met, and CAT-BUG-013's
`kind`/facet work has landed. Those numbers were taken on CAT-QF's branch plus the CAT-2 branch, production
build of `apps/web`, same Chromium, via `node scripts/catalogue-taxonomy-evidence.mjs --out <dir>`, plus
`pnpm check:manifest`, `pnpm check:manifest-controls` and the test suite. The taxonomy itself is recorded
per entry in [`docs/audits/CAT-2-TAXONOMY-VALIDATION.md`](docs/audits/CAT-2-TAXONOMY-VALIDATION.md).

**Measurement baseline for every entry below:** `main` `984792b`, production build of `apps/web`, Chromium 1194
headless, viewports 320/390/768/1280, light / dark / RTL / 200% text / forced colors / reduced motion, via
`PLAYWRIGHT_CHROMIUM_PATH=… node scripts/catalogue-preview-audit.mjs --out <dir>`. Limits are in audit §11; the
main ones are: no screen-reader run, forced colors on Chromium only, 200% text by CDP font sizes rather than
browser zoom, and no committed baseline — every number is one run.

## Summary

| ID | Title | Surface | Severity | Status | Slice |
|---|---|---|---|---|---|
| CAT-BUG-001 | Toggle thumbnail is almost empty | /components card | High | REPRODUCED | CAT-3 |
| CAT-BUG-002 | Message Bubble thumbnail clipped at the top | /components card | Medium | REPRODUCED (200% text only) | CAT-3 |
| CAT-BUG-003 | Price Breakdown thumbnail clipped | /components card | High | REPRODUCED | CAT-3 |
| CAT-BUG-004 | Pass Card thumbnail clips its header and footer | /components card | High | REPRODUCED | CAT-3 |
| CAT-BUG-005 | Data Grid thumbnail is unreadable, not cropped | /components card | Medium | REPRODUCED | CAT-3 |
| CAT-BUG-006 | Footer thumbnail is grey bars with no text | /components card | High | VERIFIED | CAT-QF |
| CAT-BUG-007 | Data Table thumbnail is grey bars, shared with Table | /components card | High | VERIFIED | CAT-QF |
| CAT-BUG-008 | Dialog and Alert Dialog thumbnails are the same picture | /components card | Medium | VERIFIED | CAT-QF |
| CAT-BUG-009 | Detail previews are mostly empty space | component detail | High | REPRODUCED | CAT-4 |
| CAT-BUG-010 | Preview/Code control sits 1px from the panel border | component detail | Medium | VERIFIED | CAT-QF |
| CAT-BUG-011 | Three different insets inside one preview panel | component detail | Medium | REPRODUCED | CAT-4 |
| CAT-BUG-012 | Technology and category share one pill | /components card | High | VERIFIED | CAT-QF |
| CAT-BUG-013 | Entries possibly misclassified as Components | taxonomy | Low | NOT REPRODUCIBLE (kind/facets landed) | CAT-2 |
| CAT-BUG-014 | Blocks have no business-capability axis | /blocks | High | REPRODUCED | CAT-5 |
| CAT-BUG-015 | State coverage is inconsistent and undocumented | component detail, stories | High | REPRODUCED (partly) | CAT-4 |
| CAT-BUG-016 | Platform badges need verifying against evidence | /components card | Low | NOT REPRODUCIBLE (as accuracy; cross-check now gated) | CAT-2 |
| CAT-BUG-017 | 200% text clips half the thumbnails | /components card | High | REPRODUCED | CAT-3 |
| CAT-BUG-018 | Thumbnail text is below legible size | /components card | Medium | REPRODUCED | CAT-3 |
| CAT-BUG-019 | Two hand-maintained category maps have drifted | canonical data | High | VERIFIED | CAT-2 |
| CAT-BUG-020 | Block showcases waste most of their width | /blocks | Low | REPRODUCED | CAT-5 |
| CAT-BUG-021 | A retired category in a shared link reads as an empty category | /components?cat= | High | REPRODUCED | CAT-3 |
| CAT-BUG-022 | Category labels are search terms, so 26 entries changed what they match | /components search | Medium | REPRODUCED | CAT-3 |
| CAT-BUG-023 | `composed` and `utility` are recorded but never rendered | taxonomy, /components card | Low | REPRODUCED | CAT-3 |

017–020 were found while investigating the owner's reports and share their root causes. 021–023 are the
discovery gaps CAT-2 leaves behind, carried here at the owner's instruction on 2026-10-22 rather than left in
a pull request description: a green build is not evidence that these journeys work.

---

## CAT-BUG-001 — Toggle thumbnail is almost empty

- **Surface:** `/components`, card `toggle`. `apps/web/src/components/component-gallery.tsx` `Thumbnail`.
- **Description:** The card shows a live `Toggle` demo — a 36×36px square control — centred in a 392×184px frame
  at `scale(0.72)`, so roughly 26×26 rendered pixels of component in 72,000px² of frame.
- **Reproduction:** open `/components` at 1280px, find the Toggle card.
- **Evidence:** ink coverage **2.26%**, third lowest of 109; content box covers **1%** of the frame. 21 of 109
  cards are under 5% (`kbd`, `label`, `spinner`, `checkbox`, `native-select`, `number-input`, `rating`, `slider`,
  `switch`, `button`, `button-group`, `toggle`, `toggle-group`, `breadcrumb`, `navigation-menu`,
  `notification-center`, `progress`, `sonner`, `avatar`, `avatar-group`, `marquee`).
- **Root cause:** one framing policy for every entry — a fixed 184px frame and a fixed 0.72 scale. A small control
  has no way to say it needs a narrower stage or a different scale.
- **User impact:** an evaluator scanning the gallery cannot tell what the component is, and the page reads as
  unfinished — at the Evaluate step of the funnel.
- **Proposed fix:** a per-entry `previewFraming` record (audit §7) so small controls declare a narrow stage, and a
  demo that shows the control *in context* (a labelled row, two states) rather than one bare control.
- **Regression requirement:** a gate asserting minimum ink coverage and minimum content-to-frame fill per card,
  with per-entry allowances only where recorded with a reason.
- **Verification requirement:** rendered measurement in Chromium at 1280 and 390, light and dark.
- **Status:** REPRODUCED · **Slice:** CAT-3

## CAT-BUG-002 — Message Bubble thumbnail clipped at the top

- **Surface:** `/components`, card `message-bubble`.
- **Description:** the owner reports the top of the bubble group cut off.
- **Reproduction:** open `/components` at 200% text (or an equivalent font-size increase) and find the card.
- **Evidence:** **0px** clipping at 320, 390, 768 and 1280 in light, dark and RTL at default text. At 200% text:
  **100px top, 99px bottom**. Content fills 52% of the frame at default text; smallest text 7.9px.
- **Root cause:** the same fixed 184px frame. Because content is centred, anything taller than the frame loses an
  equal slice top and bottom; raising the text size pushes most demos past it.
- **User impact:** at default settings the preview is intact but small; for a reader with larger text the bubble's
  first message is gone.
- **Proposed fix:** as CAT-BUG-017 — the frame must respond to content height, and a too-tall preview should be
  top-aligned and faded rather than centre-cropped.
- **Regression requirement:** the clipping gate run at 200% text as well as default.
- **Verification requirement:** rendered measurement at 200% text. Note the limit: CDP font sizes, not browser
  zoom, so the owner's exact conditions may differ — keep this entry open until they confirm.
- **Status:** REPRODUCED (200% text only; not reproducible at default text in Chromium) · **Slice:** CAT-3

## CAT-BUG-003 — Price Breakdown thumbnail clipped

- **Surface:** `/components`, card `price-breakdown`.
- **Evidence:** clipped **8px top / 7px bottom** at 1280 and 768; **46px / 45px** at 390 and 320; **237px / 236px**
  at 200% text. The deepest clipped element is the `<dd>` holding the total (`€120.00`) — the one line a price
  breakdown exists to show. Content fills 72% of the frame; smallest text 8.6px.
- **Root cause:** fixed frame height, centred content (CAT-BUG-017).
- **User impact:** the total is the component's point and is the part cut.
- **Proposed fix:** per-entry framing; for this entry a taller stage or a scale that fits the whole table.
- **Regression requirement:** per-card clipping gate, including the narrow viewports where it is worst.
- **Verification requirement:** rendered measurement at all four viewports.
- **Status:** REPRODUCED · **Slice:** CAT-3

## CAT-BUG-004 — Pass Card thumbnail clips its header and footer

- **Surface:** `/components`, card `pass-card`.
- **Evidence:** clipped **85px top / 84px bottom** at 768 and 1280, **159px / 158px** at 320, **403px / 402px** at
  200% text. The clipped element is the `<article>` whose first line is "Boarding pass". Content box is 127% of
  the frame area.
- **Root cause:** the demo is 491px tall against a 184px frame — a 2.7× overflow that no single scale absorbs.
- **User impact:** the component is a pass; the card shows its middle and cuts both ends.
- **Proposed fix:** `fit: "auto"` framing for tall entries (scale to fit rather than crop), or a dedicated mock
  that shows a whole pass at card size.
- **Regression requirement:** per-card clipping gate.
- **Verification requirement:** rendered measurement, and a check that the chosen fit keeps text at or above the
  legibility floor set in CAT-BUG-018.
- **Status:** REPRODUCED · **Slice:** CAT-3

## CAT-BUG-005 — Data Grid thumbnail is unreadable, not cropped

- **Surface:** `/components`, card `data-grid`.
- **Description:** the owner reports it cropped and hard to read. The cropping is minor; the unreadability is real.
- **Evidence:** real clipping by the frame is **9px top / 8px bottom**. The large overflow a naive measurement
  reports (57,000px) is the grid's own virtualisation spacer *inside its scroll container* and is not clipped by
  the card. Every cell renders at **10.1px** after the 0.72 scale, and the card shows part of a scrollable grid
  with no scrollbar to indicate it.
- **Root cause:** two separate ones — the global 0.72 scale (readability) and a scrollable component previewed in
  a frame that cannot scroll (truthfulness).
- **User impact:** the card implies the grid is four rows tall and the text is unreadable at card size.
- **Proposed fix:** a purpose-built mock or a `fit`/`crop` framing that shows a header plus three rows at full
  size, honestly cropped at a row boundary rather than mid-row.
- **Regression requirement:** minimum rendered text size per card; a check that no preview renders a partially
  visible scroll container without a visible affordance.
- **Verification requirement:** rendered text-size measurement including elements inside scroll containers.
- **Status:** REPRODUCED · **Slice:** CAT-3

## CAT-BUG-006 — Footer thumbnail is grey bars with no text

- **Surface:** `/components`, card `footer`. `FooterMock` in `apps/web/src/components/component-thumbnails.tsx`.
- **Evidence (CAT-1, before):** the mock drew 11 grey `Bar` divs under 3 grey heading bars. No text node was
  measurable inside the frame — `minFont: null`, 20 measured nodes, none of them text. Ink 7.86%, fill 20%.
- **Root cause:** `footer` is in `NO_LIVE_THUMBNAIL` (its demo renders real `<a href>` elements, which would nest
  an anchor inside the card's own link and break hydration), so a mock was written; the mock was drawn as a
  skeleton. That hydration constraint is real and is preserved by the fix.
- **User impact:** the card for a shipped, 5-platform component looked like a loading placeholder.
- **Fix (CAT-QF):** the mock now draws a brand line, three named link columns (Product · Docs · Company with two
  entries each) and a legal row — all plain `<p>`/`<span>`, no anchors, no headings.
- **Regression:** `component-gallery.test.tsx` → "footer renders readable content, not a skeleton" asserts the
  words and at least four text nodes, alongside the existing "nothing focusable, no heading" contract test.
  Negative control: reverting `component-thumbnails.tsx` fails that test (confirmed 2026-10-19).
- **Verification:** rendered measurement, `scripts/catalogue-qf-evidence.mjs` — **12 text nodes**, smallest text
  **12px** at 1280 and 390, light and dark, RTL, and 24px at 200% text. The smallest text in the frame is now
  above the 10px legibility floor the audit used.
- **Status:** VERIFIED · **Slice:** CAT-QF

## CAT-BUG-007 — Data Table thumbnail is grey bars, shared with Table

- **Surface:** `/components`, cards `data-table` and `table`. `TableMock`.
- **Evidence (CAT-1, before):** the mock rendered three 12px header words and **9 grey bars** as cells; `table`
  and `data-table` rendered the same mock, **0.50%** of pixels differing between the two screenshots.
- **Root cause:** one mock reused for two components, drawn as a skeleton.
- **User impact:** neither card showed what the component displays, and two different components were
  indistinguishable in the gallery.
- **Fix (CAT-QF):** `TableMock` now renders real cells (names, statuses, roles). `data-table` has its own
  `DataTableMock` showing what it adds over a plain table: a sorted column, row selection with a drawn tick, and
  a pagination row. The tick is drawn from borders rather than typed, because a glyph small enough for the box
  rendered at 7px.
- **Regression:** `component-gallery.test.tsx` → "table/data-table renders readable content, not a skeleton" and
  "tables are told apart by structure, not by wording", which compares the two mocks' markup with every text node
  removed, so a difference of copy alone fails. Negative control: reverting the file fails both (2026-10-19).
- **Verification:** rendered — `table` 12 text nodes at 12px, `data-table` 12 at 11px; pairwise difference
  **10.83%** light, **11.64%** dark (was 0.50%).
- **Status:** VERIFIED · **Slice:** CAT-QF

## CAT-BUG-008 — Dialog and Alert Dialog thumbnails are the same picture

- **Surface:** `/components`, cards `dialog`, `modal`, `alert-dialog`, and the same defect in `popover`/
  `hover-card` and `dropdown-menu`/`context-menu`/`menubar`.
- **Evidence (CAT-1, before):** `dialog` vs `alert-dialog` **3.51%** of pixels differed; `dialog` vs `modal`
  2.21%; `dropdown-menu` vs `context-menu` **0.65%**; `popover` vs `hover-card` **0.40%**. All of them rendered
  one shared mock parameterised by copy. The last two figures were first published as 1.20% and 2.76%; review
  found that `catalogue-preview-audit.mjs` screenshotted cards wherever Playwright's scroll left them, so the
  sticky filter bar covered one card of a pair and not the other and invented a difference. Re-measured on a
  rebuilt pre-CAT-QF baseline with the corrected script, both pairs were closer to one picture than reported.
- **Root cause:** shared mocks parameterised by wording rather than by what actually differs between the
  components.
- **User impact:** the gallery could not be scanned; the cards did not teach which component to pick.
- **Fix (CAT-QF):** each mock now draws the structure its component has, read off the component source —
  Dialog a scrim and a free card with a corner close; Modal header + close · divider · body · divider ·
  right-aligned footer; Alert Dialog no close affordance at all and a destructive confirm; Popover an anchored
  surface with an arrow and fields to operate; Hover Card a reference and a read-only profile preview; Dropdown
  Menu its trigger button; Context Menu a pointer at the origin; Menubar a bar of top-level menus.
- **Regression:** `component-gallery.test.tsx` → "<family> are told apart by structure, not by wording" for the
  dialog family, the floating cards, the menus, the tables and the side surfaces. It strips every text node
  before comparing, so two mocks that differ only in copy collapse to one string and fail; it carries a negative
  control proving the comparison detects sameness. Negative control: reverting the file fails four of the five
  families (2026-10-19). The pixel-difference gate with recorded exceptions remains CAT-6's.
- **Verification:** rendered pairwise difference over the whole 393×184 frame, light and dark:
  dialog/modal 10.99% / 10.71%, dialog/alert-dialog 10.93% / 11.53%, modal/alert-dialog 12.38% / 12.90%,
  popover/hover-card 7.19% / 9.70%, dropdown/context 5.91% / 9.77%, dropdown/menubar 6.69% / 12.39%,
  context/menubar 6.37% / 7.51%. Most of that frame is empty dot grid, so these are large differences in the
  drawn area; the lowest pair is now above the previously accepted `sheet`/`drawer` baseline of 7.85% in dark and
  just under it in light.
- **Status:** VERIFIED · **Slice:** CAT-QF

## CAT-BUG-009 — Detail previews are mostly empty space

- **Surface:** every component detail page. `PreviewEnvironment` in
  `apps/web/src/components/preview-environment.tsx` (`flex min-h-[350px] w-full … p-6 sm:p-10`).
- **Evidence** (stage 702×350 at 1280px): Toggle demo 36×36 → **99% empty, 314px of vertical slack**; Button 73×40
  → 99%, 310px; Label 218×18 → 98%, 332px; Number Input 128×46 → 98%, 304px; Input 384×46 → 93%, 304px; Switch
  153×24 → 99%, 326px. At 320px the slack is unchanged.
- **Root cause:** a single `min-h-[350px]` for every component, chosen so that tall previews do not jump; small
  controls inherit it.
- **User impact:** the page a developer lands on from search shows a field floating in a tall empty box; it costs
  a screenful of scroll on a phone for every component.
- **Proposed fix:** per-entry stage height from the same `previewFraming` record as the cards — a `compact` stage
  (around 160px) for single controls, the current height for compositions. Not a per-page margin override.
- **Regression requirement:** a gate on the ratio of demo height to stage height, per entry, with recorded
  exceptions.
- **Verification requirement:** rendered measurement at 1280 and 390, including 200% text (where the current stage
  is justified).
- **Status:** REPRODUCED · **Slice:** CAT-4

## CAT-BUG-010 — Preview/Code control sits 1px from the panel border

- **Surface:** every component detail page. `ComponentPreview` in `apps/web/src/components/component-preview.tsx`.
- **Evidence (CAT-1, before):** control inset **top 1.0px, start 1.0px** from the panel box at 1280, 390 and 320
  — the panel's own border width. The control's radius is 12px inside the panel's 16px corner.
- **Root cause:** the `SegmentedControl` was a direct child of the `rounded-xl border` panel, with no padding on
  the panel's first row.
- **User impact:** the panel read as misassembled, on the surface where an evaluator judges polish.
- **Fix (CAT-QF):** the control sits in a row of its own carrying `px-3 py-2` — the inset the environment
  toolbar directly below already uses, so the two controls now share a start edge. No new pixel value, no
  page-specific override, and the fix is in the shared component rather than on any page.
- **Regression:** `component-preview.test.tsx` → "insets the Preview/Code control instead of sitting it on the
  panel border" asserts the control is not a direct child of the panel and that its row carries both insets,
  with a negative control that the panel itself still carries no padding. Negative control: reverting
  `component-preview.tsx` fails that test (confirmed 2026-10-19). The measured-inset gate in LTR and RTL remains
  CAT-6's, since jsdom has no layout.
- **Verification:** rendered measurement — **top 9.0px, start 13.0px** (8px and 12px plus the panel's 1px
  border) at 1280 light, 1280 dark, 1280 RTL, 768, 390, 390 RTL and 320, and 17/25px at 200% text where the
  padding scales with the root font size. RTL mirrors: the start inset is measured from the panel's right edge
  and is the same 13.0px.
- **Status:** VERIFIED · **Slice:** CAT-QF

## CAT-BUG-011 — Three different insets inside one preview panel

- **Surface:** component detail preview panel.
- **Evidence:** in one panel — Preview/Code control **1px**; environment toolbar `px-3 py-2` → **12px/8px**;
  preview stage `p-6 sm:p-10` → **24px below `sm`, 40px above**. Measured stage padding: 40px at 1280, 24px at 390
  and 320, 48px at 200% text.
- **Root cause:** each region was styled when it was added; no shared inset token for the panel.
- **User impact:** vertical edges inside the panel do not line up, which reads as carelessness rather than rhythm.
- **Proposed fix:** one inset scale for the panel's rows (8px multiples), applied to all three regions; the stage
  may keep a larger inset deliberately, but then it should be the same value in both breakpoints' terms.
- **Regression requirement:** a gate comparing the start inset of each region in the panel.
- **Verification requirement:** rendered measurement at four viewports plus 200% text.
- **Status:** REPRODUCED · **Slice:** CAT-4

## CAT-BUG-012 — Technology and category share one pill

- **Surface:** `/components` cards. `component-gallery.tsx`.
- **Evidence (CAT-1, before):** `{item.primitive ?? item.category}` — **40** of 109 cards showed a technology in
  that pill (34 distinct values: `Radix Dialog`, `Recharts`, `Vaul`, `cmdk`, `Embla Carousel`, …) and 69 showed a
  functional category, in a vocabulary the category filter does not have.
- **Root cause:** one slot used for two dimensions, with technology silently preferred when present.
- **User impact:** a reader could not tell what kind of component they were looking at, and `RADIX DIALOG` looked
  like a category that does not exist in the filter.
- **Fix (CAT-QF):** the pill prints `item.category` for every card, and its hook is now `data-gallery-category`.
  The technology is unchanged in the data, still on the detail page in `<ComponentMeta>`, and still searchable
  from the gallery's search box. This is presentation only: no taxonomy value moved, which is CAT-2's work.
- **Regression:** `component-gallery.test.tsx` → "shows a functional category — never a technology — in every
  card's category pill", which checks every rendered card against the category enum and carries a negative
  control that the technologies are real values outside it, plus "still finds a component by the technology
  behind it". Negative control: reverting `component-gallery.tsx` fails the first (confirmed 2026-10-19).
- **Verification:** rendered over all cards — **109 of 109** pills come from the category slot, **7** distinct
  values, all of them members of `CATEGORY_ORDER`. (Those 7 were the categories as CAT-QF found them, including
  `Foundations`. CAT-2 replaced them with the eight-value taxonomy and re-measured: 109 of 109 pills from the
  category slot, **8** distinct values, across ten environments — see CAT-BUG-019.)
- **Status:** VERIFIED · **Slice:** CAT-QF

## CAT-BUG-013 — Entries possibly misclassified as Components

- **Surface:** taxonomy — `components.manifest.json` vs `blocks.manifest.json`.
- **Description:** the owner asked whether Footer, Message Bubble, Price Breakdown, Pass Card, Data Grid, Data
  Table, Form, Address Fields, Amount Display, Kanban Board and Chart belong in Blocks.
- **Evidence:** all eleven have their own source file in `packages/ui/src/components/`, a general prop-driven API,
  and a manifest entry with a platform list; none is a composition of other published components in the way the
  one existing recipe (`combobox`) is. Full reasoning per entry in audit §4.2.
- **Root cause:** none — the suspicion came from visual complexity, which the brief rightly excludes as a
  criterion.
- **User impact:** none today. There is a smaller real problem: `combobox` is a documented recipe but the
  catalogue presents it as a component, and `address-fields` and `form` are composed field groups that read as
  primitives.
- **Fix (CAT-2):** no moves. `kind` (`component` / `recipe`) and `facets` (`composed`, `utility`) are now
  manifest fields. `combobox` is the one `recipe`; `address-fields` and `form` carry `composed`;
  `direction-provider` carries `utility` instead of being given a one-item Utilities category. All eleven
  entries the owner asked about keep `kind: "component"`, their own page and their own URL. The recipe count
  the site publishes ("108 components and 1 documented recipe") used to be derived by matching the words "not a
  component" in a `platformNote`; `platform-support.ts`, `marketing-stats.mjs` and `gen-marketing-visuals.mjs`
  now read `kind`, and `check:manifest` holds the field and the prose to each other so the pinned marketing
  drafts that still parse the prose cannot disagree with the catalogue.
- **Regression:** the manifest schema gate — missing `kind`, `kind` outside the enum, an unknown facet, a
  repeated facet, and `kind` disagreeing with the prose each have a negative control in
  `check:manifest-controls` (5 of the 13, confirmed 2026-10-19). `component-taxonomy.test.ts` asserts the
  recipe list derived from `kind` is identical to the one the prose produced, and that the eleven entries are
  still components with pages.
- **Verification:** the gate and those tests; nothing rendered changed, which is the point.
- **Status:** NOT REPRODUCIBLE (investigated, no move warranted; the `kind`/facet work landed) · **Slice:** CAT-2

## CAT-BUG-014 — Blocks have no business-capability axis

- **Surface:** `/blocks`. `blocks.manifest.json` `categories`, `docs/business-capabilities.json`.
- **Evidence:** the primary filter is structural (Forms, Data, Application, Commerce, Feedback, Marketing), and
  "Application" holds 7 of 21 blocks. **8 of 21** blocks map to no canonical capability at all: `cta-banner`,
  `editor-toolbar`, `empty-state`, `onboarding-checklist`, `profile-form`, `settings-list`, `team-members`,
  `testimonial`. Only 2 of 21 carry a workflow.
- **Root cause:** capability mapping lives in `docs/business-capabilities.json` and was populated for components
  and for the blocks that appear in a workflow; the rest were never mapped.
- **User impact:** a developer looking for "the sign-up step" or "the settings screen" browses a structural
  taxonomy that does not answer either question.
- **Proposed fix:** map all 21 blocks in the canonical file, adding `account-settings` and `content-marketing`
  (audit §5); make capability the primary axis on `/blocks`; keep `category` in the manifest and `?cat=` working.
  Do not add a capability field to `blocks.manifest.json` — that would be a second source.
- **Regression requirement:** a gate that every published block has exactly one primary capability and that every
  offered capability has at least one block.
- **Verification requirement:** the generated `discovery-index.json` round-trip plus the existing
  `check:capabilities` staleness gate.
- **Status:** REPRODUCED · **Slice:** CAT-5

## CAT-BUG-015 — State coverage is inconsistent and undocumented

- **Surface:** component detail pages, `packages/ui/src/stories/*`, component APIs.
- **Evidence:** **68 of 109** components have one story export or fewer (`input-otp` has none). `Alert` implements
  `destructive`/`success`/`warning`/`info` and shows all four. `Chart` has `state?: "loading" | "empty" | "error"`
  and `stateMessage`, with default copy for each (`chart.tsx:42-43`, `122-124`), and demonstrates **none** of them. `DataTable` and `DataGrid` implement **no** data-state API
  (verified by reading both sources: the only matches for "empty"/"error" are prose in comments).
  `ResultState` carries five statuses, demonstrated and documented.
- **Root cause:** no controlled vocabulary and no per-entry record of which states apply, so nothing can tell an
  inapplicable state from an undocumented one.
- **User impact:** an evaluator asking "does this handle an empty table?" cannot find out, and for DataTable the
  answer is no — which is a product gap hidden by the absence of the question.
- **Proposed fix:** the five-dimension vocabulary and the five-value claim ladder in audit §8
  (SUPPORTED / TESTED / DOCUMENTED / NOT APPLICABLE / NOT IMPLEMENTED), recorded per entry, with TESTED reusing
  `scripts/evidence-levels.mjs` rather than computing a second verdict. Then a generated **States** section on the
  detail page. No state badges on gallery cards.
- **Regression requirement:** a gate that a state claimed SUPPORTED corresponds to a real variant key or prop, and
  that a state claimed DOCUMENTED has a story or doc example.
- **Verification requirement:** the gate above; rendered proof only for states whose claim is visual.
- **Open product question:** whether `DataTable` and `DataGrid` should gain empty/loading/error states. That is
  component work, outside the catalogue slices.
- **Status:** REPRODUCED (partly: the inconsistency is confirmed; per-entry applicability is not yet recorded) ·
  **Slice:** CAT-4
- **Note:** the per-entry variant surface in the inventory was parsed from source and spot-checked on four
  components. Treat rows as candidates until each is confirmed.

## CAT-BUG-016 — Platform badges need verifying against evidence

- **Surface:** `/components` cards. `PlatformBadges` in `apps/web/src/components/platform-badges.tsx`.
- **Evidence:** a cross-check of all **545** component/platform cells found **0** contradictions between
  `components.manifest.json` `platforms` and `verification.json` `componentLevels` (no cell claims an
  implementation the evidence calls not-implemented, and no cell carries evidence for a platform the manifest says
  is absent). All **105** block cells agree too. The badges already distinguish absence from a deliberate
  non-port, and name the reason in the tooltip and the spoken label.
- **Root cause:** none found. The report is not an accuracy defect.
- **Remaining gap (not an over-claim):** a solid badge says "this library carries it" and nothing about evidence
  tier or platform maturity, so Angular's Preview status and the difference between build-verified and
  runtime-verified are invisible on the card. The platform *filter* chips do carry maturity ("Angular · Preview").
- **Proposed fix:** leave availability as the badge's meaning; consider carrying platform maturity on the card the
  way the filter chip does. Do **not** put evidence tiers on cards — five tiers × five platforms per card is the
  badge clutter the brief warns against; the detail page already shows them.
- **Regression (CAT-2):** the cross-check is now a gate. `check:manifest` already failed a component declared on
  a platform with no evidence; it now also fails the other direction — evidence recorded for a platform the
  manifest does not list. A badge means "this library carries it", so the two files contradicting each other is
  exactly the over-claim the badges were suspected of. Negative control: removing `Flutter` from one component's
  `platforms` while `verification.json` keeps its Flutter evidence fails the gate with that message
  (`check:manifest-controls`, confirmed 2026-10-19).
- **Verification:** the gate passes on the current tree, which is the 0-contradiction result from the CAT-1
  cross-check of all 545 component cells, now asserted on every run rather than audited by hand.
- **Still open:** the maturity gap. A solid badge still says nothing about evidence tier or platform maturity;
  carrying platform maturity on the card the way the filter chip does is unscheduled, and evidence tiers stay
  off the cards deliberately.
- **Status:** NOT REPRODUCIBLE (as an accuracy defect; the cross-check is gated, the maturity gap is recorded) ·
  **Slice:** CAT-2

## CAT-BUG-017 — 200% text clips half the thumbnails

- **Surface:** `/components` cards. Found while investigating CAT-BUG-002.
- **Evidence:** cards with content clipped by the frame: **10–12 of 109** at default text (320/390/768/1280, light,
  dark, RTL, forced colors, reduced motion — identical counts), against **50 of 109** at 1280/200% text, **51** at
  768, **50** at 390 and **62** at 320. Worst: `description-list` 602px, `result-state` 504px, `pass-card` 403px,
  `time-slot-picker` 251px.
- **Root cause:** the frame height is a fixed 184px and the scale a fixed 0.72; neither responds to text size, so
  every demo whose height is text-driven grows past the frame.
- **User impact:** for a reader who enlarges text — the population accessibility work exists for — most of the
  gallery is cropped.
- **Proposed fix:** the framing record from audit §7, plus a frame whose height can grow (or content that scales)
  at large text. No `overflow: hidden` workaround, which is what produces the crop today.
- **Regression requirement:** the clipping gate must run at 200% text, not only at default.
- **Verification requirement:** rendered measurement at 200% text at all four viewports.
- **Status:** REPRODUCED · **Slice:** CAT-3

## CAT-BUG-018 — Thumbnail text is below legible size

- **Surface:** `/components` cards.
- **Evidence:** **41 of 109** cards render text under 10px after the 0.72 scale. Smallest: `tab-bar` and
  `description-list` **7.2px**, `phone-input` 7.5px, then 7.9px on `direction-provider`, `kbd`, `file-upload`,
  `time-slot-picker`, `tour`, `empty`, `card`, `collapsible`, `message-bubble`, `timeline`. Inside scroll
  containers: `json-viewer`, `diff-viewer`, `kanban-board` **8.6px**, `calendar` 9.3px, `data-grid` and
  `virtual-list` 10.1px.
- **Root cause:** a global `scale(0.72)` applied to demos authored for full-size reading.
- **User impact:** the text in a preview is decoration rather than information, which is also why several cards
  read as skeletons.
- **Proposed fix:** either per-entry scale with a floor (no rendered text below a chosen minimum) or demos authored
  for card size. The frame is decorative and `aria-hidden`, so this is a legibility question rather than a WCAG
  text-size failure — but it is the main reason the gallery does not communicate.
- **Regression requirement:** a gate on minimum rendered text size per card, including text inside scroll
  containers, with recorded exceptions.
- **Verification requirement:** rendered measurement.
- **Status:** REPRODUCED · **Slice:** CAT-3

## CAT-BUG-019 — Two hand-maintained category maps have drifted

- **Surface:** `COMPONENT_CATEGORY` in `apps/web/src/lib/site.ts` (109 entries) and `GROUP` in
  `scripts/gen-stories.mjs` (107 entries).
- **Evidence (CAT-1, before):** the two maps disagreed on **2** slugs: `app-bar` and `direction-provider` were
  present in `site.ts` and absent from `gen-stories.mjs`. `site.ts` comments said the map "mirrors the taxonomy
  in `scripts/gen-stories.mjs`"; nothing compared them, and `categoryOf` fell back to `"Data Display"` for an
  unknown slug, so an omission was invisible on the site. The Storybook side fell back to a generic
  `"Components"` group, which is where those two stories were actually titled.
- **Root cause:** functional category had no canonical source. It was the only catalogue dimension that was not
  generated from a manifest and not gated.
- **User impact:** a component could be filed in one category on the site and another in Storybook, or silently
  land in Data Display; the accessibility suites take their subject list from the Storybook side.
- **Fix (CAT-2):** `categoryDefinitions` and a per-component `category` in `components.manifest.json`, generated
  into `component-taxonomy.json`, which `apps/web/src/lib/component-taxonomy.ts` and `scripts/gen-stories.mjs`
  both read. Neither map is hand-written any more. Every silent fallback is gone: `categoryOf` throws, the story
  generator reports a problem, and the two remaining `?? "Data Display"` lookups (`related-components.ts`,
  `registry-treemap.tsx`) now call `categoryOf`. The eight-category taxonomy was validated entry by entry
  against each component's own source, not migrated — see
  [`docs/audits/CAT-2-TAXONOMY-VALIDATION.md`](docs/audits/CAT-2-TAXONOMY-VALIDATION.md); 26 of 109 entries
  change category and 13 rows were recorded as contested with the alternative that lost. The owner settled all
  thirteen on 2026-10-22: twelve stand as proposed, and `tag` moved to Data Display.
- **Regression:** `check:manifest` now validates the manifest's shape (unknown and missing keys, duplicate
  slugs that `JSON.parse` silently drops), the category enum, `kind`, `facets`, and that all three generated
  files are a fixed point of the manifest. `check:stories` additionally fails a hand-written story whose title
  group does not match the manifest — which it did for Button, Input and Textarea after the renames.
  `apps/web/src/lib/component-taxonomy.test.ts` (10 tests) covers the consumers, and
  `component-gallery.test.tsx` → "gives every category a filter chip whose count matches the cards behind it".
- **Negative controls:** `scripts/check-manifest-negative-controls.mjs` (`pnpm check:manifest-controls`, wired
  into CI) corrupts the real manifest one rule at a time and asserts the real `check:manifest` fails with the
  right message. **15 of 15 controls fail the gate** (re-confirmed 2026-10-22): missing category, category outside
  the enum, missing `categoryDefinitions`, a category with no rule, a misspelled key (`catagory`), missing
  `kind`, `kind` outside the enum, an unknown facet, a repeated facet, `kind` disagreeing with the published
  prose, generated data left stale, a former label that is also a current category, two categories claiming one
  former label, a duplicated slug, and a manifest/`verification.json` contradiction. The
  harness also asserts the gate passes on the unmodified tree first, so a control that "fails" vacuously is
  caught. Reverting the Button story title separately fails `check:stories` with the drift message.
- **Verification (rendered, 2026-10-19):** production build, Chromium 1194, `/components` and
  `/docs/components/direction-provider` at 320, 390, 768 and 1280px in light, dark, RTL and 200% text — ten
  environments:
  - **109 of 109** card pills come from the category slot in **every** environment, with **8** distinct values
    and **0** values outside the declared taxonomy.
  - every category's filter chip prints a count equal to the cards its filter yields, with no foreign pills:
    Layout & Structure 9, Forms & Inputs 29, Actions & Controls 7, Navigation 13, Overlays 10,
    Feedback & Status 13, Data Display 22, Media & Content 6 — 109 in total (re-measured
    2026-10-22 after `tag` moved to Data Display; every other figure here is unchanged from the first run).
  - the docs sidebar lists all **8** groups in every environment, and the grouped results list shows all 8
    headings in declaration order.
  - no horizontal page overflow in any of the ten environments (`scrollWidth` equals `clientWidth` at 320, 390,
    768 and 1280, including at 200% text where the longer labels wrap instead).
  - `check:manifest` reaches a fixed point: regenerating produces no diff.
- **Status:** VERIFIED · **Slice:** CAT-2

## CAT-BUG-020 — Block showcases waste most of their width

- **Surface:** `/blocks`. `Showcase` (`flex min-h-[280px] … p-8`) with per-block `contentClassName`.
- **Evidence:** at 1280px the stage is 1214px wide and the blocks are 320–693px: `testimonial` 344×80 in
  1214×280 → **92% empty**; `editor-toolbar` 88%; `filter-panel` and `pricing-tier` 78%; `settings-list` and
  `team-members` 75%. At 390px the worst is 70%. No clipping and no page overflow at 1280, 390 or in RTL.
- **Root cause:** one full-width centred stage for blocks of very different natural widths; `contentClassName`
  exists but only adjusts alignment.
- **User impact:** a reader scrolls a long page of mostly empty panels, and a narrow block looks lost rather than
  deliberate.
- **Proposed fix:** a stage-width hint per block (`narrow` / `default` / `wide`) in the same framing record as the
  components, so a testimonial sits in a column and a dashboard spans the page.
- **Regression requirement:** a gate on the share of the stage a block covers, with recorded exceptions.
- **Verification requirement:** rendered measurement at 1280 and 390.
- **Status:** REPRODUCED · **Slice:** CAT-5

## CAT-BUG-021 — A retired category in a shared link reads as an empty category

- **Surface:** `/components?cat=<label>`. `resolveCategoryParam` in `component-gallery.tsx`, against
  `categoryDefinitions.formerly` in `components.manifest.json`.
- **Evidence (rendered, 2026-10-22, production build, Chromium 1194, 1280px):** the three **renamed** labels
  all resolve and filter correctly — `?cat=Feedback` → 13 cards with the `Feedback & Status 13` chip pressed,
  `?cat=Form%20Inputs` → 29, `?cat=Controls%20%26%20Actions` → 7. The one **retired** label does not:
  `?cat=Foundations` → **0 cards**, no chip pressed, and the page reads "No components match in Foundations."
  with a CLEAR FILTERS action. `?cat=Nonsense` renders **identically** — same count, same sentence shape, same
  action.
- **Root cause:** `formerly` maps an old label to a current one, and `Foundations` has no single successor —
  its nine entries went to five different categories. There is no third state for "this category existed and
  was retired", so the resolver treats a retired label and a typo the same way, and so must the reader.
- **User impact:** this is the only gap in CAT-2 that reaches a reader who did nothing wrong. Someone who
  shared `/components?cat=Foundations` — in a message, a ticket, a bookmark — now sends people to a page that
  says the category is empty. It isn't empty; it no longer exists, and the nine components are all still there
  under other names. The empty state is honest about the filter and silent about the taxonomy, so the reader's
  reasonable conclusion ("those components are gone") is wrong. The recovery action clears the filter rather
  than taking them anywhere, so the trail ends.
- **Proposed fix:** a `retired` block in `categoryDefinitions`, naming each retired label and the categories
  its members went to. `resolveCategoryParam` then returns one of three answers rather than two — current,
  renamed, or retired — and the retired case renders a sentence that says so and offers the successor
  categories as chips the reader can press. A typo keeps today's message, which is the right message for a
  typo. This is data, not a redirect: no URL changes, nothing is served from a second place, and the retired
  list is as gateable as the rest of the manifest.
- **Rejected alternative:** an HTTP redirect from the retired value to one successor. It would have to pick one
  of five destinations and would quietly show the reader a category they did not ask for, which is a worse
  failure than an honest dead end.
- **Regression requirement:** a gate asserting every label in `formerly` resolves and every label in `retired`
  names only current categories, plus a gallery test that a retired value renders the retired message and an
  unknown value does not.
- **Verification requirement:** rendered measurement of a retired, a renamed and an unknown value, in both
  themes. Both messages must be reachable; today they are the same message.
- **Status:** REPRODUCED · **Slice:** CAT-3

## CAT-BUG-022 — Category labels are search terms, so 26 entries changed what they match

- **Surface:** the search box on `/components`. The predicate in `component-gallery.tsx` matches the query
  against title, slug, primitive, **category**, and the business-discovery terms.
- **Evidence (rendered, 2026-10-22, 1280px):** `category` is one of five haystacks, so every one of the 26
  entries that changed category changed what it matches. Measured: `media` → **6** cards and `data display` →
  **22**, both new matches that returned nothing under the old taxonomy; `form inputs` → **0**, a retired label
  that used to return 29. `image` no longer matches its old category label, as expected — it has no
  business-discovery terms and its category is now Media & Content.
- **A second finding, and the more surprising one:** `foundations` returns **10** cards, not 0. Those are not
  taxonomy matches at all. The business-discovery terms include each entry's roadmap row, and two rows in
  `docs/BUSINESS-CAPABILITY-ROADMAP.md` are named "Transactional foundations" and "Foundations shipped", so the
  Phase 1 and Phase 2 components match the word for an unrelated reason. The result is the worst of both: a
  reader searching `foundations` gets ten components that have nothing to do with the retired category, which
  reads as though the category half-exists. This is pre-existing behaviour, not something CAT-2 introduced, but
  CAT-2 is what makes it misleading.
- **Root cause:** search terms are assembled from display labels rather than declared, so renaming a label is
  also a silent search change, and a roadmap row's prose leaks into the same namespace as category names.
- **User impact:** a reader who searched by category label before finds nothing now, with no indication that
  the label was renamed rather than the components removed. Nothing tells them, and nothing tells us either:
  no gate covers which words reach which component.
- **Proposed fix:** declare the per-entry search terms in the manifest, derived from category, kind, facets and
  the business axes, and keep roadmap prose out of them. Then a label change is a visible diff in generated
  data rather than an invisible behaviour change.
- **Regression requirement:** a gate on the generated search terms, so a rename shows up as a diff; and a test
  that a retired label returns the retired message rather than a silent zero (see CAT-BUG-021).
- **Verification requirement:** rendered counts for each current label, each retired label and each `formerly`
  label.
- **Status:** REPRODUCED · **Slice:** CAT-3

## CAT-BUG-023 — `composed` and `utility` are recorded but never rendered

- **Surface:** `facets` in `components.manifest.json`, generated into `component-taxonomy.json`.
- **Evidence:** both facets are carried on every entry that earns them, gated by `check:manifest` (an unknown
  facet and a repeated facet are each a negative control), and read by nothing. No card, filter chip, detail
  page or search term mentions either value.
- **Root cause:** CAT-2's scope was the canonical source. Surfacing a new axis is a product decision about what
  a reader should be able to filter by, and inventing a UI for it inside a data slice would have made that
  decision silently.
- **User impact:** none today, which is the point — the data earns nothing until something shows it. The risk
  is the other direction: a recorded axis nobody renders drifts out of meaning, because only a reader noticing
  a wrong answer would catch it, and no reader can see it.
- **Proposed fix:** decide first whether `composed` belongs in the catalogue's reading (it distinguishes a
  component a reader can drop in from one assembled out of others, which is the question behind several of the
  owner's reports) and only then design where it shows. If the answer is no, delete the facets rather than
  keeping unread data under a gate.
- **Regression requirement:** whichever way it goes, a gate that the rendered set and the declared set agree,
  so "recorded but unread" cannot come back.
- **Verification requirement:** rendered measurement once a surface exists.
- **Status:** REPRODUCED · **Slice:** CAT-3
