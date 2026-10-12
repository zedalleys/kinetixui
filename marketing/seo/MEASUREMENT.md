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

### HogQL sketch — Organic QER (to build as a tile)

```sql
-- eligible arriving sessions (analytics.md §4 allowlist), excluding diagnostic traffic, last 28 days
WITH sessions AS (
  SELECT
    $session_id AS sid,
    max(properties.kx_medium = 'organic') AS organic,
    max(event IN ('component_viewed', 'component_code_copied', 'block_code_copied', 'platform_selected',
                  'installation_viewed')
        OR (event = 'cta_clicked' AND properties.target IN
            ('platform_coverage', 'platform_availability', 'view_verification'))) AS qe,
    max(properties.kx_traffic_type = 'diagnostic') AS diagnostic,
    max(event IN (/* ARRIVAL_EVENTS from analytics-measurement.ts */ '$pageview', 'docs_viewed', 'component_viewed'))
      AS arrived
  FROM events
  WHERE timestamp >= now() - INTERVAL 28 DAY
  GROUP BY sid
)
SELECT countIf(organic AND qe) AS organic_qe_sessions,
       countIf(organic) AS organic_eligible_sessions
FROM sessions
WHERE arrived AND NOT diagnostic
```

The sketch abbreviates the arrival allowlist; the tile must use the full `ARRIVAL_EVENTS` list and the QE signal
list exactly as `analytics.md` §3 and §4 state them, the same way tiles 5 and 8b do. Report the two counts, and the
rate only once the baseline policy allows it.

---

## 3. Dashboard: "KinetixUI — organic search"

A recommendation, not built in this workstream. Four groups, each tile labelled with its source.

**Visibility** *(Search Console)* — impressions, clicks, CTR, average position (all 28-day, with the previous
period), indexed pages vs submitted, pages with impressions.

**Entry quality** *(PostHog)* — organic eligible arriving sessions; top organic landing pages with each page's QE
session count; an engagement proxy only if one already exists on the main dashboard (none is added for SEO).

**Evaluation** *(PostHog)* — **Organic Qualified Evaluation Rate** (counts until baseline), organic component views,
organic code copies, organic install views and copies, organic platform selections, organic returning evaluators.

**Content clusters** *(both)* — the same metrics grouped by landing-path cluster:

| Cluster | Path rule |
| --- | --- |
| Components | `/components`, `/docs/components/*` |
| Platforms | `/docs/platforms`, `/docs/angular`, `/docs/swiftui`, `/docs/compose`, `/docs/flutter` |
| Tokens / Foundations | `/docs/tokens`, `/docs/foundations`, `/docs/theming`, `/docs/colors`, `/docs/dark-mode` |
| Accessibility / RTL | `/docs/accessibility`, `/docs/rtl` |
| IoT | `/iot`, `/docs/iot`, `/demos/*` |
| Articles | off-site today (dev.to); measured through campaign attribution, not organic |

Search Console integration through its API is **not** built: no authenticated connector exists, and a weekly
manual export into the review is enough at current traffic.

---

## 4. Review rhythm

Weekly, inside the existing [`../weekly-review.md`](../weekly-review.md): indexed pages, non-brand clicks, organic
eligible sessions, organic QE sessions. Monthly, inside [`../monthly-review.md`](../monthly-review.md): the cluster
table and the intent map's unowned families. Decision rules are `analytics.md` §10's — fewer than ~30 organic QE
sessions in a comparison means **keep, change nothing**.

---

## 5. Search Console and Bing verification

Neither is set up in the repository, and no verification token was provided, so none was added.

**Recommended: verify by DNS, not by file or meta tag.** A Search Console *Domain property* (`kinetixui.com`)
covers https, http, apex and www in one property, and verifies with a TXT record at the DNS provider — no code
change, no token in the repository. Bing Webmaster Tools can import the verified site from Search Console.

If a meta-tag verification is ever preferred, Next.js supports it in the root layout's metadata — the owner adds
the real values; never invent one:

```ts
// apps/web/src/app/layout.tsx — only with values from the Search Console / Bing settings pages
verification: { google: "<token from Search Console>", other: { "msvalidate.01": "<token from Bing>" } },
```

After verification: submit `https://kinetixui.com/sitemap.xml` in both tools, and check the "Pages" report against
the 128 URLs in the sitemap (`pnpm check:seo` prints the count).
