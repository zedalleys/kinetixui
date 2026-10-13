# SEO measurement

**Supporting document.** The canonical funnel, Qualified Evaluation (QE), Adoption Intent, eligible arriving
sessions and the baseline policy are defined in [`../analytics.md`](../analytics.md) and are **not changed here**.
This file adds the organic slice of those measures and says where each search number comes from.

---

## 1. The one metric

### Organic Qualified Evaluation Rate

> **Numerator** — eligible arriving sessions attributed to organic search that contain at least one existing
> Qualified Evaluation signal ([`../analytics.md`](../analytics.md) §3, unchanged).
> **Denominator** — eligible arriving sessions attributed to organic search.

*For:* whether search brings people who inspect the product, which is the only reason to do SEO here. A rise in
organic sessions with a flat or falling Organic QER is not a win.

**Organic attribution** is the site's own, already shipped: `lib/analytics-attribution.ts` classifies a Google,
Bing or DuckDuckGo referrer (and `utm_medium=organic`) as `kx_medium = organic`, keeps only the category, and
discards the referrer itself. A session is organic if **any** of its events carries `kx_medium = organic` — the
same any-event rule `summarizeSessions` uses for campaigns, because `kx_*` attribution is per tab while PostHog's
`$session_id` spans tabs ([`../measurement/WEEK-1-INTEGRITY-AUDIT.md`](../measurement/WEEK-1-INTEGRITY-AUDIT.md)).

**Same rules as every other tile:** eligible arriving sessions only, diagnostic traffic excluded, NO BASELINE until
§10 of `analytics.md` says otherwise, absolute counts before percentages.

---

## 2. Supporting metrics, and where each lives

| Metric | Definition | Source |
| --- | --- | --- |
| Impressions, clicks, CTR, average position | per page and per query | Google Search Console; Bing Webmaster Tools |
| Indexed pages | "Pages" report, indexed vs not, with the reason | Search Console |
| Pages with impressions | distinct pages with ≥1 impression in the window | Search Console |
| Non-brand queries | queries not matching `kinetix` | Search Console (query filter) |
| Platform-intent queries | queries matching `react\|angular\|swiftui\|compose\|flutter` | Search Console (regex filter) |
| Component-intent queries | queries containing a component name from `componentDocs` | Search Console (export, joined offline) |
| Organic landing sessions | eligible arriving sessions with `kx_medium = organic` | PostHog |
| Landing pages by Organic QER | the session's first `$pageview` path, grouped, with QER per group | PostHog |
| Organic component views | `component_viewed` in organic sessions | PostHog |
| Organic code copies | `component_code_copied` + `block_code_copied` in organic sessions | PostHog |
| Organic installation views / copies | `installation_viewed`, `install_command_copied`, `cli_command_copied` in organic sessions | PostHog |
| Organic platform selections | `platform_selected` in organic sessions | PostHog |
| Organic returning evaluators | distinct anonymous IDs with an organic QE session in ≥2 sessions | PostHog |

**Search query data stays in Search Console.** Nothing here copies queries into PostHog: the site's privacy model
drops referrers on the client, the query string is not available to the page anyway (Google does not send it), and
joining the two would need a connector this project does not have. The two systems meet at the **landing page**:
Search Console says which pages earn clicks for which queries; PostHog says what visitors on those landing pages
do next.

---

## 3. Organic measurement workflow (PostHog)

**QE membership is not changed here.** Every query below uses the §3 Qualified Evaluation signals, the §4
arrival allowlist and the §11 query rules of [`../analytics.md`](../analytics.md) exactly as written there; the
only thing this section adds is the organic slice. If those definitions change, these queries change with them.

### 3.1 Source and referrer rules

| Term | Rule | Why |
| --- | --- | --- |
| Organic event | `properties.kx_medium = 'organic'` | the site's own classification: a Google (any country domain), Bing or DuckDuckGo referrer, or `utm_medium=organic` |
| Organic session | an eligible arriving session in which **any** event is organic | `kx_*` is per tab; `$session_id` spans tabs (rule 3 in `analytics.md` §11) |
| Search engine | `properties.kx_source` on the organic events: `google`, `bing`, `duckduckgo` | the category only; the referrer itself is never kept |
| Organic landing page | `argMinIf(properties.kx_landing_page, timestamp, properties.kx_medium = 'organic')` | the cleaned path of the first page of the organic tab, written once per tab by `initAttribution` |
| First-touch organic | `properties.kx_first_medium = 'organic'` | how the browser was first acquired (localStorage, write-once); for returning evaluators only |
| Excluded | any session with a `kx_traffic_type = 'diagnostic'` event; session `01a120d7-2b07-7ed0-af0c-f96d32e4c5bd` | rule 7 |
| Window | sessions that **start** in the window; all of their events are read | rule 7 |

**Dates are literal.** Write the window as fixed `toDateTime('YYYY-MM-DD HH:MM:SS')` values. Do not rely on the
dashboard's date placeholders inside arithmetic, and never leave the upper bound unset: an unset upper bound
drops the comparison instead of meaning "now" (found while correcting the funnel dashboard, 2026-10-10).

### 3.2 The shared organic session table

Every organic tile reads this CTE. Replace `{from}` and `{to}` with literal timestamps.

```sql
WITH s AS (
  SELECT
    `$session_id` AS sid,
    min(timestamp) AS started,
    any(distinct_id) AS device,
    countIf(event IN ('$pageview', 'cta_clicked', 'docs_viewed', 'installation_viewed', 'cli_command_copied',
      'install_command_copied', 'component_viewed', 'component_code_copied', 'platform_selected',
      'component_code_viewed', 'github_clicked', 'npm_clicked', 'changelog_viewed', 'external_link_clicked',
      'preset_shared', 'preset_code_copied', 'preset_loaded', 'preset_randomized', 'create_export_target_selected',
      'create_export_copied', 'iot_example_copied', 'block_code_copied')) > 0 AS arrived,  -- ARRIVAL_EVENTS
    countIf(properties.kx_traffic_type = 'diagnostic') > 0 AS diagnostic,
    countIf(properties.kx_medium = 'organic') > 0 AS organic,
    argMinIf(properties.kx_source, timestamp, properties.kx_medium = 'organic') AS engine,
    argMinIf(properties.kx_landing_page, timestamp, properties.kx_medium = 'organic') AS landing,
    countIf(event IN ('component_viewed', 'component_code_copied', 'block_code_copied', 'platform_selected',
      'installation_viewed')
      OR (event = 'cta_clicked' AND properties.target IN ('platform_coverage', 'platform_availability',
        'view_verification'))) > 0 AS qe,                                                -- analytics.md §3
    countIf(event IN ('installation_viewed', 'install_command_copied', 'cli_command_copied')
      OR (event = 'cta_clicked' AND properties.target IN ('adopt_tokens', 'adopt_components',
        'adopt_blocks'))) > 0 AS intent,                                                 -- analytics.md §4
    countIf(event = 'component_viewed') AS component_views,
    countIf(event = 'component_code_viewed') AS code_views,
    countIf(event IN ('component_code_copied', 'block_code_copied')) AS code_copies,
    countIf(event = 'installation_viewed') AS install_views,
    countIf(event IN ('install_command_copied', 'cli_command_copied')) AS install_copies,
    countIf(event = 'platform_selected') AS platform_selections,
    -- for the guide clickthrough rows: when the organic landing happened, and when the product pages were seen
    minIf(timestamp, properties.kx_medium = 'organic') AS organic_at,
    groupArrayIf(timestamp, event = '$pageview'
      AND match(properties.$pathname, '^/(docs(/|$)|components$|blocks$)')) AS product_page_ts,
    groupArrayIf(timestamp, event = '$pageview' AND properties.$pathname = '/components') AS components_page_ts,
    groupArrayIf(timestamp, event = 'component_viewed') AS component_view_ts
  FROM events
  WHERE timestamp >= {from} - INTERVAL 1 DAY AND timestamp < {to} + INTERVAL 1 DAY
    AND `$session_id` IS NOT NULL AND `$session_id` != ''
  GROUP BY sid
  HAVING started >= {from} AND started < {to}
),
organic AS (
  SELECT *,
    -- only what happened AFTER the organic landing counts as a clickthrough
    arrayExists(t -> t > organic_at, product_page_ts) AS product_page_after,
    arrayExists(t -> t > organic_at, components_page_ts) AS components_after,
    arrayExists(t -> t > organic_at, component_view_ts) AS component_view_after
  FROM s
  WHERE arrived AND NOT diagnostic AND organic AND sid != '01a120d7-2b07-7ed0-af0c-f96d32e4c5bd'
)
```

**Checked, read-only, 2026-10-12:** this CTE compiles and runs in the project's PostHog SQL on the fixed window
2026-09-14 to 2026-10-12 00:00 UTC (95 eligible arriving sessions, 1 of them organic); re-run the same day with
the after-the-landing clickthrough columns, same result for the organic count. That is a syntax check, not
a baseline; the baseline is captured on publication day (§6). Several arrival events had not fired yet in that
window, which is expected: the list is an allowlist.

The ±1 day on the event scan lets a session that starts inside the window keep its events after `{to}`, so a
diagnostic mark just outside the window still removes it (rule 7). The clickthrough columns
(`product_page_after`, `components_after`, `component_view_after`) count only events **after** the first organic
event (`organic_at`, the search landing), so a docs page seen in another tab before the visitor arrived from search
is not reported as a guide clickthrough.

### 3.3 The queries

| Measure | Query on `organic` | Report as |
| --- | --- | --- |
| **Organic landing sessions** | `SELECT count() FROM organic` | count |
| **Organic QE sessions** and **Organic QER** | `SELECT countIf(qe), count() FROM organic` | two counts; the rate only once `analytics.md` §10 allows |
| Organic Adoption Intent sessions | `SELECT countIf(intent) FROM organic` | count |
| By engine | `SELECT engine, count(), countIf(qe) FROM organic GROUP BY engine` | counts |
| **Top organic landing pages** | `SELECT landing, count() AS sessions, countIf(qe) AS qe FROM organic GROUP BY landing ORDER BY sessions DESC LIMIT 25` | counts per page |
| **Organic component views** | `SELECT sum(component_views), countIf(component_views > 0) FROM organic` | events and sessions |
| **Organic code views / copies** | `SELECT sum(code_views), sum(code_copies), countIf(code_copies > 0) FROM organic` | events and sessions |
| **Organic installation views / copies** | `SELECT sum(install_views), sum(install_copies), countIf(install_views + install_copies > 0) FROM organic` | events and sessions |
| **Organic platform selections** | `SELECT sum(platform_selections), countIf(platform_selections > 0) FROM organic` | events and sessions; the platform breakdown is the §11 tile 11 event query with an anti-join on non-organic sessions |
| By landing-path cluster | `multiIf` on `landing` with the cluster table in §4, then the QE and count columns | counts per cluster |
| **Guide → product-doc clickthrough** | `SELECT countIf(product_page_after), count() FROM organic WHERE startsWith(landing, '/guides/')` | two counts |
| **Guide → component view** | `SELECT countIf(component_view_after), count() FROM organic WHERE startsWith(landing, '/guides/')` | two counts |
| Guide → `/components` clickthrough | `SELECT countIf(components_after), count() FROM organic WHERE startsWith(landing, '/guides/')` | two counts |
| **Returning organic evaluators** | `SELECT count() FROM (SELECT device FROM organic WHERE qe GROUP BY device HAVING count() >= 2)` | count; directional (cleared storage and second devices undercount) |
| First-touch organic evaluators (optional) | the same over all eligible sessions, filtered on `kx_first_medium = 'organic'` | count; answers "did search acquire people who came back another way" |

Event counts (component views, copies, selections) are reported **with** the session count next to them, because
one enthusiastic session can produce dozens of events.

### 3.4 Known attribution limitations

- **Only three engines are recognised.** Google (any country domain), Bing and DuckDuckGo are organic. Ecosia,
  Yahoo, Brave Search, Startpage, Yandex, Baidu and AI assistants are not in the closed taxonomy: they arrive as
  `kx_source = other`, `kx_medium = other`, or as `direct` when the browser strips the referrer. Organic is
  therefore a **floor**. Widening the taxonomy is an `analytics-attribution.ts` change with its own review, not a
  query change.
- **No query text.** Google and Bing do not send the search query; the site would not keep it if they did.
  Queries live only in Search Console and Bing Webmaster Tools, and the two systems meet at the landing page.
- **Brand vs non-brand is a Search Console split only** (§7). PostHog cannot tell a branded organic session from
  a non-branded one; "non-brand organic sessions" is estimated by landing page (a session landing on a guide or a
  component page is very likely non-brand; one landing on `/` is likely brand) and labelled as an estimate.
- **Referrer policy.** Browsers send only the origin of a search referrer; that is all the classification needs.
  Privacy browsers and extensions that strip it entirely turn organic into `direct`.
- **Per-tab attribution.** A visitor who arrives from search and opens a second tab is still one organic session
  (any-event rule), but the second tab's events carry that tab's own `kx_landing_page`. `argMinIf` on the organic
  events picks the search landing.
- **Do Not Track and blocked analytics** send nothing, so every count is a floor.
- **Search Console and PostHog will not agree.** Clicks are counted by the search engine; sessions by the site,
  after consent, DNT and blockers. Compare trends, never the two numbers.

---

## 4. Dashboard: "KinetixUI — organic search"

A specification, not built. Every tile names its source. PostHog tiles are HogQL on the §3.2 CTE (session
tiles); Search Console figures are entered from the weekly export (§7) into the review, not into PostHog, until a
connector exists. All windows are 28 days with the previous 28 days beside them, except where stated.

### Visibility *(Search Console; Bing in a second column)*

| Tile | Definition |
| --- | --- |
| Impressions | Performance → Search results, Web, 28 days |
| Clicks | same |
| CTR | clicks ÷ impressions, same window, shown with both counts |
| Average position | shown only next to impressions; a position on a handful of impressions means nothing |
| Indexed pages | Indexing → Pages: indexed vs not indexed, with the top "why not indexed" reasons |
| Submitted vs indexed | sitemap URLs (from `pnpm check:seo`) vs indexed |
| Pages with impressions | distinct pages with ≥1 impression |

### Entry quality *(PostHog, §3.3)*

| Tile | Definition |
| --- | --- |
| Organic landing sessions | count, by engine |
| Top organic landing pages | landing, sessions, QE sessions; top 25 |
| Non-brand organic sessions (estimate) | organic sessions whose landing is not `/`, `/docs` or `/docs/changelog`; labelled "estimate, by landing page" |
| Search-side non-brand clicks | Search Console clicks on queries not matching `kinetix` (§7) |

### Evaluation *(PostHog, §3.3)*

| Tile | Definition |
| --- | --- |
| **Organic QER** | organic QE sessions and organic eligible sessions, two counts; the rate only once `analytics.md` §10 allows |
| Organic component views | events, and sessions with one |
| Organic code views and copies | events, and sessions with a copy |
| Organic install views and copies | events, and sessions with either |
| Organic platform selections | events, sessions, and the platform breakdown |
| Organic Adoption Intent sessions | count |

### Content cluster *(PostHog; Search Console per page)*

| Tile | Definition |
| --- | --- |
| Pillar sessions | organic sessions landing on `/guides/cross-platform-design-systems` |
| Supporting-guide sessions | organic sessions landing on the other three guides, per guide |
| Guide → docs clickthrough | guide-landing organic sessions with a later `/docs…`, `/components` or `/blocks` page view ÷ guide-landing organic sessions |
| Guide → components clickthrough | the same with a later `/components` page view or `component_viewed` |
| QE by cluster | organic sessions and QE sessions per landing-path cluster (table below) |
| Guide impressions and CTR | Search Console, Pages filter `/guides/` |

| Cluster | Path rule |
| --- | --- |
| Components | `/components`, `/docs/components/*` |
| Platforms | `/docs/platforms`, `/docs/angular`, `/docs/swiftui`, `/docs/compose`, `/docs/flutter` |
| Tokens / Foundations | `/docs/tokens`, `/docs/foundations`, `/docs/theming`, `/docs/colors`, `/docs/dark-mode` |
| Accessibility / RTL | `/docs/accessibility`, `/docs/rtl` |
| Installation | `/docs/installation`, `/docs/cli` |
| IoT | `/iot`, `/docs/iot`, `/demos/*` |
| Guides | `/guides/*`, published 2026-10-12 (all four; before that they were noindex drafts) |
| Editorial component pages | the 20 pages with editorial copy (`component-editorial.ts`), compared with the other component pages |
| Other | everything else, including `/` |

Articles (dev.to) are off-site and measured through campaign attribution, not as organic.

### Retention *(PostHog)*

| Tile | Definition |
| --- | --- |
| Returning organic evaluators | devices with an organic QE session in ≥2 eligible, non-diagnostic sessions, 90 days; directional |
| First-touch organic evaluators | devices first acquired by search (`kx_first_medium = 'organic'`) with a QE session in the window, by any medium |

**Reading the dashboard.** Absolute counts before rates; no rate until `analytics.md` §10's baseline policy
allows one; fewer than ~30 organic QE sessions in a comparison means keep and change nothing. A rise in organic
sessions with flat Organic QE sessions is not a win.

---

## 5. Review cadence

The standing rhythm lives in [`../weekly-review.md`](../weekly-review.md) (indexed pages, non-brand clicks,
organic eligible sessions, organic QE sessions) and [`../monthly-review.md`](../monthly-review.md) (the cluster
table, the intent map's unowned families). Publication adds a one-off Day 0 / 7 / 14 / 30 sequence for the
guides cluster, counted from go-live on **2026-10-12** (PR #366): Day 7 = 2026-10-19, Day 14 = 2026-10-26,
Day 30 = 2026-11-11.

| Day | Look at | Decide |
| --- | --- | --- |
| **0** (2026-10-12) | indexation eligibility (no noindex, self canonical, sitemap lists all four, JSON-LD parses) per [`GUIDE-PUBLISH-RUNBOOK.md`](./GUIDE-PUBLISH-RUNBOOK.md) §5; URL Inspection requested for the four; the PostHog baseline (§6) | nothing; fix only a defect in the checks |
| **7** (2026-10-19) | indexed or not for each guide (URL Inspection); impressions and clicks per guide; the first queries; organic landing paths into the guides (§3.3); organic QE sessions | nothing, unless a guide is "Discovered/Crawled – currently not indexed" with a fixable cause |
| **14** (2026-10-26) | CTR per guide and per high-value route (§9); guide → docs and guide → components clickthrough; snippets with impressions but no clicks | a snippet edit only where a page has a real impression count and a CTR well below its neighbours; one change at a time, dated in the backlog |
| **30** (2026-11-11) | the cluster's contribution (guide sessions and their QE sessions vs all organic); Organic QE by cluster; which intent earns impressions; queries landing on the wrong page | refresh or leave each guide (§7 of the runbook); whether the next content candidate in [`CONTENT-BACKLOG.md`](./CONTENT-BACKLOG.md) is justified by the data |

**Small samples.** A guide with tens of impressions has no CTR worth reading. Before Day 30, record numbers and
change nothing that is not a defect.

---

## 6. Baseline capture, Day 0 (2026-10-12)

The guides went live on 2026-10-12, so the baseline is taken for that day (or the first day after it that the
tools are available, with that date written down). Recorded once, as text, in `marketing/measurement/` (a dated file), from the live site and the tools, never from
memory. Every value carries its **source** (the tool or command) and its **reporting window** (literal dates).
If a value cannot be read yet, write `pending` (data not complete yet) or `not available` (no access or tool not
set up) with the reason; never write an assumed value, and never fill a gap with zero. Search Console data lags by
a few days: a value read before the window is complete is marked `preliminary` and re-read before Day 7 uses it.

| Value | How |
| --- | --- |
| Indexable page count | `pnpm check:seo` on the deployed commit ("N indexable") |
| Sitemap URL count | the same line ("N sitemap URLs"); confirm against `https://kinetixui.com/sitemap.xml` |
| Guide URLs in the sitemap | the count and names read from the live `https://kinetixui.com/sitemap.xml` (4 expected) |
| Indexed pages | Search Console → Indexing → Pages, indexed count and date |
| Organic landing sessions, last 28 days | §3.3, with the literal window |
| Organic QE sessions and organic eligible sessions, last 28 days | §3.3; two counts, no rate |
| Top 10 organic landing pages, last 28 days | §3.3 |
| Guide impressions and clicks | per guide, as Search Console reports them for a fixed, dated window (e.g. 2026-10-12 to the capture date); source and window recorded. Zero only if the tool reports zero for that window; otherwise `pending` or `not available` with the reason |
| Search Console site totals, last 28 days | impressions, clicks, CTR, non-brand clicks, with the literal window |
| Deployed commit | the merge commit on `main` |

---

## 7. Google Search Console activation

Not set up (checked 2026-10-12: no verification token in the repository; no Search Console access from this
workspace). Each step names what the owner does; nothing is done for them.

1. **Property type: Domain property** for `kinetixui.com`. It covers `https`, `http`, the apex and every
   subdomain in one property, so `www` or a preview host cannot split the data.
2. **Verify by DNS.** Search Console gives a `google-site-verification=…` TXT record; add it at the DNS provider
   for `kinetixui.com` (the apex) and press Verify. No repository change and no token in the code. Keep the
   record: removing it unverifies the property. (If DNS is not available, a URL-prefix property for
   `https://kinetixui.com/` can verify with the meta tag in `app/layout.tsx` `metadata.verification.google`, using
   the real value only.)
3. **Submit the sitemap:** Indexing → Sitemaps → `https://kinetixui.com/sitemap.xml`. Expect "Success" and the
   discovered count to match `pnpm check:seo` (132 since the guides were published on 2026-10-12).
4. **Initial URL inspections** (URL Inspection → "Test live URL", then "Request indexing"): `/`,
   `/components`, `/docs/platforms`, `/docs/tokens`, `/docs/angular`, `/docs/installation`, and the four
   guides. Record for each: "URL is on Google" or the reason it is not, the Google-selected canonical,
   and whether it matches ours.
5. **Index coverage checks** (Indexing → Pages): read the "Why pages aren't indexed" table. Expected and fine:
   query-string variants canonicalised to the clean URL (`?platform=`, `?filter=`), `/r/*.json` registry files if
   discovered, drafts if anything links them (it should not). Not fine: any sitemap URL in "Crawled – currently
   not indexed" for more than a few weeks, "Duplicate, Google chose different canonical", or a 404/5xx.
6. **Query and page reporting:** Performance → Search results, 28 days, "Compare" with the previous 28. Use the
   Pages tab for landing pages and the Queries tab for terms.
7. **Branded vs non-branded:** a Query filter, "Custom (regex)", **does not match** `kinetix` (case-insensitive by
   default) for non-brand; **matches** for brand. Report both. If Search Console's own "Branded queries" filter is
   available on the property, record which one was used; the regex is the default here because it is stable.
8. **Platform and component intent** (optional, monthly): Query regex `react|angular|swiftui|compose|flutter`;
   component names joined offline from an export.
9. **Export cadence:** weekly, Performance → Export → Google Sheets or CSV, two exports (Queries and Pages, 28
   days), saved with the date in the file name next to the weekly review. Monthly, also the Pages (indexing) and
   Links reports. Search Console keeps 16 months of performance data, so the weekly export is for the review,
   not for retention.
10. **Users and permissions:** the owner is the verified owner; add others as "Full" or "Restricted" users, never
    as owners.

## 8. Bing Webmaster Tools activation

Not set up (same check as §7).

1. **Add the site:** sign in to Bing Webmaster Tools and choose **Import from Google Search Console** once §7 is
   verified. This imports the verified site and its sitemaps with no further verification. Otherwise, add
   `https://kinetixui.com` and verify by the DNS CNAME Bing offers, or the `msvalidate.01` meta tag
   (`metadata.verification.other` in `app/layout.tsx`, real value only).
2. **Sitemap:** Sitemaps → Submit `https://kinetixui.com/sitemap.xml` (already present if imported). Check that
   the "URLs discovered" count matches `pnpm check:seo`.
3. **URL Inspection:** the same starter list as §7.4; for a URL that is not indexed, "Request indexing", or URL
   Submission for the four guides on publication day.
4. **Search Performance:** clicks, impressions, CTR and average position by page and by keyword, 28 days with the
   previous period; the same brand / non-brand split by keyword (`kinetix`).
5. **Indexing diagnostics:** Site Explorer (crawled, indexed, errors per URL), and Recommendations (SEO issues it
   finds). Treat its recommendations as hypotheses to check against `check:seo`, not as tasks.
6. **IndexNow** (optional): Bing accepts IndexNow pings for changed URLs. Not set up, and not needed at this size;
   a sitemap resubmission after a large change is enough.
7. **Export cadence:** monthly, with the Search Console monthly export; Bing's volume is expected to be small.

## 9. High-value routes and their snippet ownership

The routes the snippet audit covers (SEO Phase 3; results in [`SEARCH-INTENT-MAP.md`](./SEARCH-INTENT-MAP.md#final-ownership-seo-phase-3)):
`/`, `/components`, `/docs/platforms`, `/docs/tokens`, `/docs/accessibility`, `/docs/installation`,
`/docs/angular`, the 20 editorial component pages and the four guides. CTR is read for these first at Day 14.
