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
| Search Console and Bing setup | owner | DNS verification and sitemap submission, per [`MEASUREMENT.md`](./MEASUREMENT.md) §7 and §8. |
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

## Phase 2B — first content cluster

**Published 2026-10-12.** Drafted in #364 (noindex, out of the sitemap), reviewed by the owner, then published
together in `apps/web/src/lib/guides-data.ts`. Ownership,
CTAs and links: [`SEARCH-INTENT-MAP.md` § Content cluster](./SEARCH-INTENT-MAP.md#content-cluster).

| Guide | Status | Next step |
| --- | --- | --- |
| Pillar: Cross-platform design systems — architecture, parity and trade-offs (`/guides/cross-platform-design-systems`) | **published** 2026-10-12 | measure per [`MEASUREMENT.md`](./MEASUREMENT.md) § content-cluster reporting |
| Generated tokens vs generated components | **published** 2026-10-12 | with the pillar; the set unpublishes together too |
| How to verify design system parity across web, iOS and Android | **published** 2026-10-12 | with the pillar; the set unpublishes together too |
| What a cross-platform component library should actually give you | **published** 2026-10-12 | with the pillar; the set unpublishes together too |
| Design tokens across React, SwiftUI, Compose and Flutter | **deferred** | owned by `/docs/tokens` and ART-002; would cannibalise both |
| `/guides` index page | **next candidate** | four guides are now published; build when a fifth is planned (the guides already link each other) |
| A diagram for the pillar (token source → generated outputs; components per platform → evidence) | **brief only** | reuse the `/infographic` pipeline art if it fits; not a blocker for publishing |

### Next candidates

| Candidate | Intent | Stage | Target page | CTA | Calendar relationship |
| --- | --- | --- | --- | --- | --- |
| Choosing an overlay: Dialog, Sheet, Drawer, Popover | dialog vs sheet vs drawer | evaluation | guide (only if in-page comparisons prove too thin in Search Console) | Explore components | none yet |
| Accessibility parity across platforms | accessible design system cross platform | evaluation | `/docs/accessibility` + guide | Read the evidence | LI-008 (partial evidence) |
| RTL across platforms | rtl design system | evaluation | `/docs/rtl` | See direction-aware evidence | — |
| Source-copy vs package distribution | shadcn style copy vs npm | adoption | `/docs/installation` section | Install | LI-007 / X-008 (two trades) |

### Calendar alignment

The calendar is not rescheduled. Existing assets that can promote a guide once it is published:

| Guide | Promoted by | How |
| --- | --- | --- |
| Pillar | ART-001 (dev.to, day 15), LI-001, X-001 | post-publication edit of ART-001 adds a tagged pillar link; LI-001/X-001 keep `/docs/platforms` as their destination |
| Generated tokens vs generated components | ART-002, LI-005, X-004, COM-001 | reply/comment link from the existing ART-002 thread; no new post needed |
| Parity verification | LI-008 (*a partial count is not a tick*), COM-002 | LI-008's natural "how do you measure it" follow-up; COM-002 answers "how to verify a coverage claim" |
| Evaluation checklist | LI-007 / X-008 (*two trades*), week 4 adoption posts | the checklist is the "what to check next" link for evaluators |
| Docs | the "Further reading" lines on `/docs/platforms`, `/docs/tokens`, `/docs/accessibility` and `/docs/installation` (automatic on publish) | — |

## Phase 3 — publication system and organic measurement

**Implemented** (PR "feat(marketing): prepare SEO guide publication and organic measurement"). No content cluster
was added. The guides themselves were published separately, on 2026-10-12, by PR #366; this PR treats that as the
starting state.

| Item | Where |
| --- | --- |
| Publication procedure for the four guides | [`GUIDE-PUBLISH-RUNBOOK.md`](./GUIDE-PUBLISH-RUNBOOK.md) |
| Publication gate: cluster-partial, guide-date, sitemap-state, further-reading, pillar-proof, CTA destination, typed counts in guide snippets | `scripts/check-editorial.mjs` |
| Rendered guide checks in both states (draft: noindex and no TechArticle; published: indexable with TechArticle) | `scripts/seo-browser.mjs` |
| The four guides in the CI a11y-site sweep | `scripts/a11y-site.mjs` |
| Simulated publication or unpublication (whichever the registry is not in), reverted by hash | `scripts/simulate-guide-publication.mjs` |
| Negative controls EC-16 to EC-27, state-aware | `scripts/editorial-negative-controls.mjs` |
| Authority and link-target plan | [`AUTHORITY-PLAN.md`](./AUTHORITY-PLAN.md) |
| Organic measurement workflow, dashboard spec, Search Console and Bing checklists, Day 0/7/14/30 cadence, baseline capture | [`MEASUREMENT.md`](./MEASUREMENT.md) §3–§8 |
| ART-001 → pillar post-publication edit, with anchor text and UTM | runbook §6; register row `ART-001-PILLAR` (status `brief`) |
| Final intent ownership | [`SEARCH-INTENT-MAP.md`](./SEARCH-INTENT-MAP.md#final-ownership-seo-phase-3) |

**Snippet audit** (built HTML of `/`, `/components`, `/docs/platforms`, `/docs/tokens`, `/docs/accessibility`,
`/docs/installation`, `/docs/angular`, the 20 editorial component pages and the four guides). No markup, no typed
counts, no duplicate or near-duplicate titles or descriptions. Two targeted edits:

| Route(s) | Before | After | Why |
| --- | --- | --- | --- |
| 21 component pages whose lead opens with the component's name (all 20 editorial pages among them) | "KinetixUI Popover: Popover opens a small panel…" | "KinetixUI Popover opens a small panel…" | the name was repeated in the first words of the visible snippet; `componentDescription` in `lib/seo.ts` |
| `/docs/installation` | "Install KinetixUI two ways: the registry … or the npm packages…" (React only) | names every platform's install route, derived from the manifest | the page now opens with a platform choice and its title says "native source"; the snippet described only React |

Left as they are, on purpose: descriptions longer than a results page shows (most component pages, `/`,
`/components`). Their first sentence carries the meaning and the rest is the derived platform truth; shortening
them without impression data would be guessing. Revisit at Day 14 with Search Console CTR
([`MEASUREMENT.md`](./MEASUREMENT.md) §5). Title lengths: four component titles exceed ~70 characters because they
list all five platforms; the platform list is the point of the title.

**Acquisition paths** (from each landing page to a component view, code, a platform choice, installation or
verification evidence, in the built HTML): every audited docs page and editorial component page links all four
kinds. The guides: the pillar and the parity guide link the evidence, the evaluation guide links components and
platform pages, and the tokens guide linked only `/docs/tokens`; it now also links the platform coverage page from
its "coverage record" point and `/blocks` from its "usage examples" point, in the existing sentences.

**Found, not changed:**

- `/components` server HTML contains **no** links to component pages; the gallery's links exist only after
  hydration (`check:seo-browser` sees them in Chromium). Crawlers that render JavaScript and the sitemap both
  reach every component page, so this is robustness, not a gap today. Owner surface: the gallery's
  client-side rendering (the same area as the `/components?filter=` CLS item below).
- **ART-001's typed counts are stale.** The draft (`marketing/content/drafts/a01/article.md`, "Ours, today")
  says Angular 64; the live manifest says Angular 76 of 98 (React 98, SwiftUI, Compose and Flutter 90). The
  article publishes on Tue 13 Oct and was not edited here, as briefed. The owner decides whether to update the
  sentence before publishing; its own text already says the numbers are generated and move.

## Cluster A — Cross-platform design systems *(primary ICP, awareness → evaluation)*

| Idea | Search intent | Target route | Stage | CTA | Reuses |
| --- | --- | --- | --- | --- | --- |
| **Pillar:** Cross-platform design systems — architecture, parity and trade-offs | cross platform design system architecture | `/guides/cross-platform-design-systems` (**published** 2026-10-12) | awareness | Platform coverage | MESSAGING §1D, ART-001 |
| Design tokens across web, iOS and Android | design tokens web ios android | `/docs/tokens` (expand) | evaluation | Start with the tokens | ART-002 (*Your design tokens stop at the web boundary*) |
| Generated tokens vs generated components | generated tokens vs components; token pipeline | `/guides/generated-tokens-vs-generated-components` (**published** 2026-10-12) | awareness | See token implementation | CLAIMS B-series, `/docs/tokens` trace |
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
| How to verify a component library's claims | design system parity verification | `/guides/verify-design-system-parity` (**published** 2026-10-12) | evaluation | View verification evidence | ART-001 |

## Cluster D — Adoption

| Idea | Search intent | Target route | Stage | CTA | Reuses |
| --- | --- | --- | --- | --- | --- |
| Migrating from a React-only design system | migrate react design system to native | article → `/docs/installation` | adoption | Install | — |
| Source-copy vs package distribution | shadcn style copy components vs npm package | `/docs/installation` section | adoption | Install | registry + npm docs |
| How to evaluate a component library | cross-platform component library evaluation | `/guides/evaluate-cross-platform-component-library` (**published** 2026-10-12) | evaluation | Explore components | evaluator journey audit |

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
