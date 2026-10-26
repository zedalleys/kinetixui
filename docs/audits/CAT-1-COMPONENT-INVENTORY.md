# CAT-1 — component inventory

One row per catalogue entry in `components.manifest.json` (109), joined from every canonical source at `main`
`984792b` (2026-10-18). Generated for the audit; see [`CAT-1-CATALOGUE-AUDIT.md`](CAT-1-CATALOGUE-AUDIT.md) for the
reasoning and limits, and [`../../UX-QUALITY-BACKLOG.md`](../../UX-QUALITY-BACKLOG.md) for the defects.

Column notes:

- **Current category** — `COMPONENT_CATEGORY` in `apps/web/src/lib/site.ts`.
- **Proposed category** — §4 of the audit. **Bold** marks a change (25 entries; three categories are also renamed,
  which is not counted as a change).
- **Technology** — `PRIMITIVE` in `apps/web/src/lib/component-registry.ts`. Blank means hand-built on React.
- **Type** — Component, Component (React-only, by a recorded `platformNote` decision), or Pattern (recipe: the
  manifest itself says "not a component").
- **Evidence** — `verification.json` `componentLevels`, per platform: `RE` React, `NG` Angular, `SW` SwiftUI,
  `CO` Compose, `FL` Flutter; `–` not implemented, `S` source present, `B` build verified, `H` headless verified,
  `R` runtime verified. Do not read these as availability: availability is the platform count.
- **Maturity** — `component-status.json` (generated from the manifest).
- **Card preview** — thumbnail kind as rendered, plus measured clipping at 1280px and, where the content covers
  under 5% of the frame, that share. Measured by `scripts/catalogue-preview-audit.mjs`.
- **Stories** — count of story exports in `packages/ui/src/stories/<Name>.stories.tsx`.
- **Variant surface** — `cva` variant keys and their options, parsed from the React source. Candidates for the
  state audit, not verdicts (audit §11).
- **Capability** — business capability from `discovery-index.json`; `—` means unclassified there.

| Slug | Title | Current category | Proposed category | Technology | Type | Platforms | Evidence (RE/NG/SW/CO/FL) | Maturity | Card preview | Stories | Variant surface | Capability |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `accordion` | Accordion | Data Display | **Layout & Structure** | Radix Accordion | Component | 5/5 | REH NGR SWB COB FLB | stable | demo | 2 | — | — |
| `address-fields` | Address Fields | Form Inputs | Forms & Inputs | — | Component (React-only) | 1/5 | REH NG– SW– CO– FL– | beta | demo, clipped 22px | 1 | — | forms |
| `alert` | Alert | Feedback | Feedback & Status | — | Component | 5/5 | REB NGH SWB COB FLB | stable | demo | 2 | variant: destructive/success/warning/info | application-foundations |
| `alert-dialog` | Alert Dialog | Overlays | Overlays | Radix Alert Dialog | Component | 5/5 | REH NGR SWB COB FLB | stable | mock | 1 | — | — |
| `amount-display` | Amount Display | Data Display | Data Display | — | Component (React-only) | 1/5 | REB NG– SW– CO– FL– | beta | demo | 1 | — | transactions |
| `app-bar` | App Bar | Navigation | Navigation | — | Component | 5/5 | REB NGR SWB COB FLB | stable | demo | 1 | — | application-foundations |
| `aspect-ratio` | Aspect Ratio | Foundations | **Layout & Structure** | Radix Aspect Ratio | Component | 5/5 | REB NGH SWB COB FLB | stable | mock | 2 | — | — |
| `audio-player` | Audio Player | Data Display | **Media & Content** | — | Component | 4/5 | REB NG– SWB COB FLB | stable | demo | 1 | — | — |
| `avatar` | Avatar | Data Display | Data Display | Radix Avatar | Component | 5/5 | REB NGH SWB COB FLB | stable | demo, fills 1% | 1 | — | — |
| `avatar-group` | Avatar Group | Data Display | Data Display | Radix Avatar | Component | 2/5 | REB NGH SW– CO– FL– | stable | demo, fills 4% | 1 | — | — |
| `badge` | Badge | Feedback | Feedback & Status | — | Component | 5/5 | REH NGH SWB COB FLB | stable | demo | 2 | variant: secondary/destructive/outline/subtle | observability |
| `banner` | Banner | Feedback | Feedback & Status | — | Component | 5/5 | REB NGR SWB COB FLB | stable | demo | 1 | variant: warning/success/error/action; sticky: false | observability, application-foundations |
| `breadcrumb` | Breadcrumb | Navigation | Navigation | — | Component | 5/5 | REB NGR SWB COB FLB | stable | mock, fills 4% | 1 | — | — |
| `button` | Button | Controls & Actions | Actions & Controls | — | Component | 5/5 | REH NGR SWB COH FLH | stable | demo, fills 2% | 6 | variant: Secondary/Outline/Destructive/Ghost/Link; size: md/lg/icon; state: Hove | — |
| `button-group` | Button Group | Controls & Actions | Actions & Controls | — | Component | 5/5 | REB NGR SWB COB FLB | stable | demo, fills 4% | 1 | — | — |
| `calendar` | Calendar | Form Inputs | Forms & Inputs | React DayPicker | Component | 4/5 | REB NG– SWB COB FLB | stable | demo, clipped 12px | 1 | — | booking-scheduling, forms |
| `card` | Card | Data Display | **Layout & Structure** | — | Component | 5/5 | REB NGR SWB COB FLB | stable | demo | 4 | — | — |
| `carousel` | Carousel | Data Display | **Media & Content** | Embla Carousel | Component | 5/5 | REB NGR SWB COB FLB | stable | demo, clipped 24px | 1 | — | — |
| `chart` | Chart | Data Display | Data Display | Recharts | Component | 4/5 | REB NG– SWB COB FLB | stable | mock | 1 | — | data-analytics |
| `checkbox` | Checkbox | Form Inputs | Forms & Inputs | Radix Checkbox | Component | 5/5 | REH NGR SWB COH FLH | stable | demo, fills 3% | 4 | — | — |
| `circular-progress` | Circular Progress | Feedback | Feedback & Status | Radix Progress | Component | 5/5 | REB NGH SWB COB FLB | stable | demo | 2 | — | data-analytics |
| `code-block` | Code Block | Foundations | **Data Display** | — | Component | 5/5 | REB NGR SWB COB FLB | stable | demo | 1 | — | developer-tools |
| `collapsible` | Collapsible | Data Display | **Layout & Structure** | Radix Collapsible | Component | 5/5 | REH NGR SWB COB FLB | stable | demo | 2 | — | — |
| `color-picker` | Color Picker | Form Inputs | Forms & Inputs | — | Component | 4/5 | REH NG– SWB COB FLB | stable | demo, clipped 10px | 1 | — | — |
| `combobox` | Combobox | Controls & Actions | **Forms & Inputs** | cmdk + Radix Popover | Pattern (recipe) | 2/5 | REB NGR SW– CO– FL– | stable | mock | 1 | — | — |
| `command` | Command | Controls & Actions | Actions & Controls | cmdk | Component | 5/5 | REH NGR SWB COB FLB | stable | mock | 1 | — | — |
| `comparison-slider` | Comparison Slider | Controls & Actions | **Media & Content** | — | Component | 5/5 | REB NGR SWB COB FLB | stable | demo | 1 | — | — |
| `context-menu` | Context Menu | Overlays | Overlays | Radix Context Menu | Component | 5/5 | REH NGR SWB COB FLB | stable | mock | 1 | — | — |
| `country-select` | Country Select | Form Inputs | Forms & Inputs | — | Component (React-only) | 1/5 | REH NG– SW– CO– FL– | beta | demo | 1 | — | forms |
| `data-grid` | Data Grid | Data Display | Data Display | — | Component | 4/5 | REH NG– SWB COB FLB | stable | demo, clipped 9px | 1 | — | data-analytics |
| `data-table` | Data Table | Data Display | Data Display | — | Component | 4/5 | REB NG– SWB COB FLB | stable | mock | 1 | — | data-analytics |
| `date-picker` | Date Picker | Form Inputs | Forms & Inputs | React DayPicker | Component | 4/5 | REB NG– SWB COB FLB | stable | demo | 1 | — | — |
| `date-range-input` | Date Range Input | Form Inputs | Forms & Inputs | — | Component (React-only) | 1/5 | REH NG– SW– CO– FL– | beta | demo | 1 | — | forms |
| `description-list` | Description List | Data Display | Data Display | — | Component | 5/5 | REB NGH SWB COB FLB | stable | demo | 1 | — | transactions |
| `dialog` | Dialog | Overlays | Overlays | Radix Dialog | Component | 5/5 | REH NGR SWB COB FLB | stable | mock | 1 | — | — |
| `diff-viewer` | Diff Viewer | Data Display | Data Display | — | Component | 4/5 | REB NG– SWB COB FLB | stable | demo | 1 | — | developer-tools |
| `direction-provider` | Direction Provider | Foundations | **Layout & Structure** | — | Component (React-only) | 1/5 | REH NG– SW– CO– FL– | stable | demo | 1 | — | — |
| `drawer` | Drawer | Overlays | Overlays | Vaul | Component | 5/5 | REH NGR SWB COB FLB | stable | mock | 1 | — | — |
| `dropdown-menu` | Dropdown Menu | Overlays | Overlays | Radix Dropdown Menu | Component | 5/5 | REH NGR SWB COB FLB | stable | mock | 1 | — | — |
| `empty` | Empty | Feedback | Feedback & Status | — | Component | 5/5 | REB NGH SWB COB FLB | stable | demo | 1 | variant: icon | — |
| `fab` | Fab | Controls & Actions | Actions & Controls | — | Component | 5/5 | REB NGR SWB COB FLB | stable | demo | 2 | variant: Secondary; size: sm; extended: false | — |
| `field` | Field | Form Inputs | Forms & Inputs | — | Component | 5/5 | REB NGR SWB COB FLB | stable | demo | 1 | intent: warning/success/info | forms |
| `file-upload` | File Upload | Form Inputs | Forms & Inputs | — | Component | 4/5 | REH NG– SWB COB FLB | stable | demo, clipped 14px | 1 | — | documents |
| `footer` | Footer | Data Display | **Layout & Structure** | — | Component | 5/5 | REB NGR SWB COB FLB | stable | mock | 1 | — | — |
| `form` | Form | Form Inputs | Forms & Inputs | React Hook Form + Radix | Component (React-only) | 1/5 | REH NG– SW– CO– FL– | stable | demo | 1 | — | forms |
| `guest-picker` | Guest Picker | Form Inputs | Forms & Inputs | — | Component (React-only) | 1/5 | REH NG– SW– CO– FL– | beta | demo | 1 | — | booking-scheduling |
| `hover-card` | Hover Card | Overlays | Overlays | Radix Hover Card | Component | 5/5 | REB NGR SWB COB FLB | stable | mock | 2 | — | — |
| `image` | Image | Foundations | **Media & Content** | — | Component | 5/5 | REB NGH SWB COB FLB | stable | mock | 2 | — | — |
| `inform` | Inform | Feedback | Feedback & Status | — | Component | 5/5 | REB NGR SWB COB FLB | stable | demo | 2 | variant: warning/success/error/action | application-foundations |
| `input` | Input | Form Inputs | Forms & Inputs | — | Component | 5/5 | REH NGR SWB COB FLB | stable | demo | 5 | state: Focus/Error/Disabled; corners: default/rounded/pill | — |
| `input-group` | Input Group | Form Inputs | Forms & Inputs | — | Component | 5/5 | REB NGR SWB COB FLB | stable | demo | 3 | align: end | transactions, forms |
| `input-otp` | Input OTP | Form Inputs | Forms & Inputs | — | Component | 5/5 | REH NGR SWB COB FLB | stable | demo | 0 | — | identity-security |
| `json-viewer` | JSON Viewer | Data Display | Data Display | — | Component | 4/5 | REH NG– SWB COB FLB | stable | demo | 1 | — | developer-tools |
| `kanban-board` | Kanban Board | Data Display | Data Display | — | Component (React-only) | 1/5 | REB NG– SW– CO– FL– | stable | demo | 1 | — | workflow |
| `kbd` | Kbd | Foundations | **Data Display** | — | Component | 5/5 | REB NGH SWB COB FLB | stable | demo, fills 1% | 1 | — | — |
| `label` | Label | Foundations | **Forms & Inputs** | Radix Label | Component | 5/5 | REH NGR SWB COB FLB | stable | demo, fills 3% | 1 | — | — |
| `list` | List | Data Display | Data Display | — | Component | 5/5 | REH NGR SWB COB FLB | stable | demo | 1 | — | — |
| `markdown-editor` | Markdown Editor | Form Inputs | Forms & Inputs | — | Component | 4/5 | REH NG– SWB COB FLB | stable | demo | 1 | — | developer-tools, ai |
| `marquee` | Marquee | Data Display | **Media & Content** | — | Component | 5/5 | REB NGH SWB COB FLB | stable | demo, fills 4% | 1 | — | — |
| `menubar` | Menubar | Navigation | Navigation | Radix Menubar | Component | 5/5 | REH NGR SWB COB FLB | stable | mock | 1 | — | — |
| `message-bubble` | Message Bubble | Data Display | Data Display | — | Component | 4/5 | REB NG– SWB COB FLB | stable | demo | 1 | — | communication, ai |
| `metric` | Metric | Feedback | **Data Display** | — | Component | 5/5 | REB NGH SWB COB FLB | stable | demo | 2 | — | data-analytics, transactions, observability |
| `modal` | Modal | Overlays | Overlays | Radix Dialog | Component | 5/5 | REH NGR SWB COB FLB | stable | mock | 1 | — | — |
| `multi-select` | Multi-Select | Form Inputs | Forms & Inputs | — | Component | 5/5 | REH NGR SWB COB FLB | stable | demo | 2 | — | data-analytics |
| `native-select` | Native Select | Form Inputs | Forms & Inputs | — | Component | 2/5 | REB NGR SW– CO– FL– | stable | demo, fills 5% | 2 | state: Focus/Error/Disabled; corners: default/rounded/pill | — |
| `navigation-bar` | Navigation Bar | Navigation | Navigation | — | Component | 5/5 | REB NGR SWB COB FLB | stable | demo | 1 | — | application-foundations |
| `navigation-menu` | Navigation Menu | Navigation | Navigation | Radix Navigation Menu | Component | 2/5 | REB NGR SW– CO– FL– | stable | demo, fills 4% | 1 | — | — |
| `notification-center` | Notification Center | Overlays | **Feedback & Status** | — | Component | 5/5 | REB NGR SWB COB FLB | beta | demo, fills 1% | 1 | — | — |
| `number-input` | Number Input | Form Inputs | Forms & Inputs | — | Component | 5/5 | REH NGR SWB COB FLB | stable | demo, fills 4% | 3 | — | transactions, booking-scheduling, forms |
| `page-header` | Page Header | Navigation | Navigation | — | Component | 5/5 | REB NGH SWB COB FLB | stable | mock | 1 | — | application-foundations |
| `pagination` | Pagination | Controls & Actions | **Navigation** | — | Component | 5/5 | REB NGR SWB COB FLB | stable | mock | 1 | — | — |
| `pass-card` | Pass Card | Data Display | Data Display | — | Component (React-only) | 1/5 | REB NG– SW– CO– FL– | beta | demo, clipped 85px | 2 | — | transactions, booking-scheduling, passes-tickets |
| `password-input` | Password Input | Form Inputs | Forms & Inputs | — | Component | 5/5 | REB NGR SWB COB FLB | stable | demo | 1 | — | identity-security |
| `phone-input` | Phone Input | Form Inputs | Forms & Inputs | — | Component (React-only) | 1/5 | REH NG– SW– CO– FL– | beta | demo | 1 | — | forms |
| `popover` | Popover | Overlays | Overlays | Radix Popover | Component | 5/5 | REH NGR SWB COB FLB | stable | mock | 2 | — | — |
| `price-breakdown` | Price Breakdown | Data Display | Data Display | — | Component (React-only) | 1/5 | REB NG– SW– CO– FL– | beta | demo, clipped 8px | 2 | — | transactions |
| `progress` | Progress | Feedback | Feedback & Status | Radix Progress | Component | 5/5 | REB NGH SWB COB FLB | stable | demo, fills 1% | 2 | — | transactions |
| `quote` | Quote | Data Display | **Media & Content** | — | Component | 5/5 | REB NGH SWB COB FLB | stable | demo | 1 | — | — |
| `radio-group` | Radio Group | Form Inputs | Forms & Inputs | Radix Radio Group | Component | 5/5 | REH NGR SWB COB FLB | stable | demo | 4 | — | — |
| `rating` | Rating | Form Inputs | Forms & Inputs | — | Component | 5/5 | REB NGR SWB COB FLB | stable | demo, fills 4% | 2 | size: md/lg | — |
| `reference-code` | Reference Code | Data Display | Data Display | — | Component (React-only) | 1/5 | REH NG– SW– CO– FL– | beta | demo | 1 | — | transactions |
| `resizable` | Resizable | Data Display | **Layout & Structure** | react-resizable-panels | Component | 5/5 | REB NGR SWB COB FLB | stable | mock | 1 | — | application-foundations |
| `result-state` | Result State | Feedback | Feedback & Status | — | Component (React-only) | 1/5 | REH NG– SW– CO– FL– | beta | demo, clipped 92px | 2 | status: error/warning/pending/info/partial | transactions, application-foundations |
| `scroll-area` | Scroll Area | Data Display | **Layout & Structure** | Radix Scroll Area | Component | 5/5 | REB NGR SWB COB FLB | stable | mock | 1 | — | — |
| `segmented-control` | Segmented Control | Controls & Actions | Actions & Controls | — | Component | 5/5 | REB NGR SWB COB FLB | stable | demo | 2 | — | — |
| `select` | Select | Form Inputs | Forms & Inputs | Radix Select | Component | 5/5 | REH NGR SWB COB FLB | stable | demo | 3 | — | — |
| `separator` | Separator | Foundations | **Layout & Structure** | Radix Separator | Component | 5/5 | REB NGH SWB COB FLB | stable | mock | 2 | — | — |
| `sheet` | Sheet | Overlays | Overlays | Radix Dialog | Component | 5/5 | REH NGR SWB COB FLB | stable | mock | 1 | side: bottom/left/right/start/end | — |
| `sidebar` | Sidebar | Navigation | Navigation | — | Component | 5/5 | REB NGR SWB COB FLB | stable | demo | 1 | variant: outline; size: sm/lg | application-foundations |
| `skeleton` | Skeleton | Foundations | **Feedback & Status** | — | Component | 5/5 | REB NGH SWB COB FLB | stable | demo | 1 | — | — |
| `slider` | Slider | Form Inputs | Forms & Inputs | Radix Slider | Component | 5/5 | REH NGR SWB COB FLB | stable | demo, fills 2% | 2 | — | — |
| `sonner` | Sonner | Feedback | Feedback & Status | Sonner | Component | 5/5 | REB NGR SWB COB FLB | stable | demo, fills 3% | 1 | — | — |
| `spinner` | Spinner | Foundations | **Feedback & Status** | — | Component | 5/5 | REB NGH SWB COB FLB | stable | demo, fills 3% | 2 | size: md/lg; variant: muted/onColor | application-foundations |
| `stepper` | Stepper | Navigation | Navigation | — | Component | 5/5 | REB NGH SWB COB FLB | stable | demo | 1 | — | workflow |
| `switch` | Switch | Form Inputs | Forms & Inputs | Radix Switch | Component | 5/5 | REH NGR SWB COH FLH | stable | demo, fills 3% | 5 | — | — |
| `tab-bar` | Tab Bar | Navigation | Navigation | Radix Tabs | Component | 5/5 | REB NGR SWB COB FLB | stable | demo | 1 | — | — |
| `table` | Table | Data Display | Data Display | — | Component | 4/5 | REB NG– SWB COB FLB | stable | mock | 2 | — | — |
| `table-of-contents` | Table of Contents | Navigation | Navigation | — | Component | 5/5 | REB NGR SWB COB FLB | stable | mock | 1 | — | — |
| `tabs` | Tabs | Navigation | Navigation | Radix Tabs | Component | 5/5 | REH NGR SWB COH FLH | stable | demo | 4 | — | — |
| `tag` | Tag | Feedback | Feedback & Status | — | Component | 5/5 | REH NGR SWB COB FLB | stable | demo | 2 | variant: secondary/destructive/warning/outline | data-analytics |
| `textarea` | Textarea | Form Inputs | Forms & Inputs | — | Component | 5/5 | REH NGR SWB COB FLB | stable | demo | 4 | state: Focus/Error/Disabled | — |
| `time-slot-picker` | Time Slot Picker | Form Inputs | Forms & Inputs | — | Component (React-only) | 1/5 | REH NG– SW– CO– FL– | beta | demo, clipped 6px | 2 | — | booking-scheduling |
| `timeline` | Timeline | Data Display | Data Display | — | Component | 5/5 | REB NGH SWB COB FLB | stable | demo | 2 | — | transactions, workflow |
| `toggle` | Toggle | Controls & Actions | Actions & Controls | Radix Toggle | Component | 5/5 | REH NGR SWB COB FLH | stable | demo, fills 1% | 3 | variant: pill/outline; size: sm/lg | — |
| `toggle-group` | Toggle Group | Controls & Actions | Actions & Controls | Radix Toggle Group | Component | 5/5 | REH NGR SWB COB FLB | stable | demo, fills 3% | 3 | — | — |
| `tooltip` | Tooltip | Overlays | Overlays | Radix Tooltip | Component | 5/5 | REH NGR SWB COB FLB | stable | mock | 2 | — | — |
| `tour` | Tour | Overlays | **Feedback & Status** | — | Component | 2/5 | REH NGR SW– CO– FL– | stable | demo | 1 | — | — |
| `tree-view` | Tree View | Navigation | Navigation | — | Component | 4/5 | REH NG– SWB COB FLB | stable | demo | 1 | — | — |
| `virtual-list` | Virtual List | Data Display | Data Display | — | Component | 4/5 | REB NG– SWB COB FLB | stable | demo, clipped 9px | 1 | — | — |
