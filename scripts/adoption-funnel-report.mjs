/**
 * adoption-funnel-report.mjs — the developer adoption funnel (marketing/analytics.md §11 "Adoption funnel"), from one
 * PostHog query.
 *
 *   node scripts/adoption-funnel-report.mjs --from 2026-10-18 --to 2026-10-25 --print-query
 *       prints the one HogQL query to run (PostHog → SQL, or the MCP `execute-sql` tool); save its rows as JSON
 *   node scripts/adoption-funnel-report.mjs --from 2026-10-18 --to 2026-10-25 --sessions rows.json
 *       renders the funnel as Markdown on stdout
 *
 * One row per session, classified into a traffic cohort by the weekly report's own `classifySession`, so the funnel
 * and the weekly report can never disagree about which sessions are audience, internal or suspected automation.
 * Each stage counts DISTINCT sessions holding any of its signals, in any order: it is "how many sessions got this far
 * on the site", not a sequence a session had to follow. The stage lists must equal `ADOPTION_FUNNEL_STAGES` in
 * apps/web/src/lib/analytics-measurement.ts; `adoption-funnel-signals.test.ts` fails if they drift.
 *
 * What it never does: count an install. Reading a setup page, copying an install command and following a setup link
 * are interest and intent; whether the install then worked happens on the developer's machine, where the site sends
 * nothing. That stage is printed as "not observable", always. QER and Adoption Intent are not redefined here.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { AI_CTA_TARGETS, AI_EVENTS, ARRIVAL_EVENTS, EXCLUDED_SESSION_IDS, RENDER_EVENTS, classifySession } from "./marketing-weekly-report.mjs";

/** The stages, in reading order. `platformed` keeps only events that carry a `platform`. */
export const STAGES = [
  { stage: "exploration", label: "Exploration (a component page viewed)", events: ["component_viewed"], targets: [] },
  { stage: "platform_selection", label: "Platform selection (a platform tab chosen)", events: ["platform_selected"], targets: [] },
  { stage: "verification_inspection", label: "Verification inspection (evidence opened, or the verification CTA)", events: ["verification_inspected"], targets: ["view_verification"] },
  { stage: "installation_interest", label: "Installation interest (a setup page, or a setup link)", events: ["installation_viewed"], platformed: ["docs_viewed"], targets: ["installation"] },
  { stage: "code_copy", label: "Code copy (a component's or a block's code)", events: ["component_code_copied", "block_code_copied"], targets: [] },
  { stage: "adoption_intent", label: "Adoption Intent (analytics.md §4, unchanged)", events: AI_EVENTS, targets: AI_CTA_TARGETS },
];

/** Cohorts the funnel shows, in order. Diagnostic and not-an-arrival sessions are counted, never shown as a funnel. */
export const FUNNEL_COHORTS = ["audience", "suspected_automation", "internal"];
const COHORT_LABEL = { audience: "Audience", suspected_automation: "Suspected automation", internal: "Internal" };

export const INSTALL_SUCCESS = "not observable";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const list = (xs) => xs.map((x) => `'${x}'`).join(", ");
const stageCondition = (s) =>
  [
    s.events.length ? `event IN (${list(s.events)})` : null,
    s.platformed?.length ? `(event IN (${list(s.platformed)}) AND notEmpty(toString(properties.platform)))` : null,
    s.targets.length ? `(event = 'cta_clicked' AND properties.target IN (${list(s.targets)}))` : null,
  ].filter(Boolean).join(" OR ");

/** Sessions that STARTED in [from, to), UTC, read over a day either side, as the weekly report does. */
export function funnelQuery(from, to) {
  if (!DAY.test(from) || !DAY.test(to) || from >= to) throw new Error("--from and --to must be YYYY-MM-DD with from < to");
  return `SELECT
  $session_id AS session_id,
  min(timestamp) AS started,
  dateDiff('second', min(timestamp), max(timestamp)) AS duration_s,
  countIf(event = '$pageview') AS pageviews,
  countIf(event IN (${list(ARRIVAL_EVENTS)})) AS arrival_events,
  countIf(event NOT IN (${list(RENDER_EVENTS)})) AS interaction_events,
  countIf(properties.kx_traffic_type = 'diagnostic') AS diagnostic_events,
  countIf(properties.kx_traffic_type = 'internal') AS internal_events,
  argMin(properties.kx_referrer, timestamp) AS kx_referrer,
${STAGES.map((s) => `  countIf(${stageCondition(s)}) AS ${s.stage}`).join(",\n")},
  groupUniqArrayIf(toString(properties.platform), (${stageCondition(STAGES.find((s) => s.stage === "installation_interest"))}) AND notEmpty(toString(properties.platform))) AS install_platforms
FROM events
WHERE timestamp >= toDateTime('${from} 00:00:00') - INTERVAL 1 DAY AND timestamp < toDateTime('${to} 00:00:00') + INTERVAL 1 DAY
  AND $session_id IS NOT NULL AND $session_id NOT IN (${list(EXCLUDED_SESSION_IDS)})
GROUP BY session_id
HAVING started >= toDateTime('${from} 00:00:00') AND started < toDateTime('${to} 00:00:00')
ORDER BY started`;
}

const platformsOf = (row) => {
  const p = row.install_platforms;
  if (Array.isArray(p)) return p.filter(Boolean);
  if (typeof p === "string" && p) return JSON.parse(p).filter(Boolean);
  return [];
};

/** Every number the funnel prints, from the rows alone. */
export function summariseFunnel(rows) {
  const cohorts = Object.fromEntries(FUNNEL_COHORTS.map((c) => [c, { sessions: 0, stages: Object.fromEntries(STAGES.map((s) => [s.stage, 0])), installPlatforms: {} }]));
  const excluded = { diagnostic: 0, not_arrival: 0 };
  for (const row of rows) {
    const cohort = classifySession(row);
    if (cohort in excluded) {
      excluded[cohort]++;
      continue;
    }
    const c = cohorts[cohort];
    c.sessions++;
    for (const s of STAGES) if (Number(row[s.stage]) > 0) c.stages[s.stage]++;
    for (const p of new Set(platformsOf(row))) c.installPlatforms[p] = (c.installPlatforms[p] ?? 0) + 1;
  }
  return { cohorts, excluded, installSuccess: INSTALL_SUCCESS };
}

export function renderFunnel({ from, to, rows, generatedAt }) {
  const f = summariseFunnel(rows);
  const head = `| Stage | ${FUNNEL_COHORTS.map((c) => COHORT_LABEL[c]).join(" | ")} |`;
  const sep = `| --- | ${FUNNEL_COHORTS.map(() => "---").join(" | ")} |`;
  const line = (label, value) => `| ${label} | ${FUNNEL_COHORTS.map(value).join(" | ")} |`;
  const platforms = [...new Set(FUNNEL_COHORTS.flatMap((c) => Object.keys(f.cohorts[c].installPlatforms)))].sort();
  return `# Developer adoption funnel, ${from} to ${to} (UTC, sessions that started in the window)

Generated ${generatedAt} by \`scripts/adoption-funnel-report.mjs\` from one PostHog query. Every figure is a count of
distinct sessions that reached the stage, in any order; cohorts are the weekly report's (analytics.md §11 "Traffic
cohorts"). Diagnostic sessions (${f.excluded.diagnostic}) and sessions with no page event (${f.excluded.not_arrival}) are
left out. This is a view over existing signals: Qualified Evaluation Rate and Adoption Intent are unchanged.

${head}
${sep}
${line("Sessions", (c) => f.cohorts[c].sessions)}
${STAGES.map((s) => line(s.label, (c) => f.cohorts[c].stages[s.stage])).join("\n")}
${line("**Successful install**", () => `_${f.installSuccess}_`)}

### Installation interest by platform

${platforms.length === 0 ? "_No installation-interest event carried a platform in this window (the property exists from 2026-10-18)._" : [`| Platform | ${FUNNEL_COHORTS.map((c) => COHORT_LABEL[c]).join(" | ")} |`, sep].concat(platforms.map((p) => line(p, (c) => f.cohorts[c].installPlatforms[p] ?? 0))).join("\n")}

## Limitations

- A successful install cannot be seen from the site and is never inferred from these events (analytics.md §5).
- Verification inspection exists from the BD-W5 release; before it, that stage holds only the homepage verification CTA.
- Suspected automation is a rule, not proof (analytics.md §11). It is shown beside the audience, never subtracted.
- Do Not Track visitors, blocked scripts and dropped beacons send nothing, so every count is a floor.
`;
}

/* ------------------------------------------------------------------ CLI */

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null);
  const from = arg("--from");
  const to = arg("--to");
  if (process.argv.includes("--print-query")) {
    console.log(funnelQuery(from, to));
  } else {
    const file = arg("--sessions");
    if (!file) {
      console.error("usage: --from YYYY-MM-DD --to YYYY-MM-DD (--print-query | --sessions rows.json)");
      process.exit(2);
    }
    funnelQuery(from, to); // validates the window
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    const rows = Array.isArray(parsed) ? parsed : parsed.rows;
    process.stdout.write(renderFunnel({ from, to, rows, generatedAt: new Date().toISOString().slice(0, 10) }));
  }
}
