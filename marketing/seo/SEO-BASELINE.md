# SEO baseline

**Supporting document.** Positioning is [`../STRATEGY.md`](../STRATEGY.md), wording is
[`../MESSAGING.md`](../MESSAGING.md), and what any page may claim is [`../CLAIMS.md`](../CLAIMS.md). The cluster
strategy that came before this workstream is [`../seo.md`](../seo.md). This file records repository truth about
crawlability and metadata at the start of the first SEO workstream, the principles every later SEO change follows,
and the gates that keep them true.

Companion files: [`SEARCH-INTENT-MAP.md`](./SEARCH-INTENT-MAP.md) (one primary intent per route),
[`MEASUREMENT.md`](./MEASUREMENT.md) (Organic Qualified Evaluation Rate and the dashboard) and
[`CONTENT-BACKLOG.md`](./CONTENT-BACKLOG.md) (editorial work this slice leaves out).

**Goal.** Organic traffic that reaches Qualified Evaluation. Traffic on its own is not the goal.

---

## 1. Starting truth

Audited on 2026-10-12 against a **local production build of `main` at `eb6957f`**. kinetixui.com is not
reachable from the cloud container that ran the audit (proxy 403), so nothing below was read from the live site.
Every number is from the build output (`apps/web/.next/server/app/**.html`, `sitemap.xml`, `robots.txt`) or the
source.

| Fact | Value | Source |
| --- | --- | --- |
| Framework | Next.js 15.5 App Router, MDX pages, all routes prerendered static (`○ Static`) | `apps/web/package.json`, `next build` |
| Built pages | 129 HTML files: 128 indexable plus `/_not-found` | `.next/server/app` |
| Component pages | 98 (`/docs/components/<slug>`) | `componentDocs` in `lib/site.ts` |
| Docs guide pages | 21, including `/docs` and `/docs/changelog` | `docsGuideNav` |
| Other pages | 9: `/`, `/components`, `/blocks`, `/charts`, `/themes`, `/create`, `/infographic`, `/iot`, `/demos/building-operations` | `mainNav` + `UNLISTED_PUBLIC_ROUTES` |
| Sitemap | `app/sitemap.ts`: 128 URLs derived from the navigation (`publicRoutes()`), no `lastmod`, `priority` or `changefreq` | `lib/seo.ts` |
| robots.txt | `app/robots.ts`: allow `/`, disallow `/r/` (the CLI registry JSON), sitemap and host on `https://kinetixui.com` | `app/robots.ts` |
| Canonical handling | A `canonical()` helper used by **5** pages (`/components`, `/create`, `/iot`, `/demos/building-operations`, `/docs/changelog`); 123 pages had none | `lib/seo.ts` |
| Metadata | Per-page `metadata` objects, title template `%s — KinetixUI` in the root layout | `app/layout.tsx` |
| Open Graph / Twitter | Root layout: `openGraph { type, siteName, url: https://kinetixui.com, locale }`, `summary_large_image`; one file-based image `app/opengraph-image.tsx` (1200×630, built once) | `app/layout.tsx` |
| JSON-LD | Homepage only: `WebSite` + `SoftwareApplication` (no ratings, offers or invented fields) | `components/structured-data.tsx` |
| Redirects | `/colors` and `/theme-builder` → `/create`, 308, one hop; trailing slash stripped with a 308 (`/docs/tokens/` → `/docs/tokens`); www → apex is a 308 in Vercel (domain configuration, not the repo); HTTP → HTTPS is Vercel's | `next.config.mjs`, measured on `next start` |
| 404 | Real 404 status (`/docs/nope`, `/docs/components/nope`), `robots: noindex, follow`, links to Docs, Components, Installation, Changelog | `app/not-found.tsx`, measured |
| Preview deployments | Vercel serves `X-Robots-Tag: noindex` on `*.vercel.app`; not duplicated in robots.txt by design | `app/robots.ts` comment |
| Analytics | PostHog behind a consent/env gate; attribution classifies Google/Bing/DuckDuckGo referrers as `kx_medium = organic` | `lib/analytics-attribution.ts` |
| Existing SEO tests | `lib/seo.test.ts` (sitemap covers nav + every component page, robots), `structured-data.test.tsx` (no invented fields) | — |
| Query state | `/components` writes `?filter=` `?platform=` `?q=`; `/docs/changelog` writes `?filter=` `?q=`; `/demos/building-operations` reads `?scenario=`; PR #350 (open) adds `?platform=` on every page | component-gallery, changelog-view, building-ops, #350 |
| Search Console / Bing verification | None in the repo | grep |

PR #350 (evaluator platform context and install truth) was **open and unmerged** at `eb6957f`. This workstream
does not duplicate its install strip or platform preference; it only makes the `?platform=` it introduces
harmless to search (§4).

---

## 2. Principles

Every SEO change in this repository follows these. They are short on purpose.

1. **One page, one primary intent.** [`SEARCH-INTENT-MAP.md`](./SEARCH-INTENT-MAP.md) assigns it; two pages never
   target the same primary query.
2. **Truthful copy beats keyword density.** A title is a coverage claim. Platform lists and counts are derived from
   the manifest, never typed.
3. **Technical and product depth is the differentiator.** We rank by answering better than a blog post, with code
   and verified coverage.
4. **Component pages are acquisition pages, not API dumps.** They say what the component is, where it exists and
   how to get it, before the props table.
5. **Platform pages explain platform-specific adoption** — maturity, distribution, what exists, what does not.
6. **Internal links follow the evaluator's journey**, with descriptive anchors, not "learn more".
7. **No SEO change may weaken accessibility** (headings, landmarks, focus order, contrast, 200% text, RTL).
8. **No SEO change may degrade performance.** Metadata is static; no client JavaScript exists for SEO.
9. **No hidden text, cloaking or keyword stuffing.** Nothing is rendered for crawlers that a reader does not see.
10. **Thin or duplicate utility surfaces are not indexed** — filter/search/platform query states canonicalize to the
    clean route; `/r/*` is disallowed.

---

## 3. Indexable inventory

| Route type | Count | Index? | Canonical | Notes |
| --- | --- | --- | --- | --- |
| Homepage `/` | 1 | yes | self | the category page |
| Components gallery `/components` | 1 | yes | self, query state stripped | `?filter` `?platform` `?q` are views of one resource |
| Component pages `/docs/components/*` | 98 | yes | self | with #350, `?platform=` canonicalizes to the clean page |
| Platform docs (`/docs/angular`, `swiftui`, `compose`, `flutter`) | 4 | yes | self | **no React page exists** — React intent is owned by `/components` + `/docs/installation` (F-13) |
| Coverage `/docs/platforms` | 1 | yes | self | the verification/parity page |
| Foundation docs (`foundations`, `tokens`, `colors`, `icons`, `theming`, `dark-mode`, `rtl`, `accessibility`) | 8 | yes | self | |
| Getting-started docs (`/docs`, `installation`, `cli`, `kinetixui-json`, `component-specs`) | 5 | yes | self | |
| IoT (`/iot`, `/docs/iot`, `/demos/building-operations`) | 3 | yes | self | demo canonical strips `?scenario=` |
| Blocks `/blocks` | 1 | yes | self | 20 blocks on one page; no per-block routes exist |
| Changelog `/docs/changelog` | 1 | yes | self, query state stripped | |
| Project (`/docs/contributing`) | 1 | yes | self | |
| Tools/showcase (`/charts`, `/themes`, `/create`, `/infographic`) | 4 | yes | self | low search intent; kept indexable because each is a distinct, linked page |
| Articles | 0 | — | — | long-form lives on dev.to; no `/blog` (see `../seo.md`) |
| `/r/*.json` registry | 98 files | **no** (robots disallow) | — | machine-readable |
| `/_not-found` | 1 | **no** (404 + noindex) | — | |

Nothing currently indexable should be removed from the index. Nothing needs a canonical to a *different* route.

---

## 4. Findings, prioritized

Each finding was measured on the baseline build (`node scripts/check-seo.mjs --report` on `eb6957f`, and
`scripts/seo-browser.mjs` against `next start`). "Fixed" means fixed in this workstream's first PR and covered by
a gate rule.

### P0

None. Nothing blocked crawling or indexing: robots.txt allows every page, the sitemap matched the built pages
exactly (128 = 128), and no important page was `noindex`.

### P1

| # | Finding | Evidence | Search / user impact | Action |
| --- | --- | --- | --- | --- |
| F-01 | **`og:url` was the homepage on 125 of 128 pages.** The root layout set `openGraph.url: https://kinetixui.com`, and every page that did not set its own `openGraph` inherited it. | baseline report: `ogUrl = https://kinetixui.com` on every docs and component page | Share cards on LinkedIn, Slack and X treat `og:url` as the page's identity, so a shared `/docs/platforms` link (every ART/LI campaign's destination) was described as the homepage. | **Fixed.** `og:url` = canonical on all 128 (rule `og-url`). |
| F-02 | **123 of 128 indexable pages had no canonical.** | baseline: `canonical-missing: 123` | Every query variant a crawler finds is a separate document. #350 adds `?platform=` to every page, which would multiply each page by five. | **Fixed.** Self-canonical on every page from one origin (rules `canonical-*`). |
| F-03 | **Component titles carried no intent.** `Badge — KinetixUI` × 98. | baseline titles | A results page could not tell what the page was or which platforms it covers. | **Fixed.** Generated from the manifest: `Badge component for React, Angular, SwiftUI, Compose & Flutter — KinetixUI`; a component not on Angular does not claim Angular (rule `component-title`). |

### P2

| # | Finding | Evidence | Impact | Action |
| --- | --- | --- | --- | --- |
| F-04 | `/iot` and `/demos/building-operations` had **no `og:image`**: setting `openGraph` replaced the inherited file-based image (Next merges `openGraph` shallowly). | baseline `og-image: 2` | Text-only share cards for the two IoT pages. | **Fixed** by `pageMetadata` always declaring the image (rule `og-image`). |
| F-05 | **Broken internal links.** `/docs/changelog` linked `/docs/components` (404) twice; the component "Registry" row linked `/r/avatar-group.json` and `/r/combobox.json`, which do not exist. | baseline `link-broken: 3` | 404s for readers and crawlers. | **Fixed**: changelog → `/components`; `registryItemFor()` maps the two to the item that ships them (`avatar`, `command`), tested against `registry.json`. |
| F-06 | **Search snippets carried internal design-tool node IDs** ("Reconciled 1:1 with design source node 54855:13995 (variants: default \| secondary …)") on 10 components; Checkbox and Switch shared one description. | baseline descriptions | Noise in the one line a searcher reads. | **Fixed** in the snippet only; the provenance sentence stays in the page body where `current-truth.test.ts` requires it. |
| F-07 | **Homepage title had no category term** — it was the hero line. | baseline `<title>` | "Cross-platform design system" never appeared in the homepage title. | **Fixed**: `KinetixUI — Cross-platform design system infrastructure`; the share card keeps the hero line. |
| F-08 | `/docs/components/page-header` renders **two `<h1>`**: the page's and the PageHeader demo's (PageHeader hard-codes an `<h1>`). | baseline `h1-count: 1` | Competing H1 on one page. | **Deferred** — a heading-level prop is a public API change to `@kinetixui/ui`. Registered as a debt entry in `check-seo.mjs` (`SECOND_H1`) that fails if the defect is fixed and the entry left behind. |
| F-09 | **No BreadcrumbList** anywhere, although every docs page shows a breadcrumb. | baseline JSON-LD | No breadcrumb trail in results. | **Fixed**: emitted by `DocsBreadcrumb` from the same trail it renders (118 pages; rule `breadcrumb-mismatch`). |
| F-10 | `/components?filter=…&platform=…&q=…` shows **CLS 0.35** in the lab at 1280px; the clean `/components` does not. | `seo-browser.mjs --perf`, before and after identical | Query-state views only, and they now canonicalize to the clean page, so search never lands there; real users following a shared filter link do. | **Deferred** (not SEO-caused; gallery hydration applies the filter after first paint). Logged in the backlog. |
| F-11 | `combobox`'s Installation section shows `npx @kinetixui/cli add combobox`, which is not a registry item. | `registry/registry.json` has no `combobox` | A copied command fails. Not an SEO defect. | **Out of scope**; reported for the evaluator/install thread (#350's install strip derives the same command). |

### P3

| # | Finding | Action |
| --- | --- | --- |
| F-12 | Generic descriptions on `/blocks` ("Ready-made sections…"), `/themes` ("One semantic contract, two value sets."), `/charts`. | **Fixed** with inventory-backed descriptions (blocks names its real categories and derives its count). |
| F-13 | **No React platform page.** Angular, SwiftUI, Compose and Flutter each have one; React adoption is spread across `/components`, `/docs/installation` and `/docs/cli`. | **Deferred** to the content backlog: a decision, not a metadata fix ([`../seo.md`](../seo.md) deprioritises React-only intent). |
| F-14 | No Google Search Console or Bing Webmaster verification. | **Documented** in [`MEASUREMENT.md`](./MEASUREMENT.md) §5. No tokens invented. |
| F-15 | `/demos/building-operations`' H1 is the fictional building's name ("Harbourline House"). | Deferred; the title and description carry the intent. |
| F-16 | `SoftwareApplication` on the homepage is valid but not eligible for Google's software rich result, which wants `offers` and `aggregateRating`. | **Kept as is.** We will not invent either; the structured-data test forbids them. |

---

## 5. Metadata after this slice

Representative routes, read from the production build (full table: run `node scripts/check-seo.mjs --report out.json`).

| Route | `<title>` | Canonical | JSON-LD |
| --- | --- | --- | --- |
| `/` | KinetixUI — Cross-platform design system infrastructure | `https://kinetixui.com` | WebSite, SoftwareApplication |
| `/components` | UI components for React, Angular, SwiftUI, Compose & Flutter — KinetixUI | `/components` | — |
| `/docs/components/button` | Button component for React, Angular, SwiftUI, Compose & Flutter — KinetixUI | self | BreadcrumbList |
| `/docs/components/data-grid` | Data Grid component for React, SwiftUI, Compose & Flutter — KinetixUI | self | BreadcrumbList |
| `/docs/platforms` | Platform coverage for React, Angular, SwiftUI, Compose & Flutter — KinetixUI | self | BreadcrumbList |
| `/docs/angular` | Angular component library and design tokens (preview) — KinetixUI | self | BreadcrumbList |
| `/docs/swiftui` | SwiftUI component library and design tokens — KinetixUI | self | BreadcrumbList |
| `/docs/tokens` | Design tokens for web, iOS and Android from one DTCG source — KinetixUI | self | BreadcrumbList |
| `/blocks` | UI blocks: sign-in, settings, dashboard and pricing sections — KinetixUI | self | — |
| `/iot` | IoT UI components for device state, telemetry and commands — KinetixUI | self | — |

Before → after across all 128 indexable pages:

| Measure | Before | After |
| --- | --- | --- |
| Pages with a canonical | 5 | 128 |
| `og:url` equal to the page's canonical | 2 | 128 |
| `og:url` pointing at the homepage from another page | 125 | 0 |
| Pages with `og:image` | 126 | 128 |
| Pages with BreadcrumbList | 0 | 118 |
| Unique titles / descriptions | 128 / 128 | 128 / 128 |
| Pages with exactly one `<h1>` | 127 | 127 (F-08, registered) |
| Broken internal links | 3 distinct hrefs on 3 pages | 0 |

### How metadata is produced now

- `lib/seo.ts` → `pageMetadata({ path, title, description, social?, type? })`: title, description, absolute
  canonical, `og:url`, OG title/description/type/site name/image, Twitter card — always together, from
  `siteConfig.url`.
- `lib/seo.ts` → `componentMetadata(slug, summary)`: title and description generated from the manifest (platform
  list, which platforms install from npm and which are source you build). Each component MDX page passes only its
  one-line summary.
- `lib/route-seo.ts` → `ROUTE_SEO`: the title and description of every non-component page in one table, so
  uniqueness and intent are reviewable side by side. Platform lists and counts are derived.
- `lib/docs-trail.ts` → one breadcrumb trail feeds the visible `DocsBreadcrumb` and its BreadcrumbList.

### Structured data, and why each type is truthful

| Type | Where | Why it fits |
| --- | --- | --- |
| `WebSite` | `/` | Describes the site: name, canonical URL, language. Unchanged. |
| `SoftwareApplication` | `/` | Unchanged: name, version read from `@kinetixui/ui`, MIT licence, repository. No ratings, price, offers, downloads or reviews. |
| `BreadcrumbList` | every docs page with a trail (118) | Built from the crumbs the page visibly shows. The sidebar group ("Overlays") is not a crumb because it is not a page; the current page has no URL, as on screen. |

**Considered and rejected:** `TechArticle` on component pages needs `datePublished`/`dateModified`, which the build
cannot state truthfully (a fresh checkout gives every file the same mtime — the same reason the sitemap has no
`lastmod`). `SoftwareSourceCode` describes source code or a repository, not a documentation page. `Product` is wrong:
components are not sold. `Organization` would describe an entity that does not exist as one.

---

## 6. Performance

Lab measurements, Chromium headless at 1280×900, `next start` on the same container, median of three runs per route,
before (`eb6957f`) and after this slice. JS is transferred bytes as Playwright reports them; the container is shared,
so differences under ~30 ms are noise.

| Route | LCP ms | CLS | Long-task total ms (TBT proxy) | JS KB |
| --- | --- | --- | --- | --- |
| `/` | 184 → 208 | 0.0003 → 0.0003 | 19 → 25 | 2670 → 2667 |
| `/components?filter=…` | 84 → 108 | 0.346 → 0.346 (F-10, pre-existing) | 34 → 32 | 2656 → 2653 |
| `/docs/components/button?platform=React` | 124 → 132 | 0.0003 → 0.0003 | 17 → 26 | 2674 → 2671 |
| `/docs/components/dialog?platform=Angular` | 108 → 132 | 0.0003 → 0.0003 | 24 → 22 | 2674 → 2671 |
| `/docs/angular` | 136 → 148 | 0.0003 → 0.0003 | 17 → 26 | 2674 → 2671 |
| `/docs/swiftui` | 136 → 144 | 0.0003 → 0.0003 | 17 → 16 | 2674 → 2671 |
| `/docs/compose` | 120 → 124 | 0.0003 → 0.0003 | 15 → 28 | 2674 → 2671 |
| `/docs/flutter` | 140 → 156 | 0.0003 → 0.0003 | 22 → 16 | 2674 → 2671 |
| `/docs/tokens` | 156 → 156 | 0.0003 → 0.0003 | 29 → 37 | 2674 → 2671 |
| `/docs/accessibility` | 132 → 120 | 0.0003 → 0.0003 | 21 → 18 | 2674 → 2671 |
| `/blocks?filter=Forms` | 128 → 132 | 0.0003 → 0.0003 | 20 → 40 | 2656 → 2653 |
| `/iot` | 176 → 156 | 0.0003 → 0.0003 | 25 → 21 | 2656 → 2653 |
| `/docs/changelog?filter=…` | 156 → 164 | 0.0003 → 0.0003 | 34 → 56 | 2687 → 2684 |

**Reading.** No layout shift was introduced, JavaScript went *down* ~3 KB (not investigated further), and LCP/TBT moved within run-to-run noise in both directions. HTML grew ~200 bytes gzipped per page
(e.g. `/docs/components/button` 19.2 → 19.4 KB) for the canonical, OG and JSON-LD tags. No images or fonts changed.
All metadata is static HTML; no client JavaScript was added for SEO. Field data (CrUX/Speed Insights) is not
available from the container.

---

## 7. Accessibility

- Headings: no heading was added, removed or re-levelled. `<h1>` counts are unchanged (127 of 128 with exactly one;
  F-08 pre-existing).
- The breadcrumb renders the same text, links and order; the JSON-LD `<script>` is inside its `<nav>` and carries no
  accessible content. The "Copy page as Markdown" action ignores it (it skips `data-docs-chrome`).
- No visually hidden text, no duplicated content, no landmark, focus-order, contrast or layout change. Titles and
  descriptions are `<head>` content.
- `check:a11y-site` (axe + overflow across the site) runs in CI on this PR.

---

## 8. Gates

### `pnpm check:seo` (CI: `ci.yml`, after `Build site`)

Reads the production build — all prerendered HTML plus `sitemap.xml` and `robots.txt` — in about 7 seconds.
Rules: `title-missing`, `title-duplicate`, `desc-missing`, `desc-duplicate`, `canonical-missing`, `canonical-host`,
`canonical-query`, `canonical-self`, `og-url`, `h1-count`, `sitemap-missing-page`, `sitemap-bad-url`,
`sitemap-omits`, `link-broken`, `og-image`, `jsonld-invalid`, `breadcrumb-mismatch`, `component-title`,
`noindex-important`, `robots`, `orphan`.

Baseline on `eb6957f`: **FAIL** (canonical-missing 123, component-title 192 across 98 pages, og-url 3,
og-image 2, h1-count 1, link-broken 3). After: **129 built pages, 128 indexable, 128 sitemap URLs, 15,465
internal links checked, all rules pass.**

### `pnpm check:seo-browser` (CI: `a11y-site.yml`, against `next start`)

13 representative routes in real Chromium, five of them opened **with query state** (`?platform=`, `?filter=`,
`?q=`): status 200, title, description, canonical equals the clean route, `og:url` equals canonical, not
`noindex`, one `<h1>`, key internal links present, every JSON-LD block parses, BreadcrumbList on docs pages, and
the query state still in the URL after hydration (evaluator behaviour preserved). Baseline: 12 of 13 routes fail (only `/iot`, which already had a self-canonical, passed).
After: 13 of 13 pass. `--perf` produced §6.

### Unit tests

`lib/seo.test.ts` (pageMetadata, component titles derived from the manifest, distinct titles, breadcrumb trail and
JSON-LD agreement), `lib/route-seo.test.ts` (only real routes, unique titles and descriptions, length bounds,
forbidden-claim words), `lib/registry-items.test.ts`, and `marketing-claims.test.ts` now reads every search snippet.

### Negative controls — `node scripts/seo-negative-controls.mjs`

Each control breaks one thing in the built output, runs the gate, expects the named rule, then restores the file
and verifies its SHA-256 before the next control.

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

All 13 caught; gate green again afterwards. Source-level controls were also run on the unit tests: putting
`?platform=React` into `pageMetadata`'s canonical fails two `seo.test.ts` cases, and giving `/docs/flutter`
SwiftUI's title fails `route-seo.test.ts`; both files were restored and their hashes verified.

---

## 9. What this slice deliberately did not do

- Rewrite component copy by hand, or create new routes (no category pages, no `/design-tokens/<platform>`, no React
  page). See [`CONTENT-BACKLOG.md`](./CONTENT-BACKLOG.md).
- Touch PR #350's surfaces beyond the metadata lines of the component and platform pages. The on-page component
  template work (intro, related components, platform docs links) is a second PR that builds on #350's install strip
  once it merges.
- Generate per-component OG images. One build-time card serves every page; per-component images would add a build
  step and ~100 PNGs for a card few people see. Revisit if share-card CTR data says otherwise.
- Add Search Console or Bing verification tokens (none were provided).
- Change QE or Adoption Intent definitions, positioning, Angular maturity, packages or component behaviour.
