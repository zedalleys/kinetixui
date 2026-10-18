/**
 * marketing-weekly-report.mjs — the weekly growth report, from one PostHog query and the two registers.
 *
 *   node scripts/marketing-weekly-report.mjs --from 2026-10-12 --to 2026-10-19 --print-query
 *       prints the one HogQL query to run (PostHog → SQL, or the MCP `execute-sql` tool); save its rows as JSON
 *   node scripts/marketing-weekly-report.mjs --from 2026-10-12 --to 2026-10-19 --sessions rows.json [--platform p.json]
 *       renders the report as Markdown on stdout
 *
 * Why one query and a script rather than dashboard tiles: every number in the report comes from the same per-session
 * rows, classified by one function (`classifySession`) that is unit-tested, so the cohorts cannot disagree with each
 * other and the next reviewer gets the same answer from the same rows. PostHog keeps every raw event; nothing here
 * deletes or rewrites history, it only labels sessions when counting.
 *
 * The definitions are marketing/analytics.md §3 (Qualified Evaluation), §4 (Adoption Intent, eligible arriving
 * session) and §11 (diagnostic traffic, traffic cohorts). The signal lists below must equal the executable ones in
 * apps/web/src/lib/analytics-measurement.ts; `apps/web/src/lib/weekly-report-signals.test.ts` fails if they drift.
 *
 * What it never does: estimate. Reach, impressions and clicks exist only on the platforms; they are printed from
 * `--platform` when the owner copied them there, and as "unavailable" otherwise.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/* ------------------------------------------------------------------ definitions (mirror analytics-measurement.ts) */

export const ARRIVAL_EVENTS = [
  "$pageview", "cta_clicked", "docs_viewed", "installation_viewed", "cli_command_copied", "install_command_copied",
  "component_viewed", "component_code_copied", "platform_selected", "component_code_viewed", "github_clicked",
  "npm_clicked", "changelog_viewed", "external_link_clicked", "preset_shared", "preset_code_copied", "preset_loaded",
  "preset_randomized", "create_export_target_selected", "create_export_copied", "iot_example_copied",
  "block_code_copied", "search_result_selected", "page_engaged",
];
export const QE_EVENTS = ["component_viewed", "component_code_copied", "block_code_copied", "platform_selected", "installation_viewed"];
export const QE_CTA_TARGETS = ["platform_coverage", "platform_availability", "view_verification"];
export const AI_EVENTS = ["installation_viewed", "install_command_copied", "cli_command_copied"];
export const AI_CTA_TARGETS = ["adopt_tokens", "adopt_components", "adopt_blocks"];

/**
 * Events a page fires on render, with nobody acting: a session made only of these (and `$pageleave`) shows that a
 * page loaded, not that anyone did anything on it.
 */
export const RENDER_EVENTS = ["$pageview", "$pageleave", "docs_viewed", "component_viewed", "installation_viewed", "changelog_viewed"];

/** The suspected-automation rule's duration bound, in seconds (analytics.md §11 "Traffic cohorts"). */
export const RENDER_ONLY_MAX_SECONDS = 5;

/** Sessions the 2026-10-09 audit already excluded by id (analytics.md §11). */
export const EXCLUDED_SESSION_IDS = ["01a120d7-2b07-7ed0-af0c-f96d32e4c5bd"];

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const list = (xs) => xs.map((x) => `'${x}'`).join(", ");

/**
 * The one query. One row per PostHog session that STARTED in [from, to), UTC, aggregated over its complete event
 * history: events are read from a day either side of the window (a PostHog session never exceeds 24 hours) and the
 * window is applied to the session's first event, so a session crossing midnight on a boundary is counted once,
 * in the week it began, and classified on all of its events.
 */
export function sessionQuery(from, to) {
  if (!DAY.test(from) || !DAY.test(to) || from >= to) throw new Error("--from and --to must be YYYY-MM-DD with from < to");
  return `SELECT
  $session_id AS session_id,
  min(timestamp) AS started,
  dateDiff('second', min(timestamp), max(timestamp)) AS duration_s,
  countIf(event = '$pageview') AS pageviews,
  countIf(event IN (${list(ARRIVAL_EVENTS)})) AS arrival_events,
  countIf(event NOT IN (${list(RENDER_EVENTS)})) AS interaction_events,
  countIf(event = 'page_engaged') AS engaged_events,
  countIf(event IN (${list(QE_EVENTS)}) OR (event = 'cta_clicked' AND properties.target IN (${list(QE_CTA_TARGETS)}))) AS qe_signals,
  countIf(event IN (${list(AI_EVENTS)}) OR (event = 'cta_clicked' AND properties.target IN (${list(AI_CTA_TARGETS)}))) AS ai_signals,
  countIf(event IN ('install_command_copied', 'cli_command_copied') OR (event = 'cta_clicked' AND properties.target IN (${list(AI_CTA_TARGETS)}))) AS ai_copy_or_rung,
  countIf(properties.kx_traffic_type = 'diagnostic') AS diagnostic_events,
  countIf(properties.kx_traffic_type = 'internal') AS internal_events,
  argMin(properties.kx_source, timestamp) AS kx_source,
  argMin(properties.kx_medium, timestamp) AS kx_medium,
  argMin(properties.kx_campaign, timestamp) AS kx_campaign,
  argMin(properties.kx_content, timestamp) AS kx_content,
  argMin(properties.kx_referrer, timestamp) AS kx_referrer,
  argMinIf(properties.$pathname, timestamp, event = '$pageview') AS landing
FROM events
WHERE timestamp >= toDateTime('${from} 00:00:00') - INTERVAL 1 DAY AND timestamp < toDateTime('${to} 00:00:00') + INTERVAL 1 DAY
  AND $session_id IS NOT NULL AND $session_id NOT IN (${list(EXCLUDED_SESSION_IDS)})
GROUP BY session_id
HAVING started >= toDateTime('${from} 00:00:00') AND started < toDateTime('${to} 00:00:00')
ORDER BY started`;
}

/* ------------------------------------------------------------------ classification */

/**
 * The cohort a session is counted in. First match wins, so every session is in exactly one:
 *  - "not_arrival": no event that proves a page was open (analytics.md §4) — e.g. a lone `$pageleave`
 *  - "diagnostic": any event marked `kx_traffic_type: diagnostic` (a probe; §11)
 *  - "internal": any event marked `internal` (the team's own browser; §11)
 *  - "suspected_automation": render-only — one page view, no event a person causes, under 5 seconds, arriving
 *    direct. SUSPECTED, not proven: a person who opens a deep link and closes it at once looks the same.
 *  - "audience": everything else
 */
export function classifySession(row) {
  if (Number(row.arrival_events) === 0) return "not_arrival";
  if (Number(row.diagnostic_events) > 0) return "diagnostic";
  if (Number(row.internal_events) > 0) return "internal";
  if (
    Number(row.pageviews) <= 1 &&
    Number(row.interaction_events) === 0 &&
    Number(row.duration_s) < RENDER_ONLY_MAX_SECONDS &&
    (row.kx_referrer ?? "direct") === "direct"
  ) return "suspected_automation";
  return "audience";
}

/**
 * Whether a qualified session also shows a person acting: a `page_engaged` (once the M2 release is deployed), any event a person
 * causes, or a second page view. Used only for the "human-evidenced" figure, never to redefine Qualified Evaluation.
 */
export const humanEvidence = (row) => Number(row.engaged_events) > 0 || Number(row.interaction_events) > 0 || Number(row.pageviews) > 1;

const isQE = (r) => Number(r.qe_signals) > 0;
const isAI = (r) => Number(r.ai_signals) > 0;
const rate = (n, d) => (d === 0 ? "n/a (no sessions)" : `${((100 * n) / d).toFixed(1)}%`);

/** Every number the report prints, computed from the rows alone. */
export function summarise(rows) {
  const by = { not_arrival: [], diagnostic: [], internal: [], suspected_automation: [], audience: [] };
  for (const r of rows) by[classifySession(r)].push(r);
  const eligible = rows.filter((r) => !["not_arrival", "diagnostic"].includes(classifySession(r)));
  const audience = by.audience;
  return {
    raw: rows.length,
    cohorts: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, { sessions: v.length, qe: v.filter(isQE).length, ai: v.filter(isAI).length }])),
    canonical: { eligible: eligible.length, qe: eligible.filter(isQE).length, ai: eligible.filter(isAI).length },
    audience: {
      sessions: audience.length,
      qe: audience.filter(isQE).length,
      qeHuman: audience.filter((r) => isQE(r) && humanEvidence(r)).length,
      ai: audience.filter(isAI).length,
      engaged: audience.filter((r) => Number(r.engaged_events) > 0).length,
    },
    byCampaign: groupCount(eligible, (r) => (r.kx_campaign ? `${r.kx_campaign} / ${r.kx_content ?? "—"}` : null)),
    bySource: groupCount(eligible, (r) => `${r.kx_source ?? "unknown"} / ${r.kx_medium ?? "unknown"}`),
    byLanding: groupCount(audience, (r) => r.landing ?? "(no page view)"),
    unattributed: eligible.filter((r) => !r.kx_campaign && ["direct", "other", undefined, null].includes(r.kx_source)).length,
    campaignSessions: eligible.filter((r) => r.kx_campaign).length,
    campaignAudience: audience.filter((r) => r.kx_campaign).length,
    eligibleRows: eligible,
  };
}

function groupCount(rows, key) {
  const m = new Map();
  for (const r of rows) {
    const k = key(r);
    if (k === null) continue;
    const g = m.get(k) ?? { cohort: {}, sessions: 0, qe: 0, ai: 0 };
    g.sessions += 1;
    if (isQE(r)) g.qe += 1;
    if (isAI(r)) g.ai += 1;
    const c = classifySession(r);
    g.cohort[c] = (g.cohort[c] ?? 0) + 1;
    m.set(k, g);
  }
  return [...m.entries()].sort((a, b) => b[1].sessions - a[1].sessions);
}

/* ------------------------------------------------------------------ rendering */

const UNAVAILABLE = "unavailable";

/** Published rows in the window, from the distribution register; a row without a live URL is listed as such. */
export function publishedInWindow(distribution, from, to) {
  return (distribution.rows ?? [])
    .filter((r) => r.status === "published" && r.date && r.date >= from && r.date < to)
    .map((r) => ({ asset: r.asset, channel: r.channel, date: r.date, liveUrl: r.liveUrl ?? null }));
}

export function renderReport({ from, to, rows, distribution, platform = null, generatedAt = null }) {
  const s = summarise(rows);
  const published = publishedInWindow(distribution, from, to);
  const cohortLine = (k, label) => `| ${label} | ${s.cohorts[k].sessions} | ${s.cohorts[k].qe} | ${s.cohorts[k].ai} |`;
  const table = (entries) =>
    entries.length === 0
      ? "_none_"
      : ["| | Sessions | Qualified Evaluation | Adoption Intent | Of which suspected automation |", "| --- | --- | --- | --- | --- |"]
          .concat(entries.map(([k, g]) => `| ${k} | ${g.sessions} | ${g.qe} | ${g.ai} | ${g.cohort.suspected_automation ?? 0} |`))
          .join("\n");
  const plat = (asset, field) => {
    const v = platform?.[asset]?.[field];
    return v === undefined || v === null || v === "" ? UNAVAILABLE : `${v} (platform-reported${platform?.[asset]?.readOn ? `, read ${platform[asset].readOn}` : ""})`;
  };

  return `# Weekly growth report — ${from} to ${to} (UTC, end exclusive)

${generatedAt ? `Generated ${generatedAt} from ` : "From "}one PostHog query (\`node scripts/marketing-weekly-report.mjs --from ${from} --to ${to} --print-query\`)
and the distribution register. **Observed counts only.** Before the baseline in analytics.md §10 closes, read
absolute counts, never a percentage change.

## Published this week (live URLs from distribution/register.json)

${published.length === 0 ? "_Nothing was published in this window._" : published.map((p) => `- ${p.asset} on ${p.channel}, ${p.date}: ${p.liveUrl ?? "**no live URL recorded**"}`).join("\n")}

## Sessions by traffic cohort

Every session is in exactly one cohort (analytics.md §11 "Traffic cohorts").

| Cohort | Sessions | Qualified Evaluation | Adoption Intent |
| --- | --- | --- | --- |
${cohortLine("audience", "Audience")}
${cohortLine("suspected_automation", "Suspected automation (render-only, direct, < 5 s)")}
${cohortLine("internal", "Internal (marked browser)")}
${cohortLine("diagnostic", "Diagnostic (marked probe)")}
${cohortLine("not_arrival", "Not an arrival (no page event)")}
| **Raw sessions** | **${s.raw}** | | |

## Qualified Evaluation Rate

| Measure | Definition | Sessions | Qualified | Rate |
| --- | --- | --- | --- | --- |
| **QER, canonical** | analytics.md §2–§4: eligible arriving sessions, diagnostic excluded | ${s.canonical.eligible} | ${s.canonical.qe} | ${rate(s.canonical.qe, s.canonical.eligible)} |
| QER, audience only *(sensitivity, not the metric)* | canonical minus internal and suspected automation | ${s.audience.sessions} | ${s.audience.qe} | ${rate(s.audience.qe, s.audience.sessions)} |
| Human-evidenced evaluations *(sensitivity)* | audience QE sessions that also show an input, a click event or a second page | ${s.audience.sessions} | ${s.audience.qeHuman} | ${rate(s.audience.qeHuman, s.audience.sessions)} |

The canonical figure is the metric. The other two are shown beside it so automated or internal sessions are never
silently inside it; changing the definition is the owner's decision (analytics.md §3).

## Adoption Intent

- Sessions with an Adoption Intent signal, canonical: **${s.canonical.ai}** of ${s.canonical.eligible} eligible; audience only: **${s.audience.ai}**.
- Not an install count, and not activation (analytics.md §5).

## Campaigns and channels (eligible sessions)

Campaign-attributed sessions: **${s.campaignSessions}** (audience cohort: ${s.campaignAudience}).
Unattributed (direct or unrecognised source, no campaign): **${s.unattributed}**.

### By campaign / content
${table(s.byCampaign)}

### By source / medium
${table(s.bySource)}

## Conversion by landing page (audience cohort)
${table(s.byLanding)}

## Platform-reported engagement

Reach, impressions and clicks exist only in each platform's own analytics. They are never estimated here.

${published.length === 0 ? "_No asset published in this window._" : ["| Asset | Impressions | Clicks | Reactions |", "| --- | --- | --- | --- |"].concat(published.map((p) => `| ${p.asset} | ${plat(p.asset, "impressions")} | ${plat(p.asset, "clicks")} | ${plat(p.asset, "reactions")} |`)).join("\n")}

## Limitations

- Suspected automation is a rule, not proof: it also catches a person who opens a deep link and leaves within five
  seconds. It is reported beside the canonical rate, never subtracted from it.
- \`page_engaged\` counts only once the M2 release that adds it is deployed; before that, "human-evidenced" relies on click events and second pages only.
- Internal marking works only on browsers someone marked with \`?kx_traffic=internal\`; unmarked team visits are audience.
- Do Not Track visitors, blocked scripts and dropped page-exit beacons send nothing, so every count is a floor.
- Campaign arrivals depend on the tagged link surviving the platform (LinkedIn and X can strip or wrap links);
  a post with zero tagged sessions is "no tagged arrival observed", not "no clicks".
`;
}

/* ------------------------------------------------------------------ CLI */

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null);
  const from = arg("--from");
  const to = arg("--to");
  if (process.argv.includes("--print-query")) {
    console.log(sessionQuery(from, to));
  } else {
    const file = arg("--sessions");
    if (!file) {
      console.error("usage: --from YYYY-MM-DD --to YYYY-MM-DD (--print-query | --sessions rows.json [--platform p.json])");
      process.exit(2);
    }
    sessionQuery(from, to); // validates the window
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    const rows = Array.isArray(parsed) ? parsed : parsed.rows; // the bare rows, or { rows, ...provenance }
    const distribution = JSON.parse(readFileSync("marketing/distribution/register.json", "utf8"));
    const platform = arg("--platform") ? JSON.parse(readFileSync(arg("--platform"), "utf8")) : null;
    process.stdout.write(renderReport({ from, to, rows, distribution, platform, generatedAt: new Date().toISOString().slice(0, 10) }));
  }
}
