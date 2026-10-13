# SEO baseline

**Supporting document.** Positioning is [`../STRATEGY.md`](../STRATEGY.md), wording is
[`../MESSAGING.md`](../MESSAGING.md), and what any page may claim is [`../CLAIMS.md`](../CLAIMS.md). The cluster
strategy that came before this workstream is [`../seo.md`](../seo.md). This file records repository truth about
crawlability and metadata at the start of SEO Phase 1, the principles every later SEO change follows, and the gates
that keep them true.

Companion files: [`SEARCH-INTENT-MAP.md`](./SEARCH-INTENT-MAP.md) (one primary intent per route),
[`MEASUREMENT.md`](./MEASUREMENT.md) (Organic Qualified Evaluation Rate and the Search Console checklist) and
[`CONTENT-BACKLOG.md`](./CONTENT-BACKLOG.md) (Phase 2 editorial work and follow-ups this phase leaves out).

**Goal.** Organic visitors who reach Qualified Evaluation. Traffic on its own is not the goal.

---

## 1. Starting truth

Audited on 2026-10-12 against a **local production build of `main` at `bc62ed7`** (PR #350, evaluator platform
context and install truth, merged). The three commits the brief named are all ancestors of that SHA: `fe4221d`
(Track A), `eb6957f` (Angular C2b) and `bc62ed7` (#350). kinetixui.com is not reachable from the cloud container that
ran the audit (proxy 403), so nothing below was read from the live site. Every number comes from the build output
(`apps/web/.next/server/app/**.html`, `sitemap.xml`, `robots.txt`) or the source.

| Fact | Value | Source |
| --- | --- | --- |
| Framework | Next.js 15.5 App Router, MDX pages, every route prerendered static (`○ Static`) | `apps/web/package.json`, `next build` |
| Built pages | 129 HTML files: 128 indexable plus `/_not-found` | `.next/server/app` |
| Component pages | 98 (`/docs/components/<slug>`): 97 components plus the `combobox` recipe | `componentDocs` in `lib/site.ts`, `platform-support.ts` |
| Docs guide pages | 21, including `/docs` and `/docs/changelog` | `docsGuideNav` |
| Other pages | 9: `/`, `/components`, `/blocks`, `/charts`, `/themes`, `/create`, `/infographic`, `/iot`, `/demos/building-operations` | `mainNav` + `UNLISTED_PUBLIC_ROUTES` |
| Sitemap | `app/sitemap.ts`: 128 URLs derived from the navigation (`publicRoutes()`), no `lastmod`, `priority` or `changefreq` | `lib/seo.ts` |
| robots.txt | `app/robots.ts`: allow `/`, disallow `/r/` (CLI registry JSON), sitemap and host on `https://kinetixui.com` | `app/robots.ts` |
| Canonicals | **5** pages had one (`/components`, `/create`, `/iot`, `/demos/building-operations`, `/docs/changelog`); 123 had none | baseline gate: `canonical-missing: 123` |
| `og:url` | the homepage URL on **125** other indexable pages (inherited from the root layout) | baseline report |
| Titles | template `%s — KinetixUI`; every component page `<Name> — KinetixUI` | baseline report |
| Open Graph / Twitter | root `openGraph { type, siteName, url, locale }`, `summary_large_image`; one file-based image (`app/opengraph-image.tsx`, 1200×630); 126 of 128 pages had `og:image` | baseline gate: `og-image: 2` |
| JSON-LD | homepage only: `WebSite` + `SoftwareApplication`; no BreadcrumbList anywhere | `components/structured-data.tsx` |
| H1 | exactly one on 127 of 128; `/docs/components/page-header` has two (the PageHeader demo hard-codes `<h1>`) | baseline report |
| Broken internal links | 3 hrefs (`/docs/components` from the changelog, `/r/avatar-group.json`, `/r/combobox.json`) | baseline gate: `link-broken: 3` |
| Redirects | `/colors`, `/theme-builder` → `/create` (308, one hop); trailing slash stripped with a 308; www → apex is a 308 in Vercel (domain setting, not the repo); HTTP → HTTPS is Vercel's | `next.config.mjs`, `next start` |
| 404 | real 404 status (`/docs/nope`, `/docs/components/nope`), `robots: noindex, follow`, links to Docs, Components, Installation, Changelog | `app/not-found.tsx`, measured |
| Preview deployments | Vercel serves `X-Robots-Tag: noindex` on `*.vercel.app` | `app/robots.ts` comment |
| Query state | `/components` writes `?filter=` `?platform=` `?q=`; `/blocks` `?filter=`; `/docs/changelog` `?filter=` `?q=`; `/demos/building-operations` reads `?scenario=`; #350 reads `?platform=` on **every** page (`platform-preference.ts`) | source, `seo-browser.mjs` |
| Component page template (#350) | `ComponentMeta`: category, status, built-on, Platforms (per-platform verification), **Install strip** (per platform, with a "Setup →" link to that platform's docs page), Registry, A11y | `components/component-meta.tsx` |
| Analytics | PostHog behind a consent/env gate; attribution classifies Google/Bing/DuckDuckGo referrers as `kx_medium = organic` | `lib/analytics-attribution.ts` |
| Existing SEO tests | `lib/seo.test.ts` (sitemap, robots), `structured-data.test.tsx` (no invented fields) | — |
| Search Console / Bing verification | none in the repo | grep |

**Before changes,** on `bc62ed7`: the web build passed; `check:seo` (this phase's gate, run against that build)
failed with canonical-missing 123, component-title 173, component-related 98, og-url 3, og-image 2, link-broken 3;
`check:seo-browser` failed 12 of 13 routes (only `/iot`, which already had a self-canonical, passed).

---

## 2. Principles

Every SEO change in this repository follows these. They are short on purpose.

1. **One page, one primary intent.** [`SEARCH-INTENT-MAP.md`](./SEARCH-INTENT-MAP.md) assigns it; two pages never
   target the same primary query.
2. **Truthful copy beats keyword density.** A title is a coverage claim. Platform lists, counts and maturity are
   derived from the manifest, never typed.
3. **Technical and product depth is the differentiator.** We rank by answering better than a blog post, with code
   and verified coverage.
4. **Component pages are acquisition pages, not API dumps.** They say what the component is, where it exists and
   how to get it, before the props table.
5. **Platform pages explain platform-specific adoption**: maturity, distribution, what exists, what does not.
6. **Internal links follow the evaluator's journey**, with descriptive anchors, not "learn more".
7. **No SEO change may weaken accessibility** (headings, landmarks, focus order, contrast, 200% text, RTL).
8. **No SEO change may degrade performance.** Metadata is static HTML; no client JavaScript exists for SEO.
9. **No hidden text, cloaking or keyword stuffing.** Nothing is rendered for crawlers that a reader does not see.
10. **Query state should not create duplicate indexable pages.** Filter, search and platform states canonicalize to
    the clean route and keep working for the visitor; utility output (`/r/*`) is disallowed.

---

## 3. Indexable inventory

| Route family | Count | Indexable | In sitemap | Canonical behaviour | Primary intent | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Homepage `/` | 1 | yes | yes | self | cross-platform design system (category) | `WebSite` + `SoftwareSourceCode` JSON-LD |
| Components gallery `/components` | 1 | yes | yes | self; `?filter` `?platform` `?q` stripped | multi-platform component library | filters are views of one resource |
| Component pages `/docs/components/*` | 98 | yes | yes | self; #350's `?platform=` stripped | `<component>` component for its platforms | title and description generated from the manifest |
| Platform pages (`angular`, `swiftui`, `compose`, `flutter`) | 4 | yes | yes | self | `<platform>` component library / design system | **no React page**; React intent is owned by `/components` + `/docs/installation` (F-13) |
| Coverage `/docs/platforms` | 1 | yes | yes | self | platform parity, design system verification | ART-001's destination |
| Foundations (`foundations`, `tokens`, `colors`, `icons`, `theming`, `dark-mode`, `rtl`, `accessibility`) | 8 | yes | yes | self | tokens, theming, accessibility and RTL evidence | |
| Getting started (`/docs`, `installation`, `cli`, `kinetixui-json`, `component-specs`) | 5 | yes | yes | self | install, adoption | |
| IoT (`/iot`, `/docs/iot`, `/demos/building-operations`) | 3 | yes | yes | self; demo strips `?scenario=` | IoT interface patterns | experimental, React-only, simulated demo |
| Blocks `/blocks` | 1 | yes | yes | self; `?filter=` stripped | application UI blocks | 20 blocks on one page; no per-block routes |
| Changelog `/docs/changelog` | 1 | yes | yes | self; `?filter` `?q` stripped | brand, navigational | |
| Project `/docs/contributing` | 1 | yes | yes | self | brand, community | |
| Tools (`/charts`, `/themes`, `/create`, `/infographic`) | 4 | yes | yes | self | low search intent | kept: each is a distinct, linked page |
| Articles | 0 | — | — | — | — | long-form lives on dev.to; no `/blog` (see `../seo.md`) |
| Registry `/r/*.json` | 97 files | **no** (robots disallow) | no | — | machine-readable | |
| `/_not-found` | 1 | **no** (404 + noindex) | no | — | — | |

Nothing indexable should be removed from the index, and nothing needs a canonical to a *different* route.

---

## 4. Crawlability and indexation

| Item | Current behaviour (after this phase) | Evidence | Severity at start | Fix / defer |
| --- | --- | --- | --- | --- |
| robots.txt | allow `/`, disallow `/r/`, `Sitemap: https://kinetixui.com/sitemap.xml`, `Host`; no query patterns (they would be fragile and could block real pages) | `seo.test.ts` robots cases; gate rule `robots` | OK | kept; regression-tested |
| Sitemap | 128 absolute https apex URLs, no query strings, no duplicates, equal to the indexable set; no `lastmod`, because the build cannot state a truthful one (a fresh checkout gives every file the same mtime) | gate rules `sitemap-missing-page`, `sitemap-bad-url`, `sitemap-omits` | OK | kept; tested from both sides |
| Canonicals | self-canonical on all 128 indexable pages: absolute, apex, no query string | gate `canonical-missing`/`-host`/`-query`/`-self`; browser check on query-state URLs | **P1** (123 missing) | **fixed** |
| Query state | `/docs/components/button?platform=SwiftUI` opens on the SwiftUI code tab for the visitor and declares `/docs/components/button` canonical | `check:seo-browser` (clicks Code, asserts the selected tab) | **P1** with #350 (every page reachable ×5) | **fixed**; #350's behaviour untouched |
| `og:url` | equal to the canonical on all 128 | gate `og-url` | **P1** (125 wrong) | **fixed** |
| Noindex | only `/_not-found`; no important page is noindex | gate `noindex-important` | OK | guarded |
| 404 | real 404, noindex, recovery links | measured on `next start` | OK | documented |
| Redirects | 308 one-hop for `/colors`, `/theme-builder` and trailing slash; www → apex in Vercel | `next.config.mjs`; the gate accepts redirect sources as valid link targets | OK | documented; DNS untouched |
| Internal links | 0 broken across 15,470 checked | gate `link-broken` | P2 (3 broken) | **fixed** |
| Orphans | every indexable page has an inbound link besides the sitemap | gate `orphan` | OK | guarded |
| Server rendering | titles, descriptions, canonicals, JSON-LD, breadcrumb, related links and platform summaries are all in the prerendered HTML | the gate reads built HTML without running JavaScript | OK | kept |

---

## 5. Findings, prioritised

"Fixed" means fixed in this PR and covered by a gate rule or a test.

### P0

None. Robots allowed every page, the sitemap matched the built pages (128 = 128) and no important page was noindex.

### P1

| # | Finding | Evidence | Impact | Action |
| --- | --- | --- | --- | --- |
| F-01 | **`og:url` was the homepage on 125 pages** (root layout `openGraph.url`, inherited). | baseline report | Share cards on LinkedIn, Slack and X described every shared docs link, including each campaign's `/docs/platforms`, as the homepage. | **Fixed** (`og-url`). |
| F-02 | **123 of 128 pages had no canonical.** | `canonical-missing: 123` | #350's `?platform=` made every page reachable under five more URLs. | **Fixed** (`canonical-*`). |
| F-03 | **Component titles carried no intent**: `Badge — KinetixUI` ×98. | baseline titles; `component-title: 173` | A result could not say what the page is or where it runs. | **Fixed**: `Badge component for React, Angular, SwiftUI, Compose & Flutter — KinetixUI`, from the manifest. |

### P2

| # | Finding | Evidence | Impact | Action |
| --- | --- | --- | --- | --- |
| F-04 | `/iot` and `/demos/building-operations` had no `og:image` (a page `openGraph` replaces the inherited file image). | `og-image: 2` | Text-only share cards. | **Fixed** (`og-image`). |
| F-05 | Broken links: changelog → `/docs/components`; Registry row → `/r/avatar-group.json`, `/r/combobox.json`. | `link-broken: 3` | 404s. | **Fixed**; `registryItemFor()` is tested against `registry.json`. |
| F-06 | Descriptions carried design-tool node IDs on 10 components; Checkbox and Switch shared one. | baseline descriptions | Noise in the snippet. | **Fixed** in the snippet; the provenance sentence stays in the body (`current-truth.test.ts`). |
| F-07 | The homepage title had no category term. | baseline `<title>` | Category query unanswered. | **Fixed**: `KinetixUI — Cross-platform design system infrastructure`. |
| F-08 | `/docs/components/page-header` renders two `<h1>`. | gate debt register | Competing H1. | **Deferred** (a heading-level prop is a public `@kinetixui/ui` API change); registered in `check-seo.mjs` `SECOND_H1`, which fails if the entry outlives the defect. |
| F-09 | No BreadcrumbList although docs pages show a breadcrumb. | baseline JSON-LD | No trail in results. | **Fixed**: one trail feeds both (118 pages, `breadcrumb-mismatch`). |
| F-10 | `/components?filter=…` lab CLS 0.346 at 1280px. | `--perf`, identical before and after | Shared filter links only; canonicalized away from search. | **Deferred** (gallery hydration, not SEO). |
| F-11 | `npx @kinetixui/cli add combobox` is shown (now by #350's install strip) but `combobox` is not a registry item. | `registry.json` | A copied command fails. | **Out of scope**: an install-truth defect, reported for the evaluator work. |
| F-17 | Component pages had no contextual links to sibling components (only the sidebar's full list). | `component-related: 98` | No guidance between alternatives (Dialog or Sheet). | **Fixed**: Related components on all 98 (`component-related`). |
| F-18 | Platform pages answered maturity, distribution and coverage in prose of differing shape. | page review | Hard to compare; near-identical intros. | **Fixed**: a derived "at a glance" block on each (§7). |

### P3

| # | Finding | Action |
| --- | --- | --- |
| F-12 | Generic descriptions on `/blocks`, `/themes`, `/charts`. | **Fixed** with inventory-backed descriptions. |
| F-13 | No React platform page. | **Deferred**: a content decision ([`CONTENT-BACKLOG.md`](./CONTENT-BACKLOG.md) cluster B). |
| F-14 | No Search Console or Bing verification. | **Documented** ([`MEASUREMENT.md`](./MEASUREMENT.md) §7–§8); no tokens invented. |
| F-15 | `/demos/building-operations`' H1 is the fictional building's name. | Deferred; the title and description carry the intent. |
| F-16 | The homepage's `SoftwareApplication` used `codeRepository` (not a SoftwareApplication property) and stated `@kinetixui/ui`'s version for a multi-package project. | **Fixed**: the node is now `SoftwareSourceCode` (§8). |
| F-19 | Some descriptions run past ~160 characters (`/iot` 306, component pages up to ~275) and will be truncated in results. | Kept: the component name and intent come first; the platform qualifier is the part that truncates. Revisit with Search Console CTR. |
| F-20 | **Docs readability at 1280px with 200% text**: the docs column narrows to about 128px between the sidebar and the table of contents. | **Not fixed here, by instruction**; follow-up in [`CONTENT-BACKLOG.md`](./CONTENT-BACKLOG.md). |

---

## 6. Metadata

### Architecture

- `lib/seo.ts` → `pageMetadata({ path, title, description, absoluteTitle?, social?, type? })`: title, description,
  absolute canonical, `og:url`, OG title, description, type, site name, locale and image, and the Twitter card, always
  together, from the one origin in `siteConfig.url`. Robots stay on the root layout default (`index, follow`);
  `not-found` overrides it.
- `lib/seo.ts` → `componentMetadata(slug, summary)`: title and description generated from the manifest (platform
  list; which platforms install from npm and which are source you build; non-stable maturity in brackets). Each of
  the 98 component pages passes only its one-line summary, which is the explicit override point for high-value
  pages (Button, Input, Select, Switch and six others have hand-cleaned summaries).
- `lib/route-seo.ts` → `ROUTE_SEO`: every non-component page's title and description in one reviewable table, with
  platform lists and maturity derived.
- `lib/docs-trail.ts` → one breadcrumb trail feeds the visible `DocsBreadcrumb` and its BreadcrumbList
  (`breadcrumbJsonLd` in `lib/seo.ts`).

### Representative results

| Route | `<title>` | JSON-LD |
| --- | --- | --- |
| `/` | KinetixUI — Cross-platform design system infrastructure | WebSite, SoftwareSourceCode |
| `/components` | UI components for React, Angular, SwiftUI, Compose & Flutter — KinetixUI | — |
| `/docs/components/button` | Button component for React, Angular, SwiftUI, Compose & Flutter — KinetixUI | BreadcrumbList |
| `/docs/components/data-grid` | Data Grid component for React, SwiftUI, Compose & Flutter — KinetixUI | BreadcrumbList |
| `/docs/platforms` | Platform coverage for React, Angular, SwiftUI, Compose & Flutter — KinetixUI | BreadcrumbList |
| `/docs/angular` | Angular component library and design tokens (preview) — KinetixUI | BreadcrumbList |
| `/docs/swiftui` | SwiftUI component library and design tokens — KinetixUI | BreadcrumbList |
| `/docs/tokens` | Design tokens for web, iOS and Android from one DTCG source — KinetixUI | BreadcrumbList |
| `/blocks` | UI blocks: sign-in, settings, dashboard and pricing sections — KinetixUI | — |
| `/iot` | IoT UI components for device state, telemetry and commands — KinetixUI | — |

The brief's example titles ("Angular Component Library & Design System — KinetixUI") were guidance, not literals.
The shipped forms keep Angular's maturity in its title and use the site's existing em-dash template.

### Before → after, all 128 indexable pages

| Measure | Before (`bc62ed7`) | After |
| --- | --- | --- |
| Pages with a canonical | 5 | 128 |
| `og:url` equal to the page's canonical | 2 | 128 |
| `og:url` pointing at the homepage from another page | 125 | 0 |
| Pages with `og:image` / Twitter card | 126 / 128 | 128 / 128 |
| Pages with BreadcrumbList | 0 | 118 |
| Component pages with Related components | 0 | 98 |
| Unique titles / descriptions | 128 / 128 | 128 / 128 |
| Pages with exactly one `<h1>` | 127 | 127 (F-08, registered) |
| Broken internal links | 3 hrefs | 0 |

---

## 7. Component and platform pages

**Component template.** Each component page now carries:

| Part | Source | Status |
| --- | --- | --- |
| A. Intro | the page's lead paragraph (present on all 98) plus the generated description | kept; no per-page rewrite |
| B/C. Platform truth and install | #350's Platforms row and Install strip | **reused, not duplicated** |
| D. Accessibility evidence | #350's per-platform verification and the "React: audited in CI" row | reused; no "fully accessible" or compliance wording anywhere (`route-seo.test.ts`, `platform-at-a-glance.test.tsx`) |
| E. Related components | `lib/related-components.ts`: an explicit table (56 entries) for the families a reader chooses between (Dialog → Alert Dialog, Modal, Sheet, Drawer; Select → Native Select, Combobox, Multi-select, Command; Input → Input Group, Textarea, Password Input, Number Input), topped up to four from the component's category neighbours | **new**; server-rendered links to canonical URLs; every component has at least one inbound related link (tested) |
| F. Platform docs | the Install strip's per-platform "Setup →" link (`SETUP_HREF`) | reused; plain links in the HTML, independent of the stored platform preference |

**Platform pages.** `/docs/angular`, `/docs/swiftui`, `/docs/compose` and `/docs/flutter` each open with a derived
`PlatformAtAGlance` block: package and maturity, distribution (published or source-only, from
`distribution.published`), catalogue coverage, the not-implemented count with a link to the reasons, catalogue
verification level and test-evidence counts (interaction, accessibility, RTL, large text) with the CI workflow, the
token model, and a link to the page's own first step. The four pages differ exactly where the platforms do:

| Platform | Package · maturity | Distribution | Catalogue | Components with accessibility evidence |
| --- | --- | --- | --- | --- |
| Angular | `@kinetixui/angular` · preview | npm | 71 of 98 | 71 |
| SwiftUI | `KinetixUI` · stable | not on Swift Package Manager yet | 90 of 98 | 0 |
| Compose | `com.kinetixui:ui-compose` · stable | not on Maven Central yet | 90 of 98 | 6 |
| Flutter | `kinetix_ui` · stable | not on pub.dev yet | 90 of 98 | 5 |

React has no platform page (F-13); its facts are on `/docs/platforms` and `/docs/installation`.

**Internal links added.** Foundation guides now link along the evaluator journey with descriptive anchors:
theming, accessibility and RTL link to each other and to tokens, platform coverage, components or the Direction
Provider; installation links to tokens, theming, accessibility and blocks; platform coverage links to components and
accessibility. `/docs/tokens` keeps its curated next steps, whose order a test fixes as a CTA hierarchy. The homepage
already linked components, platform coverage, tokens, accessibility, blocks and IoT, and was not changed. Every docs
page also links every component page through the sidebar, so contextual links matter more than raw link counts.

---

## 8. Structured data, and why each type is truthful

| Type | Where | Why it fits |
| --- | --- | --- |
| `WebSite` | `/` | The site: name, canonical URL, language. Unchanged. |
| `SoftwareSourceCode` | `/` | KinetixUI is an open-source repository of libraries. Name, URL, `codeRepository`, MIT licence and `programmingLanguage` (TypeScript, Swift, Kotlin, Dart, derived from the platform list) are all provable. It replaces `SoftwareApplication`, which does not define `codeRepository` and implied a single product version. |
| `BreadcrumbList` | every docs page with a trail (118) | Built from the crumbs the page visibly shows; the sidebar group is not a crumb because it is not a page. |

**Considered and rejected:** `Organization` (no organisation entity exists; it would be invented),
`SoftwareApplication` (not an application; Google's rich result wants `offers` and `aggregateRating`, which we will
not invent), `TechArticle` on component pages (needs truthful `datePublished`/`dateModified`, which the build cannot
state), `Product` (nothing is sold). The test forbids ratings, reviews, prices, offers, download counts, founding
dates and `sameAs`.

---

## 9. Performance

Lab, Chromium headless at 1280×900, `next start` in the same container, **median of three** runs per route, base
`bc62ed7` vs this branch. Differences under ~30 ms are run-to-run noise on a shared container.

| Route | LCP ms | CLS | Long-task total ms (TBT proxy) | JS KB |
| --- | --- | --- | --- | --- |
| `/` | 192 → 176 | 0.0003 → 0.0003 | 23 → 17 | 2673 → 2679 |
| `/components?filter=…` | 104 → 96 | 0.346 → 0.346 (F-10) | 31 → 31 | 2660 → 2666 |
| `/docs/components/button?platform=SwiftUI` | 140 → 140 | 0.0003 → 0.0003 | 18 → 19 | 2678 → 2684 |
| `/docs/components/dialog?platform=Angular` | 128 → 124 | 0.0003 → 0.0003 | 47 → 19 | 2678 → 2684 |
| `/docs/angular` | 136 → 148 | 0.0003 → 0.0003 | 18 → 16 | 2677 → 2683 |
| `/docs/swiftui` | 136 → 136 | 0.0003 → 0.0003 | 15 → 29 | 2678 → 2684 |
| `/docs/compose` | 132 → 140 | 0.0003 → 0.072 (see below) | 19 → 26 | 2677 → 2683 |
| `/docs/flutter` | 140 → 152 | 0.0003 → 0.0003 | 25 → 20 | 2678 → 2684 |
| `/docs/tokens` | 164 → 184 | 0.0003 → 0.0003 | 34 → 23 | 2677 → 2683 |
| `/docs/accessibility` | 136 → 128 | 0.0003 → 0.0003 | 21 → 15 | 2677 → 2683 |
| `/blocks?filter=Forms` | 132 → 140 | 0.0003 → 0.0003 | 31 → 34 | 2659 → 2665 |
| `/iot` | 168 → 176 | 0.0003 → 0.0003 | 23 → 19 | 2659 → 2665 |
| `/docs/changelog?filter=…` | 156 → 200 | 0.0003 → 0.0003 | 32 → 71 | 2691 → 2697 |

**Reading.** JavaScript grew about 6 KB transferred on every route, including `/` and `/iot`, so it sits in a
shared chunk (most likely the Related components client component and its component list); it was not traced
further. LCP and long tasks moved within noise in both directions. The `/docs/compose` CLS median is a first-load
font-swap reflow that happens intermittently on **both** builds: in ten fresh-browser loads each, base
`/docs/compose` shifted once (0.052), branch `/docs/compose` never, branch `/docs/swiftui` twice (0.102) and base
`/docs/swiftui` never. It is a pre-existing race, not a regression from this change, and it is in the backlog. All
metadata is static HTML; no client JavaScript runs for SEO. Field data (CrUX, Speed Insights) is not available from
the container.

---

## 10. Accessibility

- No heading was removed or re-levelled. New headings: one `h2` "Related components" at the foot of each component
  page, and an `h2` "Related guides" or "Next steps" after the last section of four guides.
- Related components is a `<nav>` labelled by its heading. Links are real anchors with visible text, a 36px minimum
  height and a focus ring. The platform summary is a `<dl>` like `ComponentMeta`'s and wraps at narrow widths.
- The breadcrumb renders the same text, links and order; its JSON-LD sits inside the `<nav>` and has no accessible
  content.
- No visually hidden text, cloaking or duplicated content. `check:a11y-site` (axe and overflow) runs in CI.

---

## 11. Gates

### `pnpm check:seo` (CI: `ci.yml`, after `Build site`)

Reads every prerendered HTML file plus `sitemap.xml` and `robots.txt`. Rules: `title-missing`, `title-duplicate`,
`desc-missing`, `desc-markup`, `desc-duplicate`, `canonical-missing`, `canonical-host`, `canonical-query`, `canonical-self`,
`og-url`, `h1-count`, `sitemap-missing-page`, `sitemap-bad-url`, `sitemap-omits`, `link-broken`, `og-image`,
`jsonld-invalid`, `breadcrumb-mismatch`, `component-title`, `component-related`, `noindex-important`, `robots`,
`orphan`.

Baseline on `bc62ed7`: **FAIL**. After: **129 built pages, 128 indexable, 128 sitemap URLs, 15,470 internal links
checked, all 23 rules pass.**

### `pnpm check:seo-browser` (CI: `a11y-site.yml`, against `next start`)

13 representative routes in real Chromium, five opened **with query state**. It checks status 200, title,
description, canonical equal to the clean route, `og:url` equal to the canonical, not noindex, one `<h1>`, key
internal links (including related components and platform docs), every JSON-LD block parses, BreadcrumbList on
docs pages, query state still in the URL after hydration, and, for `button?platform=SwiftUI` and
`dialog?platform=Angular`, that the requested platform's code tab is the one selected. Baseline: 12 of 13 fail.
After: 13 of 13 pass.

### Unit tests

`seo.test.ts`, `route-seo.test.ts`, `registry-items.test.ts`, `related-components.test.ts` (only real pages, the
brief's families, every page has related links and at least one inbound one), `platform-at-a-glance.test.tsx`,
`structured-data.test.tsx` (SoftwareSourceCode, languages derived, no version claimed, no invented fields) and
`marketing-claims.test.ts`, which now reads every search snippet.

### Negative controls — `node scripts/seo-negative-controls.mjs`

Each control breaks one thing in the built output, runs the gate, expects the named rule, restores the file and
verifies its SHA-256. Nothing in the source tree is touched, and no control is committed.

| NC | Break | Caught by | Restored |
| --- | --- | --- | --- |
| 01 | remove the canonical from `/docs/components/button` | `canonical-missing` | ✓ sha256 |
| 02 | `?platform=React` in `/docs/components/dialog`'s canonical | `canonical-query` | ✓ |
| 03 | give `/docs/swiftui` Flutter's title | `title-duplicate` | ✓ |
| 04 | second `<h1>` on `/docs/tokens` | `h1-count` | ✓ |
| 05 | `/components?filter=Overlays` in the sitemap | `sitemap-bad-url` | ✓ |
| 06 | `/docs/installation` links `/docs/platform-coverage` | `link-broken` | ✓ |
| 07 | malformed JSON-LD on `/docs/components/select` | `jsonld-invalid` | ✓ |
| 08 | remove `/docs/components/tabs` from the sitemap | `sitemap-omits` | ✓ |
| 09 | `noindex` on `/components` | `noindex-important` | ✓ |
| 10 | `og:image` → `/og/rtl.png` (does not exist) | `og-image` | ✓ |
| 11 | breadcrumb JSON-LD says "Library" where the page shows "Components" | `breadcrumb-mismatch` | ✓ |
| 12 | `Badge — KinetixUI` (no platform) | `component-title` | ✓ |
| 13 | drop the only link to `/demos/building-operations` | `orphan` | ✓ |
| 14 | drop Related components from `/docs/components/slider` | `component-related` | ✓ |
| 15 | canonical on `https://kinetixui.com.evil.example` (the origin as a host prefix) | `canonical-host` | ✓ |
| 16 | MDX inline code (`` `<kbd>` ``) in a meta description | `desc-markup` | ✓ |

All 16 were caught and the gate is green again afterwards. The browser check's platform assertion was checked the
same way: expecting Flutter on `button?platform=SwiftUI` failed with the SwiftUI tab reported as selected, and the
script was restored.

---

## 12. What this phase deliberately did not do

- Rewrite component copy by hand, or create routes (no category pages, no `/design-tokens/<platform>`, no React
  page). See [`CONTENT-BACKLOG.md`](./CONTENT-BACKLOG.md).
- Change #350's platform preference, install strip or analytics; QE or Adoption Intent; Angular maturity; native
  publishing; Core/Pro; IoT behaviour; packages; positioning.
- Fix the docs column at 1280px with 200% text (F-20), by instruction; it is a separate follow-up.
- Generate per-component OG images (one build-time card serves every page; revisit with share-card data).
- Add Search Console or Bing tokens (none were provided), touch DNS, or publish ART-001.
