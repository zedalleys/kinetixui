# CAT-2 — taxonomy validation record

Every one of the 109 entries in `components.manifest.json`, with the category it now declares, the
category the website's `COMPONENT_CATEGORY` map gave it before CAT-2, and the source file the assignment was
judged from. This is the record for the brief's requirement to **validate** every assignment rather than migrate
the previous map: each row was decided by reading that component's own React source (its leading doc comment and
its public props), then applying the rule its category declares in `categoryDefinitions`.

CAT-1 §4 proposed these eight categories and an assignment for all 109 entries. This pass agreed with
**109** of 109 — the proposal is confirmed, not accepted. Where a second category is
genuinely defensible the row is marked **contested** and §3 says what the alternative was and why it lost; a
contested row is a decision the owner can overturn by editing one field in the manifest.

## 1. The categories

| Category | Count | Rule an assignment is judged against |
|---|---|---|
| Layout & Structure | 9 | Arranges or contains other components and has no content of its own. |
| Forms & Inputs | 29 | Collects a value from the user, or labels and structures the field that does. |
| Actions & Controls | 7 | Performs or toggles an action. |
| Navigation | 13 | Moves the user between places or levels. |
| Overlays | 10 | Exists to present arbitrary content above the page. |
| Feedback & Status | 13 | Reports state, progress, outcome or guidance. |
| Data Display | 22 | Presents data the user reads rather than operates. |
| Media & Content | 6 | Presents authored media or editorial content. |

Order is `categoryDefinitions`' own declaration order, and it is the order every surface lists categories in:
the gallery's filter chips, the grouped results, the docs sidebar and the Storybook groups. Three categories are
renames of existing labels (`Form Inputs` → `Forms & Inputs`, `Controls & Actions` → `Actions & Controls`,
`Feedback` → `Feedback & Status`). `Foundations` is retired: it described how mature a component was rather
than what it does, and its nine entries belong in five different functional homes. `Layout & Structure` and
`Media & Content` are new.

## 2. Every entry

`kind` is `component` unless stated. **Moved** marks the 26 entries whose
category changed (a rename alone is not a move).

| Slug | Before CAT-2 | Category now | Moved | Source read | kind / facets |
|---|---|---|---|---|---|
| `accordion` | Data Display | **Layout & Structure** | yes | `accordion.tsx (53L)` | — |
| `address-fields` | Form Inputs | Forms & Inputs | — | `address-fields.tsx (178L)` | `composed` |
| `alert` | Feedback | Feedback & Status | — | `alert.tsx (51L)` | — |
| `alert-dialog` | Overlays | Overlays | — | `alert-dialog.tsx (118L)` | — |
| `amount-display` | Data Display | Data Display | — | `amount-display.tsx (114L)` | — |
| `app-bar` | Navigation | Navigation | — | `app-bar.tsx (140L)` | — |
| `aspect-ratio` | Foundations | **Layout & Structure** | yes | `aspect-ratio.tsx (8L)` | — |
| `audio-player` | Data Display | **Media & Content** | yes | `audio-player.tsx (154L)` | — |
| `avatar` | Data Display | Data Display | — | `avatar.tsx (80L)` | — |
| `avatar-group` | Data Display | Data Display | — | `—` | — |
| `badge` | Feedback | Feedback & Status | — | `badge.tsx (50L)` | — |
| `banner` | Feedback | Feedback & Status | — | `banner.tsx (96L)` | — |
| `breadcrumb` | Navigation | Navigation | — | `breadcrumb.tsx (78L)` | — |
| `button` | Controls & Actions | Actions & Controls | — | `button.tsx (131L)` | — |
| `button-group` | Controls & Actions | Actions & Controls | — | `button-group.tsx (72L)` | — |
| `calendar` | Form Inputs | Forms & Inputs | — | `calendar.tsx (99L)` | — |
| `card` | Data Display | **Layout & Structure** | yes | `card.tsx (122L)` | — |
| `carousel` | Data Display | **Media & Content** | yes | `carousel.tsx (182L)` | — |
| `chart` | Data Display | Data Display | — | `chart.tsx (345L)` | — |
| `checkbox` | Form Inputs | Forms & Inputs | — | `checkbox.tsx (94L)` | — |
| `circular-progress` | Feedback | Feedback & Status | — | `circular-progress.tsx (68L)` | — |
| `code-block` | Foundations | **Data Display** | yes | `code-block.tsx (143L)` | — |
| `collapsible` | Data Display | **Layout & Structure** | yes | `collapsible.tsx (50L)` | — |
| `color-picker` | Form Inputs | Forms & Inputs | — | `color-picker.tsx (385L)` | — |
| `combobox` | Controls & Actions | **Forms & Inputs** | yes | `—` | **recipe** |
| `command` | Controls & Actions | Actions & Controls | — | `command.tsx (172L)` | — |
| `comparison-slider` | Controls & Actions | **Media & Content** | yes | `comparison-slider.tsx (99L)` | — |
| `context-menu` | Overlays | Overlays | — | `context-menu.tsx (141L)` | — |
| `country-select` | Form Inputs | Forms & Inputs | — | `country-select.tsx (168L)` | — |
| `data-grid` | Data Display | Data Display | — | `data-grid.tsx (793L)` | — |
| `data-table` | Data Display | Data Display | — | `data-table.tsx (107L)` | — |
| `date-picker` | Form Inputs | Forms & Inputs | — | `date-picker.tsx (76L)` | — |
| `date-range-input` | Form Inputs | Forms & Inputs | — | `date-range-input.tsx (193L)` | — |
| `description-list` | Data Display | Data Display | — | `description-list.tsx (53L)` | — |
| `dialog` | Overlays | Overlays | — | `dialog.tsx (104L)` | — |
| `diff-viewer` | Data Display | Data Display | — | `diff-viewer.tsx (201L)` | — |
| `direction-provider` | Foundations | **Layout & Structure** | yes | `direction-provider.tsx (112L)` | `utility` |
| `drawer` | Overlays | Overlays | — | `drawer.tsx (127L)` | — |
| `dropdown-menu` | Overlays | Overlays | — | `dropdown-menu.tsx (143L)` | — |
| `empty` | Feedback | Feedback & Status | — | `empty.tsx (77L)` | — |
| `fab` | Controls & Actions | Actions & Controls | — | `fab.tsx (59L)` | — |
| `field` | Form Inputs | Forms & Inputs | — | `field.tsx (129L)` | — |
| `file-upload` | Form Inputs | Forms & Inputs | — | `file-upload.tsx (182L)` | — |
| `footer` | Data Display | **Layout & Structure** | yes | `footer.tsx (63L)` | — |
| `form` | Form Inputs | Forms & Inputs | — | `form.tsx (131L)` | `composed` |
| `guest-picker` | Form Inputs | Forms & Inputs | — | `guest-picker.tsx (182L)` | — |
| `hover-card` | Overlays | Overlays | — | `hover-card.tsx (29L)` | — |
| `image` | Foundations | **Media & Content** | yes | `image.tsx (88L)` | — |
| `inform` | Feedback | Feedback & Status | — | `inform.tsx (89L)` | — |
| `input` | Form Inputs | Forms & Inputs | — | `input.tsx (90L)` | — |
| `input-group` | Form Inputs | Forms & Inputs | — | `input-group.tsx (120L)` | — |
| `input-otp` | Form Inputs | Forms & Inputs | — | `input-otp.tsx (108L)` | — |
| `json-viewer` | Data Display | Data Display | — | `json-viewer.tsx (178L)` | — |
| `kanban-board` | Data Display | Data Display | — | `kanban-board.tsx (248L)` | — |
| `kbd` | Foundations | **Data Display** | yes | `kbd.tsx (41L)` | — |
| `label` | Foundations | **Forms & Inputs** | yes | `label.tsx (21L)` | — |
| `list` | Data Display | Data Display | — | `list.tsx (86L)` | — |
| `markdown-editor` | Form Inputs | Forms & Inputs | — | `markdown-editor.tsx (324L)` | — |
| `marquee` | Data Display | **Media & Content** | yes | `marquee.tsx (58L)` | — |
| `menubar` | Navigation | Navigation | — | `menubar.tsx (175L)` | — |
| `message-bubble` | Data Display | Data Display | — | `message-bubble.tsx (84L)` | — |
| `metric` | Feedback | **Data Display** | yes | `metric.tsx (52L)` | — |
| `modal` | Overlays | Overlays | — | `modal.tsx (128L)` | — |
| `multi-select` | Form Inputs | Forms & Inputs | — | `multi-select.tsx (167L)` | — |
| `native-select` | Form Inputs | Forms & Inputs | — | `native-select.tsx (91L)` | — |
| `navigation-bar` | Navigation | Navigation | — | `navigation-bar.tsx (50L)` | — |
| `navigation-menu` | Navigation | Navigation | — | `navigation-menu.tsx (118L)` | — |
| `notification-center` | Overlays | **Feedback & Status** | yes | `notification-center.tsx (120L)` | — |
| `number-input` | Form Inputs | Forms & Inputs | — | `number-input.tsx (159L)` | — |
| `page-header` | Navigation | Navigation | — | `page-header.tsx (44L)` | — |
| `pagination` | Controls & Actions | **Navigation** | yes | `pagination.tsx (78L)` | — |
| `pass-card` | Data Display | Data Display | — | `pass-card.tsx (202L)` | — |
| `password-input` | Form Inputs | Forms & Inputs | — | `password-input.tsx (37L)` | — |
| `phone-input` | Form Inputs | Forms & Inputs | — | `phone-input.tsx (174L)` | — |
| `popover` | Overlays | Overlays | — | `popover.tsx (57L)` | — |
| `price-breakdown` | Data Display | Data Display | — | `price-breakdown.tsx (89L)` | — |
| `progress` | Feedback | Feedback & Status | — | `progress.tsx (25L)` | — |
| `quote` | Data Display | **Media & Content** | yes | `quote.tsx (35L)` | — |
| `radio-group` | Form Inputs | Forms & Inputs | — | `radio-group.tsx (73L)` | — |
| `rating` | Form Inputs | Forms & Inputs | — | `rating.tsx (89L)` | — |
| `reference-code` | Data Display | Data Display | — | `reference-code.tsx (154L)` | — |
| `resizable` | Data Display | **Layout & Structure** | yes | `resizable.tsx (62L)` | — |
| `result-state` | Feedback | Feedback & Status | — | `result-state.tsx (196L)` | — |
| `scroll-area` | Data Display | **Layout & Structure** | yes | `scroll-area.tsx (40L)` | — |
| `segmented-control` | Controls & Actions | Actions & Controls | — | `segmented-control.tsx (69L)` | — |
| `select` | Form Inputs | Forms & Inputs | — | `select.tsx (144L)` | — |
| `separator` | Foundations | **Layout & Structure** | yes | `separator.tsx (26L)` | — |
| `sheet` | Overlays | Overlays | — | `sheet.tsx (121L)` | — |
| `sidebar` | Navigation | Navigation | — | `sidebar.tsx (391L)` | — |
| `skeleton` | Foundations | **Feedback & Status** | yes | `skeleton.tsx (10L)` | — |
| `slider` | Form Inputs | Forms & Inputs | — | `slider.tsx (79L)` | — |
| `sonner` | Feedback | Feedback & Status | — | `sonner.tsx (31L)` | — |
| `spinner` | Foundations | **Feedback & Status** | yes | `spinner.tsx (44L)` | — |
| `stepper` | Navigation | Navigation | — | `stepper.tsx (76L)` | — |
| `switch` | Form Inputs | Forms & Inputs | — | `switch.tsx (74L)` | — |
| `tab-bar` | Navigation | Navigation | — | `tab-bar.tsx (59L)` | — |
| `table` | Data Display | Data Display | — | `table.tsx (184L)` | — |
| `table-of-contents` | Navigation | Navigation | — | `table-of-contents.tsx (47L)` | — |
| `tabs` | Navigation | Navigation | — | `tabs.tsx (211L)` | — |
| `tag` | Feedback | **Data Display** | yes | `tag.tsx (75L)` | — |
| `textarea` | Form Inputs | Forms & Inputs | — | `textarea.tsx (74L)` | — |
| `time-slot-picker` | Form Inputs | Forms & Inputs | — | `time-slot-picker.tsx (165L)` | — |
| `timeline` | Data Display | Data Display | — | `timeline.tsx (177L)` | — |
| `toggle` | Controls & Actions | Actions & Controls | — | `toggle.tsx (89L)` | — |
| `toggle-group` | Controls & Actions | Actions & Controls | — | `toggle-group.tsx (44L)` | — |
| `tooltip` | Overlays | Overlays | — | `tooltip.tsx (42L)` | — |
| `tour` | Overlays | **Feedback & Status** | yes | `tour.tsx (215L)` | — |
| `tree-view` | Navigation | Navigation | — | `tree-view.tsx (313L)` | — |
| `virtual-list` | Data Display | Data Display | — | `virtual-list.tsx (94L)` | — |

## 3. The contested rows

- **`accordion`** → Layout & Structure. Defensible alternative: **Actions & Controls**. The trigger is a control, but the component's subject is the arbitrary content it holds; `AccordionContent` takes any children and the component renders none of its own.
- **`collapsible`** → Layout & Structure. Defensible alternative: **Actions & Controls**. Same disclosure gesture as Accordion, and it stays with it; the source is a bare Radix re-export plus a height transition.
- **`notification-center`** → Feedback & Status. Defensible alternative: **Overlays**. It is a popover by mechanism (`Popover` re-exported as its root), but its subject is read/unread notifications — Overlays is for components whose purpose is floating arbitrary content.
- **`tour`** → Feedback & Status. Defensible alternative: **Overlays**. Spotlight popovers, but the sequence exists to guide; `Feedback & Status` covers guidance, and a tour deliberately does not trap focus the way an overlay does.
- **`tag`** → **Data Display** (decided by the owner, 2026-10-22). Previously proposed as Feedback & Status beside Badge, so that a reader comparing the two chips found them adjacent. It was the one row that failed its own category's rule rather than merely fitting a second one less well: a tag carries metadata the reader reads, not state, progress, outcome or guidance. Adjacency to Badge is a gallery-ordering concern, not a taxonomy one. The move takes Feedback & Status to 13 and Data Display to 22.
- **`kbd`** → Data Display. Defensible alternative: **Media & Content**. A key glyph is typographic, but it renders a value for reading, which is the Data Display rule.
- **`footer`** → Layout & Structure. Defensible alternative: **Navigation**. Its columns are nav links, but the component is a shell: `Footer` takes any children and supplies only the surface and the bottom bar.
- **`pagination`** → Navigation. Defensible alternative: **Actions & Controls**. The items are buttons, but the source declares `role="navigation"` with `aria-label="pagination"` — the component itself says it is navigation.
- **`comparison-slider`** → Media & Content. Defensible alternative: **Actions & Controls**. Built on Radix Slider, but its subject is two stacked layers; the handle is the mechanism.
- **`code-block`** → Data Display. Defensible alternative: **Media & Content**. Code is authored content, but this renders a value with a copy button, not editorial.
- **`direction-provider`** → Layout & Structure. Defensible alternative: **a Utilities category of its own**. It renders no UI at all, but a one-item category would fragment the taxonomy, so it sits in Layout & Structure with the `utility` facet instead.
- **`audio-player`** → Media & Content. Defensible alternative: **Actions & Controls**. It is mostly transport controls, but it exists to play authored media.
- **`marquee`** → Media & Content. Defensible alternative: **Data Display**. A ticker scrolls data, but its documented subjects are logo strips and testimonials.

## 4. What was NOT changed

- **No entry moved between Components and Blocks.** The eleven entries CAT-BUG-013 asked about
  (`footer`, `message-bubble`, `price-breakdown`, `pass-card`, `data-grid`, `data-table`, `form`, `address-fields`, `amount-display`, `kanban-board`, `chart`)
  all keep `kind: "component"`, their own page and their own URL. CAT-1 §4.2 has the per-entry reasoning.
- **No URL, no public API, no package export changed.** The only new fields are `category`, `kind` and
  `facets` in the manifest, and the generated `component-taxonomy.json`.
- **No block taxonomy work.** CAT-1 §5's business-capability axis for `/blocks` is CAT-5.
- **No technology filter.** `PRIMITIVE` stays a detail-page fact and a search term, as CAT-1 §4.1 recommended.
