# UX quality backlog

Durable record of catalogue and preview defects, opened by the CAT-1 audit
([`docs/audits/CAT-1-CATALOGUE-AUDIT.md`](docs/audits/CAT-1-CATALOGUE-AUDIT.md)). IDs are stable and are never
reused or renumbered. A later session or PR updates an entry's **Status** and **Evidence** in place; it does not
delete an entry, including one that could not be reproduced.

**Statuses:** `REPORTED` · `REPRODUCED` · `TRIAGED` · `IN PROGRESS` · `FIXED — UNVERIFIED` · `VERIFIED` ·
`NOT REPRODUCIBLE` · `DEFERRED`.

`VERIFIED` requires the entry's own regression check to have passed. A fix that looks right in a screenshot is
`FIXED — UNVERIFIED`.

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
| CAT-BUG-006 | Footer thumbnail is grey bars with no text | /components card | High | REPRODUCED | CAT-3 |
| CAT-BUG-007 | Data Table thumbnail is grey bars, shared with Table | /components card | High | REPRODUCED | CAT-3 |
| CAT-BUG-008 | Dialog and Alert Dialog thumbnails are the same picture | /components card | Medium | REPRODUCED | CAT-3 |
| CAT-BUG-009 | Detail previews are mostly empty space | component detail | High | REPRODUCED | CAT-4 |
| CAT-BUG-010 | Preview/Code control sits 1px from the panel border | component detail | Medium | REPRODUCED | CAT-4 |
| CAT-BUG-011 | Three different insets inside one preview panel | component detail | Medium | REPRODUCED | CAT-4 |
| CAT-BUG-012 | Technology and category share one pill | /components card | High | REPRODUCED | CAT-2 |
| CAT-BUG-013 | Entries possibly misclassified as Components | taxonomy | Low | NOT REPRODUCIBLE | — |
| CAT-BUG-014 | Blocks have no business-capability axis | /blocks | High | REPRODUCED | CAT-5 |
| CAT-BUG-015 | State coverage is inconsistent and undocumented | component detail, stories | High | REPRODUCED (partly) | CAT-4 |
| CAT-BUG-016 | Platform badges need verifying against evidence | /components card | Low | NOT REPRODUCIBLE (as accuracy) | CAT-2 |
| CAT-BUG-017 | 200% text clips half the thumbnails | /components card | High | REPRODUCED | CAT-3 |
| CAT-BUG-018 | Thumbnail text is below legible size | /components card | Medium | REPRODUCED | CAT-3 |
| CAT-BUG-019 | Two hand-maintained category maps have drifted | canonical data | High | REPRODUCED | CAT-2 |
| CAT-BUG-020 | Block showcases waste most of their width | /blocks | Low | REPRODUCED | CAT-5 |

017–020 were found while investigating the owner's reports and share their root causes.

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
- **Evidence:** the mock draws 11 grey `Bar` divs under 3 grey heading bars. No text node was measurable inside the
  frame. Ink 7.86%, fill 20%.
- **Root cause:** `footer` is in `NO_LIVE_THUMBNAIL` (its demo renders real `<a href>` elements, which would nest
  an anchor inside the card's own link and break hydration), so a mock was written; the mock was drawn as a
  skeleton. That hydration constraint is real and must be preserved by any fix.
- **User impact:** the card for a shipped, 5-platform component looks like a loading placeholder.
- **Proposed fix:** redraw the mock with real link text, a brand line and a legal row — plain spans, no anchors, so
  the hydration constraint still holds.
- **Regression requirement:** a check that a mock standing in for a content-bearing component renders text, and
  the existing test that mocks contain nothing focusable.
- **Verification requirement:** rendered measurement that text exists and clears the legibility floor.
- **Status:** REPRODUCED · **Slice:** CAT-3

## CAT-BUG-007 — Data Table thumbnail is grey bars, shared with Table

- **Surface:** `/components`, cards `data-table` and `table`. `TableMock`.
- **Evidence:** the mock renders three 12px header words and **9 grey bars** as cells. `table` and `data-table`
  render the same mock: **0.50%** of pixels differ between the two screenshots.
- **Root cause:** one mock reused for two components, drawn as a skeleton.
- **User impact:** neither card shows what the component displays, and two different components are
  indistinguishable in the gallery.
- **Proposed fix:** real cell content in the mock, and a second variant for `data-table` showing what distinguishes
  it from `table` (sortable header, selection, pagination row).
- **Regression requirement:** a gate on minimum pixel difference between any two thumbnails, with recorded
  exceptions only where two entries genuinely are one picture.
- **Verification requirement:** pairwise screenshot difference.
- **Status:** REPRODUCED · **Slice:** CAT-3

## CAT-BUG-008 — Dialog and Alert Dialog thumbnails are the same picture

- **Surface:** `/components`, cards `dialog`, `alert-dialog`, `modal`.
- **Evidence:** `dialog` vs `alert-dialog` **3.51%** of pixels differ; `dialog` vs `modal` 2.76%. Both render
  `DialogMock`, which varies only its title and primary-button text (`danger` prop). Four pairs are worse:
  `popover`/`hover-card` **0.40%**, `table`/`data-table` **0.50%**, `dropdown-menu`/`context-menu` **1.20%**,
  `sheet`/`drawer` 7.85%.
- **Root cause:** shared mocks parameterised by copy rather than by what actually differs between the components.
- **User impact:** the gallery cannot be scanned; the cards do not teach which component to pick.
- **Proposed fix:** differentiate on structure, not wording — a destructive dialog with its destructive action
  colouring and icon, a hover card with its pointer-triggered offset, a context menu with its cursor origin.
- **Regression requirement:** the pairwise difference gate from CAT-BUG-007, covering all five pairs.
- **Verification requirement:** pairwise screenshot difference in light and dark.
- **Status:** REPRODUCED · **Slice:** CAT-3

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

- **Surface:** every component detail page. `ComponentPreview` in `apps/web/src/components/component-preview.tsx`
  — the `SegmentedControl` is a direct child of the `rounded-xl border` panel with no padding.
- **Evidence:** control inset **top 1.0px, start 1.0px** from the panel box at 1280, 390 and 320 — the panel's own
  border width. The control's radius is 12px inside the panel's 16px corner.
- **Root cause:** no padding on the panel's first row; the control is flush by default.
- **User impact:** the panel reads as misassembled, on the surface where an evaluator judges polish.
- **Proposed fix:** one shared change — give the control row the same inset the environment toolbar already uses
  (`px-3 py-2`, 12px/8px, both in the existing 8px scale), so the rounded control clears the rounded panel. No new
  pixel values, no page-specific override.
- **Regression requirement:** a gate asserting a minimum inset between the panel border and every control inside
  it, in LTR and RTL.
- **Verification requirement:** rendered measurement at the four viewports, LTR and RTL. Already confirmed not a
  defect: the control mirrors correctly in RTL (start inset 1px → 563.3px) and is unchanged under forced colors
  and reduced motion, and its segments grow to 44px on touch.
- **Status:** REPRODUCED · **Slice:** CAT-4

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

- **Surface:** `/components` cards. `component-gallery.tsx`: `{item.primitive ?? item.category}`.
- **Evidence:** **40** of 109 cards show a technology in that pill (34 distinct values: `Radix Dialog`, `Recharts`,
  `Vaul`, `cmdk`, `Embla Carousel`, `react-resizable-panels`, …) and **69** show a functional category. The
  category navigation and the category filter use a different vocabulary from the one 40 cards display.
- **Root cause:** one slot used for two dimensions, with technology silently preferred when present.
- **User impact:** a reader cannot tell what kind of component they are looking at, and `RADIX DIALOG` looks like
  a category that does not exist in the filter.
- **Proposed fix:** the pill shows the functional category for every card; technology stays on the detail page
  (`<ComponentMeta>`, already there). No technology filter for now — 34 values, most with one member (audit §4.1).
- **Regression requirement:** a test that every card's category pill contains a value from the category enum.
- **Verification requirement:** rendered check over all cards.
- **Status:** REPRODUCED · **Slice:** CAT-2

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
- **Proposed fix:** no moves. Add `kind` (`component` / `recipe`) and a `composed` facet to the manifest so the
  distinction is visible without changing any public API or URL.
- **Regression requirement:** manifest schema validation for the new fields.
- **Verification requirement:** none beyond the schema gate.
- **Status:** NOT REPRODUCIBLE (investigated, no move warranted) · **Slice:** — (the `kind`/facet work rides CAT-2)

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
- **Regression requirement:** keep the manifest/evidence consistency cross-check as a gate so this cannot regress
  silently.
- **Verification requirement:** the cross-check gate.
- **Status:** NOT REPRODUCIBLE (as an accuracy defect; the maturity gap is recorded) · **Slice:** CAT-2

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
- **Evidence:** the two maps disagree on **2** slugs today: `app-bar` and `direction-provider` are present in
  `site.ts` and absent from `gen-stories.mjs`. `site.ts` comments say the map "mirrors the taxonomy in
  `scripts/gen-stories.mjs`"; nothing compares them, and `categoryOf` falls back to `"Data Display"` for an
  unknown slug, so an omission is invisible on the site.
- **Root cause:** functional category has no canonical source. It is the only catalogue dimension that is not
  generated from a manifest and not gated.
- **User impact:** a component can be filed in one category on the site and another in Storybook, or silently land
  in Data Display; the accessibility suites take their subject list from the Storybook side.
- **Proposed fix:** `category` in `components.manifest.json` with the eight-value enum, both maps derived from it,
  the silent fallback removed, and `check:manifest` extended (audit §9).
- **Regression requirement:** a negative control — remove a category from the manifest, assert `check:manifest`
  fails; set an invalid value, assert it fails; and assert the derived maps regenerate to a fixed point.
- **Verification requirement:** the generator reaching a fixed point with no diff, plus the negative controls.
- **Status:** REPRODUCED · **Slice:** CAT-2

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
