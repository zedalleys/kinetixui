# SEO content backlog

**Supporting document.** Editorial and IA work SEO Phase 1 deliberately left out (Phase 2 and follow-ups). Nothing here is
drafted; each row is a candidate, mapped to the intent it serves ([`SEARCH-INTENT-MAP.md`](./SEARCH-INTENT-MAP.md)),
the page it would land on, its funnel stage, its call to action, and any existing asset it can reuse. Claims follow
[`../CLAIMS.md`](../CLAIMS.md); the "build one at a time, fully" rule in [`../seo.md`](../seo.md) still applies.

**Order of work.** The 1280px/200% readability follow-up first (it affects every docs reader), then cluster A's
pillar (it is the category), then B's two strongest native pages, then the remaining component editorial work. Re-rank once Search Console has eight weeks of
data ([`MEASUREMENT.md`](./MEASUREMENT.md)).

---

## Follow-ups from SEO Phase 1

Phase 1 shipped related components, the platform "at a glance" blocks and the foundation cross-links
([`SEO-BASELINE.md`](./SEO-BASELINE.md) §7). What it left, in priority order:

| Item | Where | Notes |
| --- | --- | --- |
| **Docs readability at 1280px with 200% text** (baseline F-20) | docs layout (sidebar + article + table of contents) | The article column narrows to about 128px. Left out of Phase 1 by instruction; a layout fix (collapse the TOC or the sidebar earlier when text is enlarged), verified with `check:a11y-site` at 200% text. |
| Remaining component editorial work | the 98 component MDX pages | **Partly implemented in Phase 2A** (below): 20 pages. The rest are listed there as deferred. |
| Component-page accessibility summary | the component template | A one-line, per-component keyboard model from evidence (`verification.json` interaction/accessibility sources), never "WCAG compliant". Needs a data field per component first. |
| Blocks → component pages | `/blocks` | **Implemented in Phase 2A**: every block lists the component pages its React version is built from. |
| Search Console and Bing setup | owner | DNS verification and sitemap submission, per [`MEASUREMENT.md`](./MEASUREMENT.md) §5. |
| First-load font reflow on docs pages | root layout fonts | Intermittent CLS of 0.05–0.10 on a cold load, on `main` as well (baseline §9). |

---

## Phase 2A — editorial depth on existing pages

**Implemented** (PR "feat(web): deepen component and platform SEO content"):

| Surface | What changed | Source of truth |
| --- | --- | --- |
| 20 component pages | A specific lead ("what it is", also the search description), "When to use it", "When to choose something else" with links to the siblings, and accessibility notes only where a named test asserts the behaviour | `apps/web/src/lib/component-editorial.ts` |
| Dialog, Alert Dialog, Modal, Sheet, Drawer | the overlay family, compared with each other | same |
| Select, Native Select, Combobox, Multi-Select, Command, Dropdown Menu | selection vs actions | same |
| Table, Data Table, Data Grid | static vs sortable vs editable/virtualised | same |
| Tabs, Segmented Control; Tooltip, Popover, Hover Card; Form | panels vs values; label vs interactive vs preview; RHF vs Field | same |
| Calendar, Date Picker summaries | corrected: Calendar is an inline grid (single or range), Date Picker's trigger is a button (single date) | their page.mdx |
| Form summary | corrected: Form wires React Hook Form; it does not use Zod itself | `component-editorial.ts` |
| Angular, SwiftUI, Compose, Flutter | "What differs from the React library" and "A first adoption path", each written from that page's own facts | the platform page.mdx |
| Installation | React at a glance (the derived summary block), so React has the same summary as the other four | `PlatformAtAGlance` |
| Tokens | why tokens are generated and components are hand-written | tokens/page.mdx |
| Accessibility | what "verified" means: computed checks, jsdom tests, browser passes, and what none of them proves | accessibility/page.mdx |
| RTL | overlays and placement (provider, Sheet's physical side, Angular's top layer); what is checked | rtl/page.mdx |
| Blocks | links to the component pages each block is built from | `BlockComponentLinks` |

**Gate:** `pnpm check:editorial` (CI, after `check:seo`) and `node scripts/editorial-negative-controls.mjs`.

**React platform page: not added.** `/docs/installation` already is the React adoption page (`@kinetixui/ui`, the
Tailwind preset, the CLI ownership model, tokens), and coverage and verification live on `/docs/platforms` and
`/docs/accessibility`. A `/docs/react` would duplicate Installation and compete with it for "install KinetixUI".
Installation now carries React's at-a-glance block instead. Revisit only if Search Console shows React-qualified
impressions landing on the wrong page (baseline F-13).

**Deferred component pages** (evaluated, not edited in 2A), in priority order: Button, Input (broad demand, but the
current pages are already specific); Calendar and Date Picker guidance beyond the summary fix; Sonner vs
Notification Center (Notification Center is beta with an unresolved product boundary, so guidance would describe a
moving target); Sidebar; File Upload; Context Menu, Menubar and Navigation Menu as a menu family; Field. One "Choosing
an overlay" guide page was considered and not built: the in-page comparisons cover the family without a thin
extra page.

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
