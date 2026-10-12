# SEO content backlog

**Supporting document.** Editorial and IA work the first SEO workstream deliberately left out. Nothing here is
drafted; each row is a candidate, mapped to the intent it serves ([`SEARCH-INTENT-MAP.md`](./SEARCH-INTENT-MAP.md)),
the page it would land on, its funnel stage, its call to action, and any existing asset it can reuse. Claims follow
[`../CLAIMS.md`](../CLAIMS.md); the "build one at a time, fully" rule in [`../seo.md`](../seo.md) still applies.

**Order of work.** Cluster A's pillar first (it is the category), then B's two strongest native pages, then the
component-page template work already planned as the second SEO PR. Re-rank once Search Console has eight weeks of
data ([`MEASUREMENT.md`](./MEASUREMENT.md)).

---

## Second SEO PR (planned, builds on #350)

On-page work on the shared templates rather than new content:

| Item | Where | Notes |
| --- | --- | --- |
| Component-page intro from metadata | the component template | 1–2 sentences: what it does, platform availability (derived), and the accessibility behaviour that exists as evidence (keyboard model, verification level) — never "WCAG compliant" |
| Related components | the component template | from category + an explicit relation table (Dialog → Alert Dialog, Modal, Sheet, Drawer; Select → Native Select, Combobox, Multi-Select, Command; Input → Input Group, Textarea, Password Input, Number Input; Breadcrumb → Pagination, Tabs, Navigation Menu) |
| Platform docs link | the component template | link to the reader's chosen platform page, reusing #350's platform preference instead of a second store |
| Platform pages' first-component path and token section | `/docs/angular`, `/docs/swiftui`, `/docs/compose`, `/docs/flutter` | make each page answer maturity, distribution, what exists, what does not, verification, first component and tokens — after #350's native install edits land, to avoid conflicting with them |
| Foundation pages' cross-links | tokens, theming, accessibility, RTL, installation | descriptive anchors along the evaluator journey |
| Blocks → component dependencies | `/blocks` | #350 adds `block-components.ts`; link each block to the component pages it uses |

---

## Cluster A — Cross-platform design systems *(primary ICP, awareness → evaluation)*

| Idea | Search intent | Target route | Stage | CTA | Reuses |
| --- | --- | --- | --- | --- | --- |
| **Pillar:** Cross-platform design systems — architecture, parity and trade-offs | cross platform design system | new page (e.g. `/cross-platform-design-system`) or `/docs` section — decide when written | awareness | Platform coverage | MESSAGING §1D, ART-001 |
| Design tokens across web, iOS and Android | design tokens web ios android | `/docs/tokens` (expand) | evaluation | Start with the tokens | ART-002 (*Your design tokens stop at the web boundary*) |
| Generated tokens vs generated components | generate components from figma; token pipeline | article (off-site first) | awareness | Platform coverage | CLAIMS B-series, `/docs/tokens` trace |
| Keeping React, Angular, SwiftUI, Compose and Flutter aligned | design system parity across platforms | article → `/docs/platforms` | awareness | Platform coverage | ART-001, `verification.json` |

## Cluster B — Platform evaluation *(secondary ICP)*

| Idea | Search intent | Target route | Stage | CTA | Reuses |
| --- | --- | --- | --- | --- | --- |
| Flutter design system (and design tokens in Flutter) | flutter design system; design tokens flutter | `/docs/flutter` (expand) or `/design-tokens/flutter` ([`../seo.md`](../seo.md) rank 1) | evaluation | Start with the tokens | Material/Cupertino adapters |
| SwiftUI design system | swiftui design system | `/docs/swiftui` | evaluation | Source checkout | — |
| Jetpack Compose design system | jetpack compose design system | `/docs/compose` | evaluation | Source checkout | Compose onboarding gate (#329) |
| Angular design system (preview, honestly) | angular component library | `/docs/angular` | evaluation | Install `@kinetixui/angular` | `ANGULAR-GRADUATION.md` |
| React + native design system architecture | react native design system web ios android | article → `/docs/platforms` | awareness | Explore components | — |
| React platform page — **decision first** | react design system | `/docs/react` only if Search Console shows qualified React impressions (baseline F-13) | evaluation | Install | `/docs/installation` |

## Cluster C — Proof and parity

| Idea | Search intent | Target route | Stage | CTA | Reuses |
| --- | --- | --- | --- | --- | --- |
| Platform parity, measured | design system platform parity | `/docs/platforms` | evaluation | View verification | `verification.json`, ladder |
| Accessibility parity across platforms | accessible design system cross platform | `/docs/accessibility` (+ native evidence) | evaluation | Read the evidence | a11y-site, Compose TalkBack work |
| RTL across platforms | rtl design system; flutter rtl; compose rtl | `/docs/rtl` or `/rtl-design-system` ([`../seo.md`](../seo.md) rank 2) | evaluation | See direction-aware evidence | `check:rtl`, RTL.md |
| How to verify a component library's claims | how to evaluate a component library | article | awareness | Platform coverage | ART-001 |

## Cluster D — Adoption

| Idea | Search intent | Target route | Stage | CTA | Reuses |
| --- | --- | --- | --- | --- | --- |
| Migrating from a React-only design system | migrate react design system to native | article → `/docs/installation` | adoption | Install | — |
| Source-copy vs package distribution | shadcn style copy components vs npm package | `/docs/installation` section | adoption | Install | registry + npm docs |
| How to evaluate a component library | component library evaluation checklist | article | awareness | Explore components | evaluator journey audit |

---

## Template and IA candidates (need evidence first)

| Candidate | Why it is not done yet |
| --- | --- |
| Component category routes (`/components/overlays`, …) | Categories are filters today; a category page must add something the gallery does not (guidance on choosing between siblings), or it is a thin duplicate. |
| Per-block routes | 20 blocks share one page; per-block pages would need per-block depth (when to use, components used, platforms). |
| Per-component OG images | One card serves every page today; revisit only if share-card CTR data shows the generic card underperforms. |
| `/blog` | [`../seo.md`](../seo.md): not until three articles are published off-site and one has measurable traffic. |

## Defects found by the SEO audit, outside SEO

| Defect | Owner surface |
| --- | --- |
| `npx @kinetixui/cli add combobox` is shown but `combobox` is not a registry item (baseline F-11) | combobox docs page; #350's install strip derives the same command |
| `/components?filter=…` lab CLS 0.35 at 1280px (baseline F-10) | component gallery hydration |
| PageHeader hard-codes `<h1>` (baseline F-08) | `@kinetixui/ui` PageHeader API |
