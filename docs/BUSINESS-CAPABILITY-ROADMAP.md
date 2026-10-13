# Business capability roadmap

**Started:** 2026-10-13 · **Baseline audited:** `main` at the start of Phase 1 (98 catalogue entries, 20 blocks,
47 export lines in `@kinetixui/iot/react`) · **Method:** read the manifests and the source; nothing is listed as
existing unless the repository has it, and `pnpm check:capabilities` keeps it that way.

This document plans how KinetixUI grows from a component library into a system for business applications —
commerce, booking, finance, admin, workflow, healthcare, logistics, collaboration, developer and AI tools — without
turning into a pile of near-duplicates. It has three parts:

1. **Architecture** — the four layers, the five platform targets, and the Core/Pro rules every row is judged by.
2. **Phases** — the order of work, and why.
3. **The capability table** — every capability in families A–AD, generated from
   [`docs/business-capabilities.json`](./business-capabilities.json).

> **Pro does not exist.** "Pro candidate" in this document is an internal planning label for where a future
> boundary *could* be drawn. It is not a product, a price or a promise, and it must not be marketed or teased
> (`marketing/STRATEGY.md`, rule 7). Nothing that ships today is behind it.

---

## 1. Audit — what the catalogue already covers

The roadmap started from an inventory, not a wishlist. The short version:

| Finding | What it means for the roadmap |
| --- | --- |
| **Most "new" business primitives already exist under another name.** SummaryList/KeyValueList is `DescriptionList`; MetricCard is `Metric` (label, value, trend, change, icon, chart slot, on all five platforms); IncidentBanner is `Banner`; OTPInput is `InputOTP`; FileUploader is `FileUpload` with per-file status; SplitPane is `Resizable`; WorkflowStepper is `Stepper`; JSONViewer is `JsonViewer`. | These rows are marked *existing* with a pointer. No duplicates are planned. Gaps (Metric's goal progress, DescriptionList's plain-summary skin) are extensions of the existing component. |
| **Chart coverage is wider than the catalogue suggests.** `/charts` ships ~30 themed Recharts recipes — line, area, bar, stacked, pie, donut, radial, radar, scatter, step, sparkline, funnel, gauge, heatmap, calendar heatmap, treemap, waterfall, bullet, histogram, box plot, Sankey, candlestick, bump, dumbbell — plus brush/zoom, reference bands, interactive legend, loading/empty/error, a screen-reader data table and pattern fills. | Charts are *recipes*, React-only. Whether to export typed chart components is a Phase 3 decision, and no charting dependency is added without an architecture review. |
| **The IoT package is the most complete domain layer.** Controls, monitoring, freshness, command lifecycle, alerts, spaces, pairing, firmware, activity — 47 export lines in `@kinetixui/iot/react`. | Family S is almost entirely *existing*. Its connectivity/freshness model is the one Core should lift for SyncStatus/StaleDataState (Phase 3) rather than invent a second one. IoT is paused for new work until real-device evidence exists. |
| **Blocks already cover several "business" asks.** `order-summary` (cart lines with quantity), `pricing-tier`, `filter-panel`, `account-security` (sessions, recovery), `sign-in`/`create-account` (auth shell, password meter), `comment-box`, `stat-cards`. | Those rows are *block* or *partial*. Blocks must exist on all five platforms (`check:block-source`), which shapes where Receipt and Checkout land. |
| **Transactional outcomes had no foundation.** There was no outcome screen (Empty is "nothing here yet", Alert/Inform are inline notices), no copyable reference code, no amount breakdown, no pass/ticket surface. | This is Phase 1. |
| **Two drifts surfaced.** React's `Timeline` has no per-item status while Angular's `KxTimelineItem` does; `DataGrid` pins columns `left`/`right` rather than start/end. | StatusTimeline is *partial* (fix the drift, don't add a component — Phase 2). DataGrid's pinning is an RTL contract defect to fix before extending it (Phase 3). |

## 2. Architecture

### 2.1 Layers

| Layer | What belongs here | Rule |
| --- | --- | --- |
| **L1 Core primitives** | Domain-free building blocks: inputs, overlays, navigation, tables, charts infrastructure, status, layout. | Must make sense in any product. Usually cross-platform. |
| **L2 Enterprise / business-neutral** | Patterns every business app needs, named without an industry: ResultState, ReferenceCode, PriceBreakdown, PassCard, AmountDisplay, StatusTimeline, PermissionMatrix, AuditTrail, QueryBuilder. | No domain words in names or props. One L2 foundation replaces many domain variants. |
| **L3 Domain** | Components whose behaviour (not just wording) is specific to a domain: FlightCard, SeatMap, VitalSign, ProductCard, the IoT package. | Built on L1/L2. Allowed only when a composition cannot express the behaviour. React-first. |
| **L4 Composed blocks** | Screens and sections: Receipt, Checkout, Booking flow, KYC flow, Role editor. | Never a component. Lives in `blocks.manifest.json` (five platforms) or as a documented recipe. |

The test for promoting something up a layer is behaviour: **a PassCard that says "Gate" instead of "Bay" is the same
component; a SeatMap with a 2D roving-focus model is not.**

### 2.2 Platform targets

| Target | Meaning | Examples |
| --- | --- | --- |
| **Cross-platform Core** | React plus Angular, SwiftUI, Compose and Flutter, eventually. A new one may start React-first, with native *composition* guidance until a port is justified. | ResultState, ReferenceCode, AmountDisplay, StatusTimeline |
| **Web-first Enterprise** | Dense desktop patterns whose interaction model does not translate to phones; React (and later Angular) only. | DataGrid, QueryBuilder, PermissionMatrix, CalendarWeek |
| **React-only Domain** | L3 components; React only unless demand proves otherwise. | FlightCard, SeatMap, VitalSign, the IoT package |
| **Block / composition** | Assembled from components; a block on all five platforms, or a docs recipe. | Receipt, Checkout, TicketCard |
| **Pro candidate** | Planning label only (see the note at the top). | DataGrid advanced, PivotTable, Gantt, Pro motion |

### 2.3 Core/Pro rules

1. **Never paywalled:** accessibility, reduced motion, RTL, dark mode and high contrast, security fundamentals, basic
   forms, navigation, overlays, the essential table, default motion, and truthful IoT state. The generator enforces a
   floor of named rows that can never be Pro.
2. **Pro is decided by organisational value, not difficulty.** SeatMap is hard and Core; PivotTable is analyst tooling
   and a Pro candidate. The test: does it serve a team's *advanced* workflow (analysis, planning at scale, brand
   tooling) rather than a person completing a task?
3. **The boundary is drawn above what shipped.** Owner decision 2026-09-21 (`CORE-AUDIT.md` §6): DataGrid stays Core;
   any Pro line sits above it (grouping with totals, pivoting, export, server models).
4. **Core never depends on Pro.** (`CORE-AUDIT.md` item 32.)

### 2.4 Rules every new capability follows

- **No fake functionality.** A barcode or QR is rendered from supplied content; nothing encodes. Amounts are supplied
  formatted; nothing guesses a currency. A copy button that fails says so.
- **No compliance claims.** A UI component cannot make a product PCI-DSS, HIPAA, or KYC compliant. Payment-card
  fields, if built, are for styling PSP-agnostic flows; most products should use their PSP's hosted fields.
- **Requested is not reported.** IoT and any future device/remote-state UI keep the command lifecycle: a request is
  not shown as physical truth until the device reports it.
- **AI interfaces show user-visible execution status only** — tool calls, sources, progress — never hidden reasoning.
- **Existing tokens only.** A missing semantic token goes through the token pipeline, never an arbitrary value.
- **No new animation or charting dependency** without an architecture review.

## 3. Phases

The brief proposed phases 0–10. The order below keeps that shape; changes are noted with reasons.

| Phase | Scope | Why here |
| --- | --- | --- |
| **0 — Audit and roadmap** | This document, the capability data, the truthfulness check. | Done in the same change as Phase 1. |
| **1 — Transactional foundations** | ResultState, ReferenceCode, PriceBreakdown, PassCard (React; native composition guidance; Angular planned). | Smallest set that unlocks the most domain screens. **Shipped in this change — see §4.** |
| **2 — Money, status and commerce/booking blocks** | **AmountDisplay** (pulled forward from 5), **StatusTimeline** (fix React/Angular drift), Receipt block, address/phone/country/date-range fields (pulled forward from AC), quantity contract, migrate `order-summary` onto PriceBreakdown, booking pickers. | Every commerce and booking surface prints money and a status timeline; building those surfaces before the money contract would freeze ad-hoc formatting into each. |
| **3 — Data, analytics and status** | DataGrid RTL pinning fix, then its missing enterprise features; FilterBar as a component; QueryBuilder; Metric goal + sparkline; chart export decision; lift IoT's freshness/connectivity model into Core status states. | Needs Phase 2's AmountDisplay for financial cells. |
| **4 — Admin, IAM, workflow and audit** | PermissionMatrix, WorkspaceSwitcher, API keys, ApprovalFlow, TaskQueue, SLAIndicator, AuditTrail, EntityCard, enterprise layouts. | Builds on StatusTimeline and DataTable. |
| **5 — Finance, billing and loyalty** | MoneyInput, TransactionList, **TransactionCard** (deferred from Phase 1), subscriptions, usage meters, invoices, wallet/rewards. | Needs AmountDisplay (2) and the data patterns (3). |
| **6 — Documents, compliance and healthcare** | FileManager, DocumentViewer shell, VersionHistory, VerificationStepper, KYC block, clinical display components. | Display-only domains with high review cost; after the patterns they reuse. |
| **7 — Maps, logistics and spatial** | Map controls (engine supplied), markers, route and shipment status, spatial IoT once hardware evidence exists. | No map dependency; IoT spatial waits on real devices. |
| **8 — Scheduling and work management** | CalendarWeek/Day, Scheduler, KanbanBoard swimlanes, TaskCard. | Time-grid accessibility is the hardest open problem; goes after the simpler L2 work. |
| **9 — Collaboration, developer, observability and AI** | Conversation, MentionInput, LogViewer, deployment status, health checks, PromptInput, AgentTask, citations. | Mostly composition over existing parts. |
| **10 — Pro candidates** | Advanced grid, pivot, Gantt, dependency graphs, geofencing, Pro motion. | Only after Core is complete enough that the line is obvious, and only with an owner decision that a Pro tier exists at all. |

**Reorders, with reasons**

- **AmountDisplay 5 → 2** and **AddressForm/PhoneInput/CountrySelect/DateRange (AC) → 2**: commerce and booking need
  them immediately.
- **TransactionCard 1 → 5**: its amount, sign and status vocabulary belong to the money contract; shipping it first
  would freeze that API by accident.
- **StatusTimeline → 2 as a fix, not a component**: the shape exists on five platforms; React lacks the per-item status
  Angular already has.
- **DataGrid RTL fix first in 3**: extending a component with a physical-direction API compounds the defect.

## 4. Phase 1 record

Four components, all `@kinetixui/ui`, React, status **beta** (since 0.25.0). Native platforms get *composition*
guidance (`components.manifest.json`), Angular is *planned* (data wave). Each replaces a family of domain screens:

| Component | Replaces | Key decisions |
| --- | --- | --- |
| `ResultState` | PaymentSuccess, BookingConfirmed, OrderConfirmed, RefundConfirmed, TransferSuccess, ApplicationSubmitted, TicketIssued, VoucherRedeemed | Six statuses (success, error, warning, pending, info, partial), each with its own glyph shape and a named mark (`statusLabel`, localisable) so status is never icon- or colour-only. A `<section>` named by its required title. Opt-in polite live region for in-place changes. Flat props (title, description, reference, two actions, details) — every real screen fits. |
| `ReferenceCode` | Booking reference, order number, transaction ID, voucher code, ticket | `select-all`, `translate="no"`, a real button named "Copy &lt;label&gt;", an always-present status region, and an honest failure path: on a refused or missing Clipboard API it selects the code and says so. |
| `PriceBreakdown` | Order totals, invoice totals, quote, refund, transfer fees, payroll | A `<dl>`; amounts supplied formatted (sign included), tabular, on the inline end so they mirror. Deductions add colour as reinforcement only. Wraps at 200% text instead of clipping. No "cart" or "order" wording. |
| `PassCard` | Boarding pass, event/rail/bus ticket, parking permit, voucher, gift card, membership | An `<article>` named by its title; fields as a `<dl>` that reflows by rem minimum width; a real `<hr>` tear line; `PassCardCode` renders a **supplied** code as a named image with a readable caption — no encoder, no recolouring for dark mode. Nothing says "flight". |

Not built in Phase 1, on purpose: **SummaryList/KeyValueList** (exists as DescriptionList), **TicketCard** (a PassCard
composition), **TransactionCard** (Phase 5, see above), **Receipt** (a block, Phase 2 — publishing a block requires all
five platforms).

## 5. Capability table

Generated from `docs/business-capabilities.json` by `pnpm gen:capabilities`; `pnpm check:capabilities` fails if this
section is stale or if any row cites evidence that does not exist. **Status** uses: *existing* (shipped component),
*partial* (shipped but missing named parts), *recipe* / *block* (shipped as a composition), *planned*, *Pro candidate*,
*not planned*. **Evidence** is `ui:<manifest slug>`, `iot:<export>`, `block:<blocks.manifest slug>` or a file.

<!-- BEGIN GENERATED: capability tables (pnpm gen:capabilities) -->

169 capabilities in 30 families. Existing 41, partial 27, planned 92, Pro candidate 8, not planned 1.

### Summary by phase

| Phase | Capabilities |
| --- | --- |
| 1 | ResultState, SuccessState / ErrorState / WarningState / PendingState / PartialSuccessState, ReferenceCode, PriceBreakdown, SummaryList / KeyValueList, PassCard, TicketCard, PassCard foundation, PassBarcode / PassQRCode, MoneyMovementSummary / FeeBreakdown, ProcessingState / PendingState |
| 2 | Receipt, StatusTimeline, Domain result screens, ProductCard, ProductVariant / ProductOption, ProductQuantity / CartQuantity / QuantityPicker, Cart, CartDrawer / MiniCart, Checkout, OrderSummary, OrderCard, ReturnRequest, RefundSummary / RefundStatus, AvailabilityPicker / AppointmentPicker, TimeSlotPicker, GuestPicker, ResourcePicker / ProviderPicker / LocationPicker / ServicePicker, BookingCard / ReservationCard, BookingTimeline, Booking flow, FlightCard, BaggageAllowance / GateInfo / BoardingGroup, BoardingPass, TrainTicket / BusTicket / EventTicket, SeatMap, TravelerCard / PassengerList / TravelerDocumentStatus, Itinerary, TripSummary / TripPriceBreakdown / TripStatus, Pass compositions, Receipt blocks, AmountDisplay, WalletCard / GiftCard / LoyaltyCard, FormSection / FieldArray / RepeatableFieldGroup / ConditionalField / DependentSelect, AddressForm / PhoneInput / CountrySelect / TimezoneSelect, DateRangeInput / DateTimeRangeInput |
| 3 | DataGrid, QueryBuilder, FilterBar, MetricCard, Chart infrastructure, Core chart types, Gauge, Advanced chart types, RangeChart, SyncStatus / ConnectionStatus / StaleDataState / OfflineState, ConflictState / MaintenanceState |
| 4 | PermissionMatrix, RoleEditor, WorkspaceSwitcher, SessionManager / DeviceSession, APIKeyTable / SecretKeyManager, AuthShell / AuthCard, PasswordStrength / PasswordRequirement, RecoveryCodeList, MFA setup, ApprovalFlow, TaskQueue, SLAIndicator, WorkflowHistory, AuditTrail, EntityCard / StatusCard foundation, ActivityFeed, MasterDetail, InspectorPanel / UtilityPanel / WorkspaceLayout, ApprovalStatus |
| 5 | TransactionCard, Invoice, MoneyInput, ExchangeRateDisplay / ExchangeRate, PercentageInput / UnitInput, IBANInput / AccountNumberInput, PaymentCardInput, TransactionList, PricingTable, PlanSummary / SubscriptionCard / SubscriptionStatus / BillingCycle / RenewalStatus, UsageMeter / QuotaMeter / CreditBalance, InvoiceList / PaymentHistory, Upgrade / downgrade / cancel flows, WalletBalance / GiftCardBalance, WalletTransaction, RewardPoints / RewardProgress / RewardTier / LoyaltyStatus / LoyaltyBenefits, RewardHistory, GiftCardRedeem, DurationInput / UnitInput |
| 6 | VerificationStepper, DocumentCapture / DocumentPreview, IdentityReview, SignaturePad, KYC flow, FileManager, DocumentViewer shell, VersionHistory, PatientSummary / PatientStatus / PatientAlert, VitalSign, MedicationList, AppointmentCard / AppointmentStatus, ClinicalTimeline, LabResultTable, ConsentStatus |
| 7 | Map controls, MapMarker / MapMarkerCard / MapCluster, RouteSummary, FleetVehicleCard / VehicleStatus, ShipmentCard / ShipmentStatus / ShipmentTimeline / TrackingTimeline / DeliveryStatus, SpatialDeviceMarker, DeviceMaintenance |
| 8 | TimelineChart, CalendarWeek / CalendarDay / CalendarEvent / CalendarResource, Scheduler / AvailabilityGrid / TimelinePlanner, PipelineBoard, KanbanBoard, TaskCard / Milestone |
| 9 | MessageBubble / Conversation / Thread, CommentComposer / CommentThread, MentionInput, PresenceIndicator / ReactionPicker, CodeEditorShell, LogViewer, EnvironmentBadge / DeploymentStatus / DeploymentStep, StatusCard / StatusIndicator, HealthCheckList, IncidentTimeline, AlertRuleBuilder, PromptInput, ChatMessage / AssistantResponse / StreamingText, ToolCall / Citation / SourcesPanel, AgentTask |
| 10 | DataGrid advanced, PivotTable, GanttChart, Advanced workflow tooling (visual designer, simulation), GeofenceEditor, Gantt, DependencyGraph, Pro motion |
| — | DataTable, Wallet export (Apple Wallet / Google Wallet), OTPInput, WorkflowStepper, FileUploader, IoT controls, IoT monitoring, IoT summaries & cards, RequestedState / ReportedState / PendingDeviceState / CommandStatus, DeviceAlert, ZoneSummary, DeviceActivityTimeline, DeviceProvisioningStepper, DeviceFirmwareStatus, Calendar, DiffViewer, JSONViewer, IncidentBanner, AppShell / Sidebar / Header, PageHeader / ContextBar, SplitPane / ResizablePanels, StatusBanner / InlineStatus, Core motion |

### A. Data & analytics

| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DataGrid | DataGridHeader, DataGridHeaderCell, DataGridBody, DataGridRow, DataGridCell, DataGridGroupRow, DataGridColumnMenu, DataGridFilterMenu, DataGridSelectionToolbar, DataGridColumnVisibility, DataGridDensityControl, DataGridPagination, DataGridEmptyState | L2 Enterprise | Core | Web-first Enterprise | partial | ui:data-grid | Pagination, Empty, FilterBar | 3 | Shipped (React): row virtualization, column resize, drag reorder, pinning, client sort, editable cells, range selection and copy, full keyboard model. Missing: server-driven sort/filter hooks, row groups, expandable rows, column visibility and density controls, a batch-action toolbar, cell validation, pagination or infinite loading. Pinning is spelled `left`/`right`, not start/end — an RTL contract defect to fix before extending. Native ports are a documented scope-down; Angular is planned. |
| DataTable | — | L1 Core primitive | Core | Cross-platform Core | existing | ui:data-table | — | — | TanStack-based table on React plus native ports; the light alternative to DataGrid. Angular planned (data wave). |
| DataGrid advanced | aggregation, multi-level grouping with totals, spreadsheet export, million-row server model, master/detail | L2 Enterprise | Pro | Pro candidate | Pro candidate | — | DataGrid | 10 | Advanced organisational value (analyst tooling), not difficulty, is why this is a Pro candidate. Keyboard, RTL and accessibility of the base grid stay Core. |
| QueryBuilder | QueryGroup, QueryRule, QueryFieldSelect, QueryOperatorSelect, QueryValueEditor, QueryPresetSelect | L2 Enterprise | Core | Web-first Enterprise | planned | — | Select, MultiSelect, DatePicker, NumberInput, FilterBar | 3 | A rule tree with a keyboard-operable add/remove/reorder model. The query it produces is data the product executes; the component never runs it. |
| FilterBar | FilterChip, FilterGroup, FilterPreset, FilterSearch, FilterClear | L2 Enterprise | Core | Web-first Enterprise | partial | block:filter-panel, ui:tag, ui:multi-select | — | 3 | Today a block (removable tags, a price slider, the filters behind them) assembled from Tag and MultiSelect. Promote to a component once two consumers (DataGrid, QueryBuilder) need the same chip contract. |
| MetricCard | MetricValue, MetricDelta, MetricTrend, MetricGoal, MetricSparkline | L2 Enterprise | Core | Cross-platform Core | partial | ui:metric, block:stat-cards | Sparkline | 3 | Metric already has label, value, trend, change, icon and a chart slot on all five platforms — it IS MetricCard under another name. Missing: progress toward a goal, and a built-in sparkline (bring-your-own today). Extend Metric; do not add MetricCard. |
| PivotTable | — | L2 Enterprise | Pro | Pro candidate | Pro candidate | — | DataGrid | 10 | Analyst tooling. Pro candidate. |

### B. Data visualization

| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Chart infrastructure | Chart, ChartAxis, ChartLegend, ChartTooltip, ChartCrosshair, ChartReferenceLine, ChartBrush, ChartEmptyState | L1 Core primitive | Core | Cross-platform Core | partial | ui:chart, `charts-content.tsx` | — | 3 | React: ChartContainer, tooltip, legend, loading/empty/error states and a screen-reader data table on Recharts. Reference lines and brush exist as recipes; a crosshair does not. Natives ship a narrower KinetixChart; Angular planned. No new charting dependency without an architecture review. |
| Core chart types | LineChart, AreaChart, BarChart, StackedBarChart, PieChart, DonutChart, ScatterChart, Histogram, Sparkline | L1 Core primitive | Core | Cross-platform Core | recipe | `charts-content.tsx` | Chart infrastructure | 3 | Shipped as React recipes on /charts (themed Recharts compositions), not exported components. Exporting typed components is a Phase 3 decision, and native parity is narrower. |
| Gauge | ProgressRing | L1 Core primitive | Core | Cross-platform Core | recipe | `charts-content.tsx`, ui:circular-progress | — | 3 | Gauge is a /charts recipe; ProgressRing exists as CircularProgress on all five platforms. |
| Advanced chart types | WaterfallChart, FunnelChart, Heatmap, Treemap, RadarChart, CandlestickChart, BoxPlot | L1 Core primitive | Core | Web-first Enterprise | recipe | `charts-content.tsx` | Chart infrastructure | 3 | All seven ship as React recipes on /charts (plus Sankey, bullet, bump, dumbbell). Web-first; no native recipes. |
| RangeChart | — | L1 Core primitive | Core | Web-first Enterprise | planned (recipe) | — | Chart infrastructure | 3 | Min/max band over time (forecast ranges, vital ranges). A recipe on the existing infrastructure. |
| TimelineChart | — | L1 Core primitive | Core | Web-first Enterprise | planned (recipe) | — | Chart infrastructure | 8 | Events on a time axis; overlaps Scheduling's TimelinePlanner — build once. |
| GanttChart | — | L2 Enterprise | Pro | Pro candidate | Pro candidate | — | TimelinePlanner, DataGrid | 10 | Dependency-aware planning is advanced organisational tooling. |

### C. Transactional experience

| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ResultState | ResultStateActions (primaryAction/secondaryAction props) | L2 Enterprise | Core | Cross-platform Core | existing | ui:result-state | — | 1 | Phase 1. One foundation for PaymentSuccess, BookingConfirmed, OrderConfirmed, RefundConfirmed, TransferSuccess, ApplicationSubmitted, TicketIssued, VoucherRedeemed. success, error, warning, pending, info and partial. React-first; natives compose KinetixEmpty; Angular planned. |
| SuccessState / ErrorState / WarningState / PendingState / PartialSuccessState | — | L2 Enterprise | Core | Cross-platform Core | existing | ui:result-state | — | 1 | Not separate components: each is `<ResultState status="…">`. Listed so nobody builds them. |
| ReferenceCode | ReferenceCodeCopy (built in) | L2 Enterprise | Core | Cross-platform Core | existing | ui:reference-code | — | 1 | Phase 1. Selectable, copyable, announced; honest failure path when the clipboard is unavailable. |
| PriceBreakdown | PriceBreakdownLine, PriceBreakdownTotal | L2 Enterprise | Core | Cross-platform Core | existing | ui:price-breakdown | — | 1 | Phase 1. Subtotal, tax, fees, discount, shipping, credit, total — values supplied formatted; no commerce-only wording. |
| SummaryList / KeyValueList | — | L1 Core primitive | Core | Cross-platform Core | existing | ui:description-list | — | 1 | Exists as DescriptionList on all five platforms. No new component. Its term column is a fixed 6rem mono caps skin; a `variant` for plain summaries is a candidate follow-up, not a new primitive. |
| PassCard | PassCardHeader, PassCardTitle, PassCardDescription, PassCardFields, PassCardField, PassCardDivider, PassCardCode, PassCardFooter | L2 Enterprise | Core | Cross-platform Core | existing | ui:pass-card | — | 1 | Phase 1. Foundation for boarding passes, tickets, vouchers, permits, memberships. Renders a supplied code; never encodes. |
| TicketCard | — | L3 Domain | Core | Block / composition | recipe | ui:pass-card | — | 1 | A PassCard composition (a stub after PassCardDivider), shown on the PassCard page. Not a component. |
| TransactionCard | — | L2 Enterprise | Core | Cross-platform Core | planned | — | AmountDisplay, ResultState, StatusTimeline | 5 | Deferred from Phase 1 on purpose: its amount, sign and status vocabulary belong to the money-display contract (AmountDisplay, TransactionRow). Building it first would freeze that API by accident. |
| Receipt | ReceiptHeader, ReceiptLine, ReceiptTotal, ReceiptTax, ReceiptPaymentMethod, ReceiptReference | L4 Block | Core | Block / composition | planned (block) | — | PriceBreakdown, ReferenceCode, DescriptionList, Card | 2 | A block, not a component: Card + DescriptionList (merchant, date, payment method) + PriceBreakdown + ReferenceCode. ReceiptLine/Total/Tax ARE PriceBreakdownLine/Total. Publishing a block needs all five platforms (check:block-source). |
| StatusTimeline | — | L1 Core primitive | Core | Cross-platform Core | partial | ui:timeline | — | 2 | Timeline exists on all five platforms, but only Angular's KxTimelineItem carries a per-item `status`; React's Timeline has none. Align React (and natives) with Angular instead of adding a component — OrderTimeline, BookingTimeline, ShipmentTimeline all need it. |
| Domain result screens | PaymentSuccess, BookingConfirmed, OrderConfirmed, RefundConfirmed, TransferSuccess, ApplicationSubmitted, TicketIssued, VoucherRedeemed | L4 Block | Core | Block / composition | planned (block) | — | ResultState, ReferenceCode, PriceBreakdown, PassCard | 2 | Blocks (or docs recipes) composed from the foundations — never components. |

### D. Commerce

| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ProductCard | ProductListItem, ProductPrice, ProductAvailability | L3 Domain | Core | React-only Domain | planned | — | Card, AmountDisplay, Badge | 2 | Domain composition over Card; price via AmountDisplay, availability as text plus a status Tag. |
| ProductVariant / ProductOption | — | L3 Domain | Core | React-only Domain | planned | — | ToggleGroup, SegmentedControl, ColorPicker | 2 | Mostly a recipe over ToggleGroup (size, colour swatches with names, not colour alone). |
| ProductQuantity / CartQuantity / QuantityPicker | — | L2 Enterprise | Core | Cross-platform Core | partial | ui:number-input, block:order-summary | — | 2 | NumberInput (with steppers) covers it; the order-summary block already uses it per line. One shared QuantityPicker contract, not three. |
| Cart | CartItem, CartGroup, CartSummary | L3 Domain | Core | Block / composition | partial | block:order-summary | PriceBreakdown, NumberInput | 2 | order-summary block hand-rolls its totals; migrate them onto PriceBreakdown. |
| CartDrawer / MiniCart | — | L4 Block | Core | Block / composition | planned (block) | — | Sheet, Cart | 2 | Sheet + Cart composition. |
| Checkout | CheckoutStepper | L4 Block | Core | Block / composition | planned (block) | — | Stepper, Form, AddressForm, PaymentCardInput, PriceBreakdown, ResultState | 2 | A block. Never a component. |
| OrderSummary | OrderLine, OrderTotal, OrderTax, OrderDiscount, OrderShipping | L3 Domain | Core | Block / composition | partial | block:order-summary | PriceBreakdown | 2 | Exists as the order-summary block (five platforms). Its lines are PriceBreakdown lines — no OrderLine/OrderTotal components. |
| OrderCard | OrderStatus, OrderTimeline | L3 Domain | Core | React-only Domain | planned | — | Card, StatusTimeline, ReferenceCode, Tag | 2 | OrderTimeline is StatusTimeline. |
| ReturnRequest | — | L4 Block | Core | Block / composition | planned (block) | — | Form, RadioGroup, FileUpload | 2 | Block. |
| RefundSummary / RefundStatus | — | L3 Domain | Core | Block / composition | planned (block) | — | PriceBreakdown, ResultState, StatusTimeline | 2 | Composition of Phase 1 foundations. |

### E. Booking & reservations

| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AvailabilityPicker / AppointmentPicker | — | L2 Enterprise | Core | Web-first Enterprise | planned | — | Calendar, TimeSlotPicker | 2 | Calendar with availability (disabled/limited days announced, not only greyed). |
| TimeSlotPicker | — | L2 Enterprise | Core | Cross-platform Core | planned | — | ToggleGroup | 2 | A labelled radio/toggle grid of slots with an empty state; time zones stated in text. |
| GuestPicker | — | L2 Enterprise | Core | Cross-platform Core | planned | — | NumberInput, Popover | 2 | Grouped steppers (adults, children) in a Popover with a summary trigger. |
| ResourcePicker / ProviderPicker / LocationPicker / ServicePicker | — | L2 Enterprise | Core | Web-first Enterprise | planned (recipe) | — | Select, Combobox, Card | 2 | One picker pattern (searchable list of rich options) — a recipe over Command/Select, not four components. |
| BookingCard / ReservationCard | BookingSummary, BookingReference, BookingStatus, ReservationDetails, ReservationStatus, ReservationActions | L3 Domain | Core | React-only Domain | planned | — | PassCard, ReferenceCode, DescriptionList, Tag | 2 | BookingReference is ReferenceCode; BookingStatus is a Tag; a reservation confirmation is a PassCard composition. |
| BookingTimeline | — | L3 Domain | Core | React-only Domain | planned | — | StatusTimeline | 2 | StatusTimeline. |
| Booking flow | — | L4 Block | Core | Block / composition | planned (block) | — | AvailabilityPicker, GuestPicker, PriceBreakdown, ResultState | 2 | Block. |

### F. Travel & aviation

| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FlightCard | FlightSegment, FlightRoute, FlightStatus, FlightTime, FlightDuration, FlightClassBadge | L3 Domain | Core | React-only Domain | planned | — | Card, Badge, `<time>` | 2 | Route and times as text with machine-readable `<time>`; direction-aware route arrow. |
| BaggageAllowance / GateInfo / BoardingGroup | — | L3 Domain | Core | React-only Domain | planned (recipe) | — | PassCardField, DescriptionList | 2 | Fields, not components. |
| BoardingPass | BoardingPassPassenger, BoardingPassFlight, BoardingPassGate | L3 Domain | Core | React-only Domain | recipe | ui:pass-card | — | 2 | Shown as the PassCard demo. A domain wrapper may come later; the base never says "flight". |
| TrainTicket / BusTicket / EventTicket | — | L3 Domain | Core | React-only Domain | recipe | ui:pass-card | — | 2 | PassCard compositions (EventTicket is on the PassCard page). |
| SeatMap | Seat, SeatLegend, SeatSelection, SeatSummary | L3 Domain | Core | React-only Domain | planned | — | ToggleGroup | 2 | Hard accessibility problem (2D grid, roving focus, availability not by colour). Web-first; dedicated design spike before code. |
| TravelerCard / PassengerList / TravelerDocumentStatus | — | L3 Domain | Core | React-only Domain | planned | — | Card, List, Tag | 2 |  |
| Itinerary | ItineraryDay, ItinerarySegment, ItineraryTimeline | L3 Domain | Core | React-only Domain | planned | — | StatusTimeline, Card | 2 | ItineraryTimeline is StatusTimeline. |
| TripSummary / TripPriceBreakdown / TripStatus | — | L3 Domain | Core | Block / composition | planned (block) | — | PriceBreakdown, ResultState | 2 | TripPriceBreakdown is PriceBreakdown. |

### G. Vouchers, passes & credentials

| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PassCard foundation | PassHeader, PassHolder, PassCode, PassValidity, PassStatus, PassTerms | L2 Enterprise | Core | Cross-platform Core | existing | ui:pass-card | — | 1 | Shipped as PassCard*: PassHolder is PassCardDescription or a field; PassValidity is a PassCardField with `<time>`; PassStatus composes Tag; PassTerms is PassCardFooter. |
| PassBarcode / PassQRCode | — | L2 Enterprise | Core | Cross-platform Core | existing | ui:pass-card | — | 1 | PassCardCode renders a SUPPLIED barcode or QR image with a text alternative and readable value. Encoding stays out of the library — no barcode dependency, no invented security model. |
| Pass compositions | Voucher, GiftCard, MembershipCard, LoyaltyCard, DigitalPass, AccessPass, EventPass, ParkingPass, MealVoucher, PromoVoucher | L3 Domain | Core | React-only Domain | recipe | ui:pass-card | — | 2 | Compositions of PassCard (parking permit and voucher are on the PassCard page). Promote one to a component only when its behaviour, not its words, differs. |
| Wallet export (Apple Wallet / Google Wallet) | — | L3 Domain | Core | React-only Domain | not planned | — | — | — | Platform wallet passes are issued server-side by the product; out of scope for a UI library. |

### H. Receipts & invoices

| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Invoice | InvoiceHeader, InvoiceParty, InvoiceLine, InvoiceTotals, InvoiceStatus | L4 Block | Core | Block / composition | planned (block) | — | Table, PriceBreakdown, DescriptionList, Tag | 5 | InvoiceLine is a Table row; InvoiceTotals is PriceBreakdown. |
| Receipt blocks | PaymentReceipt, TransferReceipt, BookingReceipt, RefundReceipt | L4 Block | Core | Block / composition | planned (block) | — | Receipt | 2 | Word changes over one Receipt block. |

### I. Finance & banking

| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AmountDisplay | ConvertedAmount | L2 Enterprise | Core | Cross-platform Core | planned | — | — | 2 | Pulled forward from Phase 5: every price in Commerce and Booking needs one money-display contract (Intl formatting supplied by the product, sign, currency code for screen readers, tabular figures). |
| MoneyInput | CurrencySelect | L2 Enterprise | Core | Cross-platform Core | planned | — | InputGroup, NumberInput, Select | 5 | Locale-aware entry; the stored value is the product's minor-unit integer, never a float. |
| ExchangeRateDisplay / ExchangeRate | — | L2 Enterprise | Core | Cross-platform Core | planned | — | AmountDisplay | 5 |  |
| PercentageInput / UnitInput | — | L2 Enterprise | Core | Cross-platform Core | partial | ui:number-input, ui:input-group | — | 5 | NumberInput + InputGroup addon covers it today. |
| IBANInput / AccountNumberInput | — | L3 Domain | Core | React-only Domain | planned | — | Input, Field | 5 | Formatting and checksum hints only; validation authority stays server-side. |
| PaymentCardInput | CardNumberInput, ExpiryInput, SecurityCodeInput, CardHolderInput | L3 Domain | Core | React-only Domain | planned | — | Input, Field | 5 | Never claim PCI compliance: a UI component cannot provide it. Most products should use their PSP's hosted fields; this would be for PSP-agnostic styling only. |
| TransactionList | TransactionRow, TransactionAmount, TransactionStatus | L2 Enterprise | Core | Cross-platform Core | planned | — | AmountDisplay, List, Tag | 5 |  |
| MoneyMovementSummary / FeeBreakdown | — | L2 Enterprise | Core | Cross-platform Core | recipe | ui:price-breakdown | — | 1 | PriceBreakdown (the transfer example on its page). |

### J. Billing & subscriptions

| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PricingTable | — | L3 Domain | Core | Block / composition | partial | block:pricing-tier | AmountDisplay | 5 | pricing-tier block is one tier; a comparison table is the gap. |
| PlanSummary / SubscriptionCard / SubscriptionStatus / BillingCycle / RenewalStatus | — | L3 Domain | Core | React-only Domain | planned | — | Card, DescriptionList, Tag | 5 |  |
| UsageMeter / QuotaMeter / CreditBalance | — | L2 Enterprise | Core | Cross-platform Core | partial | ui:progress, ui:metric | — | 5 | Progress + Metric compose it; a meter with thresholds announced in text is the gap. |
| InvoiceList / PaymentHistory | — | L3 Domain | Core | Block / composition | planned (block) | — | DataTable, AmountDisplay | 5 |  |
| Upgrade / downgrade / cancel flows | — | L4 Block | Core | Block / composition | planned (block) | — | ResultState, PriceBreakdown, AlertDialog | 5 | Blocks. |

### K. Loyalty, rewards & wallet

| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| WalletBalance / GiftCardBalance | — | L2 Enterprise | Core | Cross-platform Core | planned | — | AmountDisplay, Metric | 5 |  |
| WalletTransaction | — | L2 Enterprise | Core | Cross-platform Core | planned | — | TransactionList | 5 | TransactionRow. |
| WalletCard / GiftCard / LoyaltyCard | — | L3 Domain | Core | React-only Domain | recipe | ui:pass-card | — | 2 | PassCard compositions. |
| RewardPoints / RewardProgress / RewardTier / LoyaltyStatus / LoyaltyBenefits | — | L3 Domain | Core | React-only Domain | planned | — | Metric, Progress, Tag | 5 |  |
| RewardHistory | — | L3 Domain | Core | React-only Domain | planned | — | TransactionList | 5 |  |
| GiftCardRedeem | — | L4 Block | Core | Block / composition | planned (block) | — | Field, ResultState | 5 |  |

### L. IAM & enterprise admin

| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PermissionMatrix | PermissionGroup, PermissionRow, PermissionCell, PermissionBulkAction, PermissionInheritance | L2 Enterprise | Core | Web-first Enterprise | planned | — | Table, Checkbox | 4 | A grid of checkbox cells with row/column bulk actions and an inheritance explanation in text; keyboard grid model. |
| RoleEditor | — | L4 Block | Core | Block / composition | planned (block) | — | PermissionMatrix, Form | 4 |  |
| WorkspaceSwitcher | WorkspaceItem, WorkspaceSearch | L2 Enterprise | Core | Web-first Enterprise | planned | — | Command, Popover, Avatar | 4 | A Command-in-Popover recipe first. |
| SessionManager / DeviceSession | — | L3 Domain | Core | Block / composition | partial | block:account-security | List, AlertDialog | 4 | The account-security block lists active sessions you can end. |
| APIKeyTable / SecretKeyManager | SecretScope, SecretExpiration, SecretRotation | L2 Enterprise | Core | Web-first Enterprise | planned | — | DataTable, ReferenceCode, AlertDialog | 4 | ReferenceCode covers reveal-once copy; secrets are never rendered after creation. |

### M. Authentication

| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AuthShell / AuthCard | — | L4 Block | Core | Block / composition | block | block:sign-in, block:create-account | — | 4 | The sign-in and create-account blocks. |
| OTPInput | — | L1 Core primitive | Core | Cross-platform Core | existing | ui:input-otp | — | — | InputOTP on all five platforms. |
| PasswordStrength / PasswordRequirement | — | L3 Domain | Core | Block / composition | partial | block:create-account, ui:password-input | Progress | 4 | The create-account block's meter names what is missing; not yet a reusable component. |
| RecoveryCodeList | — | L3 Domain | Core | Block / composition | partial | block:account-security | ReferenceCode | 4 | In the account-security block. |
| MFA setup | — | L4 Block | Core | Block / composition | planned (block) | — | InputOTP, PassCardCode, ResultState | 4 | A block: the QR is a supplied image (PassCardCode), never generated here. |

### N. Workflow & approvals

| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| WorkflowStepper | — | L1 Core primitive | Core | Cross-platform Core | existing | ui:stepper | — | — | Stepper on all five platforms. |
| ApprovalFlow | ApprovalStage, ApprovalActor, ApprovalStatus, ApprovalActions | L2 Enterprise | Core | Web-first Enterprise | planned | — | StatusTimeline, Avatar, Tag | 4 |  |
| TaskQueue | TaskQueueItem, TaskPriority, TaskAssignee, TaskDueDate | L2 Enterprise | Core | Web-first Enterprise | planned | — | List, Tag, Avatar | 4 |  |
| SLAIndicator | — | L2 Enterprise | Core | Cross-platform Core | planned | — | Tag, `<time>` | 4 | Remaining time stated in text; colour is reinforcement. |
| WorkflowHistory | — | L2 Enterprise | Core | Cross-platform Core | planned | — | AuditTrail | 4 |  |
| Advanced workflow tooling (visual designer, simulation) | — | L2 Enterprise | Pro | Pro candidate | Pro candidate | — | ApprovalFlow | 10 |  |

### O. Audit & compliance

| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AuditTrail | AuditEvent, AuditActor, AuditChange, AuditMetadata, AuditFilter | L2 Enterprise | Core | Web-first Enterprise | planned | — | StatusTimeline, DiffViewer, FilterBar | 4 | AuditChange reuses DiffViewer. |
| VerificationStepper | VerificationStep, VerificationStatus | L2 Enterprise | Core | Cross-platform Core | partial | ui:stepper | — | 6 | Stepper covers the shape; per-step status is the gap. |
| DocumentCapture / DocumentPreview | — | L3 Domain | Core | React-only Domain | planned | — | FileUpload, Image | 6 |  |
| IdentityReview | IdentityField, IdentityMatchStatus | L3 Domain | Core | React-only Domain | planned | — | DescriptionList, Tag | 6 |  |
| SignaturePad | — | L2 Enterprise | Core | Web-first Enterprise | planned | — | — | 6 | Needs a keyboard alternative (typed signature) to be Core. |
| KYC flow | — | L4 Block | Core | Block / composition | planned (block) | — | VerificationStepper, DocumentCapture, ResultState | 6 | A block/domain workflow, never one primitive. |

### P. Documents & files

| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FileUploader | UploadItem, UploadProgress, UploadError | L1 Core primitive | Core | Cross-platform Core | existing | ui:file-upload | — | — | FileUpload has per-file loading/uploaded/error status and progress. |
| FileManager | FileRow, FileGrid, FileBreadcrumb, FileActions | L2 Enterprise | Core | Web-first Enterprise | planned | — | DataTable, Breadcrumb, DropdownMenu | 6 |  |
| DocumentViewer shell | DocumentToolbar, DocumentPage, DocumentThumbnailRail, DocumentZoomControl, DocumentSearch | L2 Enterprise | Core | Web-first Enterprise | planned | — | Toolbar, ScrollArea | 6 | A shell around a renderer the product supplies — no PDF engine in the library. |
| VersionHistory | VersionEntry, VersionCompare | L2 Enterprise | Core | Web-first Enterprise | planned | — | StatusTimeline, DiffViewer | 6 |  |

### Q. Healthcare

| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PatientSummary / PatientStatus / PatientAlert | — | L3 Domain | Core | React-only Domain | planned | — | Card, Alert, DescriptionList | 6 | Display only: clinical and diagnostic logic stays out of the library. |
| VitalSign | VitalSignTrend, VitalSignRange, VitalSignStatus | L3 Domain | Core | React-only Domain | planned | — | Metric, RangeChart | 6 | Ranges are supplied by the product; the component never decides what is abnormal. |
| MedicationList | MedicationItem, Dosage, MedicationStatus | L3 Domain | Core | React-only Domain | planned | — | List, Tag | 6 |  |
| AppointmentCard / AppointmentStatus | — | L3 Domain | Core | React-only Domain | planned | — | PassCard, Tag | 6 | A PassCard composition first. |
| ClinicalTimeline | — | L3 Domain | Core | React-only Domain | planned | — | StatusTimeline | 6 |  |
| LabResultTable | — | L3 Domain | Core | React-only Domain | planned | — | DataTable | 6 |  |
| ConsentStatus | — | L3 Domain | Core | React-only Domain | planned | — | Tag, ResultState | 6 |  |

### R. Maps, logistics & fleet

| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Map controls | MapControls, MapZoom, MapCompass, MapLayers, MapLegend | L2 Enterprise | Core | Web-first Enterprise | planned | — | ButtonGroup | 7 | Controls around a map engine the product supplies; no map dependency in the library. |
| MapMarker / MapMarkerCard / MapCluster | — | L3 Domain | Core | React-only Domain | planned | — | Popover, Card | 7 |  |
| RouteSummary | RouteDistance, RouteDuration, RouteStops | L3 Domain | Core | React-only Domain | planned | — | DescriptionList, StatusTimeline | 7 |  |
| FleetVehicleCard / VehicleStatus | — | L3 Domain | Core | React-only Domain | planned | — | Card, Tag | 7 |  |
| ShipmentCard / ShipmentStatus / ShipmentTimeline / TrackingTimeline / DeliveryStatus | — | L3 Domain | Core | React-only Domain | planned | — | StatusTimeline, ReferenceCode, PassCard | 7 | ShipmentTimeline and TrackingTimeline are StatusTimeline; the tracking number is ReferenceCode. |
| GeofenceEditor | — | L3 Domain | Pro | Pro candidate | Pro candidate | — | Map controls | 10 | Pro candidate. |

### S. IoT

| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IoT controls | DevicePowerControl, DeviceLevelControl, DeviceSetpointControl, DeviceModeControl, DeviceColorControl, DeviceLockControl, DeviceMediaControl | L3 Domain | Core | React-only Domain | existing | iot:DevicePowerControl, iot:DeviceLevelControl, iot:DeviceSetpointControl, iot:DeviceModeControl, iot:DeviceColorControl, iot:DeviceLockControl, iot:DeviceMediaControl | — | — | @kinetixui/iot, React only. Requested state is never shown as physical truth until the device reports it. |
| IoT monitoring | TelemetryMetric, TelemetryGrid, TelemetryCard, TelemetryTrend, EnergySummary, DeviceBattery, DeviceConnection | L3 Domain | Core | React-only Domain | existing | iot:TelemetryMetric, iot:TelemetryGrid, iot:TelemetryCard, iot:TelemetryTrend, iot:EnergySummary, iot:DeviceBattery, iot:DeviceConnection | — | — | Freshness contract: stale data says so. |
| IoT summaries & cards | DeviceStateSummary, DeviceCard, DeviceGroupCard, DeviceControlCard, DeviceListItem, RoutineCard, CameraDeviceCard | L3 Domain | Core | React-only Domain | existing | iot:DeviceStateSummary, iot:DeviceCard, iot:DeviceGroupCard, iot:DeviceControlCard, iot:DeviceListItem, iot:RoutineCard, iot:CameraDeviceCard | — | — | DeviceSummary exists as DeviceStateSummary. |
| RequestedState / ReportedState / PendingDeviceState / CommandStatus | — | L3 Domain | Core | React-only Domain | existing | iot:CommandStatus, iot:CommandFeedback, iot:CommandLifecycle | — | — | Exists as the command lifecycle (requested, pending, confirmed, failed, timed out). Do not weaken: requested is not reported. |
| DeviceAlert | — | L3 Domain | Core | React-only Domain | existing | iot:AlertCard, iot:AlertList | — | — | AlertCard / AlertList. |
| ZoneSummary | — | L3 Domain | Core | React-only Domain | existing | iot:SpaceRollup, iot:SpaceBreadcrumb | — | — | SpaceRollup / SpaceBreadcrumb. |
| DeviceActivityTimeline | — | L3 Domain | Core | React-only Domain | existing | iot:DeviceActivity, iot:ActivityTimeline | — | — | DeviceActivity / ActivityTimeline. |
| DeviceProvisioningStepper | — | L3 Domain | Core | React-only Domain | existing | iot:PairingStepper, iot:PairingMethodPicker, iot:PairingFailure | — | — | The pairing family. |
| DeviceFirmwareStatus | — | L3 Domain | Core | React-only Domain | existing | iot:FirmwareStatus | — | — | FirmwareStatus. |
| SpatialDeviceMarker | — | L3 Domain | Core | React-only Domain | planned | — | Map controls | 7 | Waits on real-device validation (IoT is paused until hardware evidence exists). |
| DeviceMaintenance | — | L3 Domain | Core | React-only Domain | planned | — | DeviceHealthSummary | 7 | DeviceHealthSummary covers health; maintenance scheduling is new. |

### T. Scheduling

| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Calendar | CalendarMonth | L1 Core primitive | Core | Cross-platform Core | existing | ui:calendar | — | — | Month calendar with single and range modes (react-day-picker on React). Angular planned. |
| CalendarWeek / CalendarDay / CalendarEvent / CalendarResource | — | L2 Enterprise | Core | Web-first Enterprise | planned | — | Calendar | 8 | A time-grid view; keyboard model and event density at 200% text are the hard part. |
| Scheduler / AvailabilityGrid / TimelinePlanner | — | L2 Enterprise | Core | Web-first Enterprise | planned | — | CalendarWeek, DataGrid | 8 |  |
| Gantt | — | L2 Enterprise | Pro | Pro candidate | Pro candidate | — | TimelinePlanner | 10 | Pro candidate. |

### U. CRM & sales

| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| EntityCard / StatusCard foundation | ContactCard, CompanyCard, DealCard | L2 Enterprise | Core | Cross-platform Core | planned | — | Card, Avatar, DescriptionList, Tag | 4 | One EntityCard (avatar/logo, name, key facts, status, actions) instead of three cards. |
| PipelineBoard | — | L3 Domain | Core | React-only Domain | recipe | ui:kanban-board | — | 8 | KanbanBoard with deal cards. |
| ActivityFeed | — | L2 Enterprise | Core | Cross-platform Core | partial | ui:timeline, iot:ActivityTimeline | StatusTimeline | 4 | Timeline covers the shape; IoT's ActivityTimeline is a domain version. |

### V. Project & work management

| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| KanbanBoard | KanbanColumn, KanbanCard, KanbanSwimlane | L2 Enterprise | Core | Web-first Enterprise | partial | ui:kanban-board | — | 8 | Shipped with keyboard drag and drop (React only, standing native non-port). Swimlanes are missing. |
| TaskCard / Milestone | — | L2 Enterprise | Core | Cross-platform Core | planned | — | Card, Tag, Avatar | 8 |  |
| DependencyGraph | — | L2 Enterprise | Pro | Pro candidate | Pro candidate | — | — | 10 |  |

### W. Collaboration

| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MessageBubble / Conversation / Thread | — | L2 Enterprise | Core | Cross-platform Core | partial | ui:message-bubble | — | 9 | MessageBubble and TypingIndicator on React and natives; a scrolling Conversation with grouping and unread markers is the gap. |
| CommentComposer / CommentThread | — | L4 Block | Core | Block / composition | partial | block:comment-box | MentionInput | 9 | comment-box block. |
| MentionInput | — | L2 Enterprise | Core | Web-first Enterprise | planned | — | Command, Textarea | 9 |  |
| PresenceIndicator / ReactionPicker | — | L2 Enterprise | Core | Cross-platform Core | planned | — | Avatar, Popover | 9 |  |

### X. Developer tools

| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CodeEditorShell | — | L2 Enterprise | Core | Web-first Enterprise | partial | ui:code-block, ui:markdown-editor | — | 9 | CodeBlock (read-only) and MarkdownEditor (plain-textarea editing) exist; a shell around a real editor engine is the gap. |
| DiffViewer | — | L1 Core primitive | Core | Cross-platform Core | existing | ui:diff-viewer | — | — |  |
| JSONViewer | JSONNode | L1 Core primitive | Core | Cross-platform Core | existing | ui:json-viewer | — | — | JsonViewer. |
| LogViewer | LogLine, LogLevel | L2 Enterprise | Core | Web-first Enterprise | planned | — | VirtualList | 9 | Virtualised, level as text plus colour. |
| EnvironmentBadge / DeploymentStatus / DeploymentStep | — | L2 Enterprise | Core | Cross-platform Core | planned | — | Tag, StatusTimeline | 9 |  |

### Y. Observability

| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| StatusCard / StatusIndicator | — | L2 Enterprise | Core | Cross-platform Core | partial | ui:metric, ui:badge | EntityCard | 9 | Metric and Badge cover it today. |
| HealthCheckList | — | L2 Enterprise | Core | Cross-platform Core | planned | — | List, ResultState | 9 |  |
| IncidentBanner | — | L1 Core primitive | Core | Cross-platform Core | existing | ui:banner | — | — | Banner (dismissible, intent-tinted, page-level). |
| IncidentTimeline | — | L2 Enterprise | Core | Cross-platform Core | planned | — | StatusTimeline | 9 |  |
| AlertRuleBuilder | — | L2 Enterprise | Core | Web-first Enterprise | planned | — | QueryBuilder | 9 | QueryBuilder with thresholds. |

### Z. AI / agent interfaces

| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PromptInput | PromptAttachment, PromptActions | L2 Enterprise | Core | Web-first Enterprise | planned | — | Textarea, FileUpload, Button | 9 |  |
| ChatMessage / AssistantResponse / StreamingText | — | L2 Enterprise | Core | Cross-platform Core | partial | ui:message-bubble, ui:markdown-editor | — | 9 | MessageBubble + rendered markdown; streaming announcement strategy (polite, chunked) is the gap. |
| ToolCall / Citation / SourcesPanel | — | L2 Enterprise | Core | Web-first Enterprise | planned | — | Collapsible, Card | 9 | User-visible tool and source information only. |
| AgentTask | AgentStep, AgentProgress, AgentResult | L2 Enterprise | Core | Web-first Enterprise | planned | — | StatusTimeline, ResultState | 9 | Shows user-visible execution status only — never hidden chain-of-thought. |

### AA. Enterprise layouts

| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AppShell / Sidebar / Header | — | L1 Core primitive | Core | Cross-platform Core | existing | ui:sidebar, ui:app-bar, ui:navigation-bar | — | — | Sidebar, AppBar, NavigationBar. |
| PageHeader / ContextBar | — | L1 Core primitive | Core | Cross-platform Core | existing | ui:page-header | — | — | PageHeader; ContextBar is a PageHeader slot. |
| SplitPane / ResizablePanels | — | L1 Core primitive | Core | Cross-platform Core | existing | ui:resizable | — | — | Resizable. |
| MasterDetail | MasterList, DetailPanel | L4 Block | Core | Block / composition | planned (recipe) | — | Resizable, List, Sheet | 4 | A responsive recipe (split on wide, push on narrow). |
| InspectorPanel / UtilityPanel / WorkspaceLayout | — | L2 Enterprise | Core | Web-first Enterprise | planned | — | Sheet, Resizable, Sidebar | 4 |  |

### AB. Enterprise status & feedback

| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| StatusBanner / InlineStatus | — | L1 Core primitive | Core | Cross-platform Core | existing | ui:banner, ui:inform, ui:alert | — | — | Banner, Inform, Alert. |
| ProcessingState / PendingState | — | L2 Enterprise | Core | Cross-platform Core | existing | ui:result-state, ui:spinner | — | 1 | ResultState status="pending" for a whole result; Spinner inline. |
| ApprovalStatus | — | L2 Enterprise | Core | Cross-platform Core | planned | — | Tag | 4 |  |
| SyncStatus / ConnectionStatus / StaleDataState / OfflineState | — | L2 Enterprise | Core | Cross-platform Core | partial | iot:LastSync, iot:DeviceConnection, iot:ConnectionHealth | — | 3 | The IoT freshness and connectivity contract already exists; lifting a domain-neutral version into Core (with IoT re-using it) is the job — do not fork a second model. |
| ConflictState / MaintenanceState | — | L2 Enterprise | Core | Cross-platform Core | planned | — | ResultState, Banner | 3 | ResultState and Banner variants with resolution actions. |

### AC. Advanced forms

| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FormSection / FieldArray / RepeatableFieldGroup / ConditionalField / DependentSelect | — | L2 Enterprise | Core | Cross-platform Core | partial | ui:form, ui:field | — | 2 | Form (react-hook-form) and Field exist; repeatable groups and dependent selects are recipes to write. |
| AddressForm / PhoneInput / CountrySelect / TimezoneSelect | — | L2 Enterprise | Core | Cross-platform Core | planned | — | Field, Select, Combobox | 2 | Pulled into Phase 2: checkout and booking need them. Country/phone data is supplied, not bundled. |
| DateRangeInput / DateTimeRangeInput | — | L2 Enterprise | Core | Cross-platform Core | partial | ui:calendar, ui:date-picker | — | 2 | Calendar has range mode; DatePicker is single-date — a range field is the gap. |
| DurationInput / UnitInput | — | L2 Enterprise | Core | Cross-platform Core | partial | ui:number-input, ui:input-group | — | 5 |  |

### AD. Motion

| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Core motion | Presence, StateTransition, MovingIndicator, LayoutTransition, ValueTransition | L1 Core primitive | Core | Cross-platform Core | partial | `motion.mjs` | — | — | Token-based durations and easings, reduced-motion evidence in CI. Primitives are not yet exported as components. Never paywalled. |
| Pro motion | MotionProvider, MotionPreset, MotionStyle, MotionSequence, MotionStagger, MotionInspector, brand motion packs | L2 Enterprise | Pro | Pro candidate | Pro candidate | — | Core motion | 10 | Not in Phase 1. Accessibility motion (reduced motion, accessible end states) stays Core. |

<!-- END GENERATED: capability tables -->
