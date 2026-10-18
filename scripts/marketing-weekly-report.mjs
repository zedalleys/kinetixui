/**
 * marketing-weekly-report.mjs — the weekly growth report, from one PostHog query and the two registers.
 *
 *   node scripts/marketing-weekly-report.mjs --from 2026-10-12 --to 2026-10-19 --print-query
 *       prints the one HogQL query to run (PostHog → SQL, or the MCP `execute-sql` tool); save its rows as JSON
 *   node scripts/marketing-weekly-report.mjs --from 2026-10-12 --to 2026-10-19 --sessions rows.json [--platform p.json]
 *   node scripts/marketing-weekly-report.mjs --from … --to … --print-query --compact
 *       the same query returning one text cell (for clients that cap rows); save it as .txt and pass it to --sessions
 *       renders the report as Markdown on stdout; --history weeks.json ([{ from, to, rows }]) adds earlier weeks to the trend
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

/** Events that name the platform a visitor chose or copied for (apps/web/ANALYTICS.md). */
export const PLATFORM_EVENTS = ["platform_selected", "component_code_viewed", "install_command_copied"];

/** analytics.md §10: fewer than ~30 qualified evaluations in a comparison is noise. */
export const MIN_QE_FOR_COMPARISON = 30;

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
  const qe = `(event IN (${list(QE_EVENTS)}) OR (event = 'cta_clicked' AND properties.target IN (${list(QE_CTA_TARGETS)})))`;
  const ai = `(event IN (${list(AI_EVENTS)}) OR (event = 'cta_clicked' AND properties.target IN (${list(AI_CTA_TARGETS)})))`;
  // Evaluation → Intent Progression (analytics.md §4): some intent signal at or after the first qualifying evaluation.
  return `SELECT
  $session_id AS session_id,
  min(timestamp) AS started,
  dateDiff('second', min(timestamp), max(timestamp)) AS duration_s,
  countIf(event = '$pageview') AS pageviews,
  countIf(event IN (${list(ARRIVAL_EVENTS)})) AS arrival_events,
  countIf(event NOT IN (${list(RENDER_EVENTS)})) AS interaction_events,
  countIf(event = 'page_engaged') AS engaged_events,
  countIf(${qe}) AS qe_signals,
  countIf(${ai}) AS ai_signals,
  if(countIf(${qe}) > 0 AND countIf(${ai}) > 0 AND maxIf(timestamp, ${ai}) >= minIf(timestamp, ${qe}), 1, 0) AS progressed,
  countIf(event IN ('install_command_copied', 'cli_command_copied') OR (event = 'cta_clicked' AND properties.target IN (${list(AI_CTA_TARGETS)}))) AS ai_copy_or_rung,
  countIf(event = 'installation_viewed') AS install_views,
  countIf(event IN ('install_command_copied', 'cli_command_copied')) AS install_copies,
  arrayStringConcat(arraySort(groupUniqArrayIf(toString(properties.platform), event IN (${list(PLATFORM_EVENTS)}) AND properties.platform IS NOT NULL)), ',') AS platforms,
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

/** The columns `--compact` exports, in order. Everything `summarise` reads; the session id is left out. */
export const COMPACT_COLUMNS = [
  "started", "duration_s", "pageviews", "arrival_events", "interaction_events", "engaged_events", "qe_signals", "ai_signals",
  "progressed", "ai_copy_or_rung", "install_views", "install_copies", "platforms", "diagnostic_events", "internal_events",
  "kx_source", "kx_medium", "kx_campaign", "kx_content", "kx_referrer", "landing",
];
const NUMERIC = new Set(COMPACT_COLUMNS.filter((c) => !["started", "platforms", "kx_source", "kx_medium", "kx_campaign", "kx_content", "kx_referrer", "landing"].includes(c)));

/**
 * The same query wrapped to return one cell: a header line, then one `|`-separated line per session. Some SQL
 * clients (the PostHog MCP tool among them) cap a result at 100 rows; one cell is not capped, and is a fraction of
 * the size. Same sessions, same columns, so `--sessions` reads either form.
 */
export function compactQuery(from, to) {
  const cell = (c) => (c === "started" ? "formatDateTime(started, '%Y-%m-%dT%H:%i:%SZ')" : NUMERIC.has(c) ? `toString(${c})` : `ifNull(toString(${c}), '')`);
  return `SELECT concat('${COMPACT_COLUMNS.join("|")}', '\\n', arrayStringConcat(groupArray(concat(${COMPACT_COLUMNS.map(cell).join(", '|', ")})), '\\n')) AS rows
FROM (
${sessionQuery(from, to)}
)`;
}

/** Parses `compactQuery`'s cell back into rows; an empty text field is null, as in the JSON export. */
export function parseCompact(text) {
  const [head, ...lines] = text.trim().split(/\r?\n/);
  const cols = head.split("|");
  if (cols.join("|") !== COMPACT_COLUMNS.join("|")) throw new Error("compact header does not match COMPACT_COLUMNS");
  return lines.filter(Boolean).map((line) => {
    const v = line.split("|");
    if (v.length !== cols.length) throw new Error(`compact line has ${v.length} fields, expected ${cols.length}: ${line}`);
    return Object.fromEntries(cols.map((c, i) => [c, NUMERIC.has(c) ? Number(v[i]) : v[i] === "" ? (c === "platforms" ? "" : null) : v[i]]));
  });
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
const isProgressed = (r) => Number(r.progressed) > 0;
const platformsOf = (r) => (r.platforms ? String(r.platforms).split(",").filter(Boolean) : []);
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
    canonical: { eligible: eligible.length, qe: eligible.filter(isQE).length, ai: eligible.filter(isAI).length, progressed: eligible.filter(isProgressed).length },
    progressionKnown: rows.every((r) => r.progressed !== undefined && r.progressed !== null),
    audience: {
      sessions: audience.length,
      qe: audience.filter(isQE).length,
      qeHuman: audience.filter((r) => isQE(r) && humanEvidence(r)).length,
      ai: audience.filter(isAI).length,
      progressed: audience.filter(isProgressed).length,
      engaged: audience.filter((r) => Number(r.engaged_events) > 0).length,
    },
    byCampaign: groupCount(eligible, (r) => (r.kx_campaign ? `${r.kx_campaign} / ${r.kx_content ?? "—"}` : null)),
    byArm: armCount(audience),
    bySource: groupCount(eligible, (r) => `${r.kx_source ?? "unknown"} / ${r.kx_medium ?? "unknown"}`),
    byLanding: groupCount(audience, (r) => r.landing ?? "(no page view)"),
    byPlatform: groupCount(eligible.flatMap((r) => platformsOf(r).map((p) => ({ ...r, _platform: p }))), (r) => r._platform),
    install: {
      known: rows.every((r) => r.install_views !== undefined && r.install_views !== null),
      viewed: { canonical: eligible.filter((r) => Number(r.install_views) > 0).length, audience: audience.filter((r) => Number(r.install_views) > 0).length },
      copied: { canonical: eligible.filter((r) => Number(r.install_copies) > 0).length, audience: audience.filter((r) => Number(r.install_copies) > 0).length },
    },
    platformKnown: rows.every((r) => r.platforms !== undefined),
    unattributed: eligible.filter((r) => !r.kx_campaign && ["direct", "other", undefined, null].includes(r.kx_source)).length,
    partiallyTagged: eligible.filter((r) => r.kx_campaign && (!r.kx_content || !r.kx_source || r.kx_source === "direct")).length,
    campaignSessions: eligible.filter((r) => r.kx_campaign).length,
    campaignAudience: audience.filter((r) => r.kx_campaign).length,
    eligibleRows: eligible,
  };
}

/**
 * Per campaign / content, audience cohort only: the table experiment arms are read from (distribution/M3-EXPERIMENTS.md).
 * "Acted" is a person doing something after the page rendered (an event that is not render-fired, or a second page),
 * so it is comparable across destinations that fire different events on load. "Copied" is an install or CLI copy
 * or an adopt CTA, never the render-fired `installation_viewed`.
 */
function armCount(audienceRows) {
  const m = new Map();
  for (const r of audienceRows) {
    if (!r.kx_campaign) continue;
    const k = `${r.kx_campaign} / ${r.kx_content ?? "—"}`;
    const g = m.get(k) ?? { sessions: 0, qe: 0, acted: 0, copied: 0 };
    g.sessions += 1;
    if (isQE(r)) g.qe += 1;
    if (Number(r.interaction_events) > 0 || Number(r.pageviews) > 1) g.acted += 1;
    if (Number(r.ai_copy_or_rung) > 0) g.copied += 1;
    m.set(k, g);
  }
  return [...m.entries()].sort((a, b) => b[1].sessions - a[1].sessions);
}

function groupCount(rows, key) {
  const m = new Map();
  for (const r of rows) {
    const k = key(r);
    if (k === null) continue;
    const g = m.get(k) ?? { cohort: {}, sessions: 0, qe: 0, ai: 0, engaged: 0 };
    g.sessions += 1;
    if (Number(r.engaged_events) > 0) g.engaged += 1;
    if (isQE(r)) g.qe += 1;
    if (isAI(r)) g.ai += 1;
    const c = classifySession(r);
    g.cohort[c] = (g.cohort[c] ?? 0) + 1;
    m.set(k, g);
  }
  return [...m.entries()].sort((a, b) => b[1].sessions - a[1].sessions);
}

/**
 * Data-quality warnings, computed from the same rows and registers. Each one says what is wrong with reading the
 * week's numbers at face value; none of them changes a number.
 */
export function dataQualityWarnings(s, published) {
  const w = [];
  const suspected = s.cohorts.suspected_automation.sessions;
  if (s.canonical.eligible > 0 && suspected * 2 >= s.canonical.eligible)
    w.push(`${suspected} of ${s.canonical.eligible} eligible sessions (${rate(suspected, s.canonical.eligible)}) are suspected automation; session and landing counts are mostly page loads.`);
  if (s.cohorts.suspected_automation.qe > 0 && s.cohorts.suspected_automation.qe * 2 >= s.canonical.qe)
    w.push(`${s.cohorts.suspected_automation.qe} of the ${s.canonical.qe} canonical Qualified Evaluation sessions are suspected automation, so the canonical QER mostly measures pages loading, not people evaluating. Read the audience rows.`);
  if (s.audience.qe < MIN_QE_FOR_COMPARISON)
    w.push(`Audience Qualified Evaluation sessions: ${s.audience.qe}, below the ~${MIN_QE_FOR_COMPARISON} analytics.md §10 needs for any comparison. Every split below is an observation, not a result.`);
  if (s.raw > 0 && s.audience.engaged === 0 && s.audience.sessions > 0)
    w.push("No audience session sent `page_engaged`. Either the M2 release is not deployed yet or nobody touched a page; human-evidenced figures rely on click events and second pages.");
  if (s.campaignSessions > 0 && s.campaignAudience === 0)
    w.push(`All ${s.campaignSessions} campaign-tagged sessions are outside the audience cohort; no tagged human arrival is evidenced.`);
  if (s.partiallyTagged > 0) w.push(`${s.partiallyTagged} campaign session(s) arrived without a source or content tag; check the link that was posted.`);
  if (!s.progressionKnown) w.push("Rows predate the `progressed` column; Progression is unavailable for this week.");
  if (!s.install.known || !s.platformKnown) w.push("Rows predate the M3 installation and platform columns; those sections are unavailable for this week.");
  for (const p of published.filter((x) => !x.liveUrl)) w.push(`${p.asset} is marked published without a live URL.`);
  return w;
}

/** One line per week, absolute counts only (analytics.md §10: no percentage change before the baseline closes). */
export function trendRows(weeks) {
  return weeks.map(({ from, to, rows }) => {
    const s = summarise(rows);
    return { from, to, raw: s.raw, eligible: s.canonical.eligible, qe: s.canonical.qe, audience: s.audience.sessions, audienceQe: s.audience.qe, ai: s.canonical.ai, audienceAi: s.audience.ai, campaign: s.campaignSessions, campaignAudience: s.campaignAudience };
  });
}

/* ------------------------------------------------------------------ rendering */

const UNAVAILABLE = "unavailable";

/** Published rows in the window, from the distribution register; a row without a live URL is listed as such. */
export function publishedInWindow(distribution, from, to) {
  return (distribution.rows ?? [])
    .filter((r) => r.status === "published" && r.date && r.date >= from && r.date < to)
    .map((r) => ({ asset: r.asset, channel: r.channel, date: r.date, liveUrl: r.liveUrl ?? null }));
}

export function renderReport({ from, to, rows, distribution, platform = null, generatedAt = null, history = [] }) {
  const s = summarise(rows);
  const published = publishedInWindow(distribution, from, to);
  const warnings = dataQualityWarnings(s, published);
  const trend = trendRows([...history, { from, to, rows }]);
  const cohortLine = (k, label) => `| ${label} | ${s.cohorts[k].sessions} | ${s.cohorts[k].qe} | ${s.cohorts[k].ai} |`;
  const table = (entries) =>
    entries.length === 0
      ? "_none_"
      : ["| | Sessions | Qualified Evaluation | Adoption Intent | Engaged (`page_engaged`) | Of which suspected automation |", "| --- | --- | --- | --- | --- | --- |"]
          .concat(entries.map(([k, g]) => `| ${k} | ${g.sessions} | ${g.qe} | ${g.ai} | ${g.engaged} | ${g.cohort.suspected_automation ?? 0} |`))
          .join("\n");
  const plat = (asset, field) => {
    const v = platform?.[asset]?.[field];
    return v === undefined || v === null || v === "" ? UNAVAILABLE : `${v} (platform-reported${platform?.[asset]?.readOn ? `, read ${platform[asset].readOn}` : ""})`;
  };

  return `# Weekly growth report — ${from} to ${to} (UTC, end exclusive)

${generatedAt ? `Generated ${generatedAt} from ` : "From "}one PostHog query (\`node scripts/marketing-weekly-report.mjs --from ${from} --to ${to} --print-query\`)
and the distribution register. **Observed counts only.** Before the baseline in analytics.md §10 closes, read
absolute counts, never a percentage change.

## Data-quality warnings

${warnings.length === 0 ? "_None raised by the automatic checks._" : warnings.map((x) => `- ${x}`).join("\n")}

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
- Evaluation → Intent Progression (analytics.md §4), canonical: ${s.progressionKnown ? `**${s.canonical.progressed}** of ${s.canonical.qe} Qualified Evaluation sessions (${rate(s.canonical.progressed, s.canonical.qe)}); audience only: **${s.audience.progressed}** of ${s.audience.qe}` : `${UNAVAILABLE} (these rows predate the \`progressed\` column; re-run the query)`}.
- Not an install count, and not activation (analytics.md §5).

## Campaigns and channels (eligible sessions)

Campaign-attributed sessions: **${s.campaignSessions}** (audience cohort: ${s.campaignAudience}).
Unattributed (direct or unrecognised source, no campaign): **${s.unattributed}**. Campaign sessions missing a source or content tag: **${s.partiallyTagged}**.

### By campaign / content
${table(s.byCampaign)}

### Experiment arms (audience cohort only)

Read experiment arms here, never from the table above (distribution/M3-EXPERIMENTS.md). *Acted*: an event that is not
fired on render, or a second page. *Copied*: an install or CLI copy, or an adopt CTA.

${s.byArm.length === 0 ? "_none_" : ["| Campaign / content | Audience sessions | Audience QE | Acted after landing | Copied or adopt CTA |", "| --- | --- | --- | --- | --- |"].concat(s.byArm.map(([k, g]) => `| ${k} | ${g.sessions} | ${g.qe} | ${g.acted} | ${g.copied} |`)).join("\n")}

### By source / medium
${table(s.bySource)}

## Conversion by landing page (audience cohort)
${table(s.byLanding)}

## Platform interest (eligible sessions)

Sessions that chose a platform tab, opened a platform's code or copied a platform's install snippet. A session can name more than one platform.

${s.platformKnown ? table(s.byPlatform) : UNAVAILABLE}

## Installation interest

${s.install.known ? `| | Canonical | Audience |
| --- | --- | --- |
| Opened an installation page (fires on render) | ${s.install.viewed.canonical} | ${s.install.viewed.audience} |
| Copied an install or CLI command | ${s.install.copied.canonical} | ${s.install.copied.audience} |` : UNAVAILABLE}

## Trend (absolute counts, oldest first)

| Week | Raw | Eligible | Canonical QE | Audience | Audience QE | AI (canonical / audience) | Campaign (all / audience) |
| --- | --- | --- | --- | --- | --- | --- | --- |
${trend.map((t) => `| ${t.from} → ${t.to} | ${t.raw} | ${t.eligible} | ${t.qe} | ${t.audience} | ${t.audienceQe} | ${t.ai} / ${t.audienceAi} | ${t.campaign} / ${t.campaignAudience} |`).join("\n")}

## Platform-reported engagement

Reach, impressions and clicks exist only in each platform's own analytics. They are never estimated here.

${published.length === 0 ? "_No asset published in this window._" : ["| Asset | Reach | Impressions | Clicks | Reactions |", "| --- | --- | --- | --- | --- |"].concat(published.map((p) => `| ${p.asset} | ${plat(p.asset, "reach")} | ${plat(p.asset, "impressions")} | ${plat(p.asset, "clicks")} | ${plat(p.asset, "reactions")} |`)).join("\n")}

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
    console.log(process.argv.includes("--compact") ? compactQuery(from, to) : sessionQuery(from, to));
  } else {
    const file = arg("--sessions");
    if (!file) {
      console.error("usage: --from YYYY-MM-DD --to YYYY-MM-DD (--print-query | --sessions rows.json [--platform p.json] [--history weeks.json])");
      process.exit(2);
    }
    sessionQuery(from, to); // validates the window
    const text = readFileSync(file, "utf8");
    // the bare rows, { rows, ...provenance }, or the --compact cell saved as text
    const parsed = file.endsWith(".json") ? JSON.parse(text) : parseCompact(text);
    const all = Array.isArray(parsed) ? parsed : parsed.rows;
    // a multi-week export is cut to this week here, so one export can feed several reports
    const rows = all.filter((r) => !r.started || (String(r.started).slice(0, 10) >= from && String(r.started).slice(0, 10) < to));
    const distribution = JSON.parse(readFileSync("marketing/distribution/register.json", "utf8"));
    const platform = arg("--platform") ? JSON.parse(readFileSync(arg("--platform"), "utf8")) : null;
    // --history older-weeks.json: [{ from, to, rows }] for the trend table, oldest first
    const history = arg("--history") ? JSON.parse(readFileSync(arg("--history"), "utf8")) : [];
    process.stdout.write(renderReport({ from, to, rows, distribution, platform, history, generatedAt: new Date().toISOString().slice(0, 10) }));
  }
}
