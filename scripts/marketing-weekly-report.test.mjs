import assert from "node:assert/strict";
import { test } from "node:test";
import { ARM_CONTENT, COMPACT_COLUMNS, classifySession, compactQuery, dataQualityWarnings, parseCompact, publishedInWindow, renderReport, sessionQuery, summarise, trendRows } from "./marketing-weekly-report.mjs";

/** An audience session that qualifies. Each case below changes one thing. */
// Arm columns default to the whole session, as if the tagged link opened it; tests override them for a session that
// was already open when the link was followed.
const row = (over = {}) => armDefaults({
  session_id: "s",
  duration_s: 40,
  pageviews: 2,
  arrival_events: 3,
  interaction_events: 1,
  engaged_events: 1,
  qe_signals: 1,
  ai_signals: 0,
  ai_copy_or_rung: 0,
  progressed: 0,
  install_views: 0,
  install_copies: 0,
  platforms: "",
  diagnostic_events: 0,
  internal_events: 0,
  kx_source: "linkedin",
  kx_medium: "social",
  kx_campaign: "kx_p1_a_parity_proof",
  kx_content: "li_primary",
  kx_referrer: "direct",
  landing: "/docs/platforms",
  ...over,
});
function armDefaults(r) {
  return {
    arm_content: ARM_CONTENT.test(r.kx_content ?? "") ? r.kx_content : null,
    arm_pageviews: r.pageviews,
    arm_interactions: r.interaction_events,
    arm_qe_signals: r.qe_signals,
    arm_copies: r.ai_copy_or_rung,
    ...r,
  };
}
const renderOnly = (over = {}) => row({ duration_s: 0, pageviews: 1, arrival_events: 2, interaction_events: 0, engaged_events: 0, kx_source: "direct", kx_medium: "direct", kx_campaign: null, kx_content: null, ...over });

test("classifySession puts each session in exactly one cohort", () => {
  assert.equal(classifySession(row()), "audience");
  assert.equal(classifySession(row({ arrival_events: 0 })), "not_arrival");
  assert.equal(classifySession(row({ diagnostic_events: 2 })), "diagnostic");
  assert.equal(classifySession(row({ internal_events: 1 })), "internal");
  assert.equal(classifySession(renderOnly()), "suspected_automation");
});

test("the suspected-automation rule needs every condition, so one human sign keeps a session in the audience", () => {
  assert.equal(classifySession(renderOnly({ duration_s: 5 })), "audience");
  assert.equal(classifySession(renderOnly({ pageviews: 2 })), "audience");
  assert.equal(classifySession(renderOnly({ interaction_events: 1 })), "audience");
  assert.equal(classifySession(renderOnly({ kx_referrer: "search" })), "audience");
  // a tagged one-hit arrival still counts as suspected when it arrives with no referrer (the 2026-10-17 art_pillar hit)
  assert.equal(classifySession(renderOnly({ kx_campaign: "kx_p1_a_parity_proof", kx_source: "devto" })), "suspected_automation");
});

test("negative control: diagnostic traffic is never growth, whatever else it looks like", () => {
  const probe = row({ diagnostic_events: 1, ai_signals: 1 });
  const s = summarise([probe, row()]);
  assert.equal(s.canonical.eligible, 1);
  assert.equal(s.canonical.ai, 0);
  assert.equal(s.audience.sessions, 1);
  assert.equal(s.campaignSessions, 1);
  // diagnostic wins over internal
  assert.equal(classifySession(row({ diagnostic_events: 1, internal_events: 1 })), "diagnostic");
});

test("canonical QER keeps internal and suspected sessions; the audience figure removes them", () => {
  const s = summarise([row(), row({ internal_events: 1 }), renderOnly(), row({ qe_signals: 0 })]);
  assert.deepEqual(s.canonical, { eligible: 4, qe: 3, ai: 0, progressed: 0 });
  assert.equal(s.audience.sessions, 2);
  assert.equal(s.audience.qe, 1);
  assert.equal(s.cohorts.suspected_automation.qe, 1);
  assert.equal(s.cohorts.internal.sessions, 1);
});

test("human-evidenced counts only audience QE sessions with an input, a click event or a second page", () => {
  const s = summarise([row(), row({ engaged_events: 0, interaction_events: 0, pageviews: 1, duration_s: 30 })]);
  assert.equal(s.audience.qe, 2);
  assert.equal(s.audience.qeHuman, 1);
});

test("progression counts QE sessions with intent at or after the first evaluation, and says unavailable without the column", () => {
  const s = summarise([row({ ai_signals: 1, progressed: 1 }), row({ ai_signals: 1, progressed: 0 }), row()]);
  assert.equal(s.canonical.qe, 3);
  assert.equal(s.canonical.progressed, 1);
  assert.equal(s.audience.progressed, 1);
  const md = renderReport({ from: "2026-10-19", to: "2026-10-26", rows: [row({ ai_signals: 1, progressed: 1 })], distribution: { rows: [] } });
  assert.match(md, /Progression \(analytics\.md §4\), canonical: \*\*1\*\* of 1 Qualified Evaluation sessions \(100\.0%\)/);
  const { progressed, ...old } = row();
  assert.match(renderReport({ from: "2026-10-19", to: "2026-10-26", rows: [old], distribution: { rows: [] } }), /Progression[^\n]*unavailable \(these rows predate/);
});

test("unattributed means no campaign and a direct or unrecognised source", () => {
  const s = summarise([row(), renderOnly(), row({ kx_campaign: null, kx_source: "search", kx_medium: "organic" })]);
  assert.equal(s.unattributed, 1);
  assert.equal(s.campaignSessions, 1);
});

test("publishedInWindow lists only published rows dated inside the window", () => {
  const distribution = {
    rows: [
      { asset: "A", channel: "linkedin", status: "published", date: "2026-10-12", liveUrl: "https://www.linkedin.com/feed/update/urn:li:activity:1/" },
      { asset: "B", channel: "x", status: "published", date: "2026-10-19", liveUrl: "https://x.com/u/status/2" },
      { asset: "C", channel: "x", status: "planned", date: "2026-10-13" },
    ],
  };
  assert.deepEqual(publishedInWindow(distribution, "2026-10-12", "2026-10-19").map((r) => r.asset), ["A"]);
});

test("the report labels platform numbers unavailable and never prints a figure it was not given", () => {
  const distribution = { rows: [{ asset: "LI-001", channel: "linkedin", status: "published", date: "2026-10-19", liveUrl: "https://www.linkedin.com/feed/update/urn:li:activity:1/" }] };
  const md = renderReport({ from: "2026-10-19", to: "2026-10-26", rows: [row()], distribution });
  assert.match(md, /\| LI-001 \| unavailable \| unavailable \| unavailable \|/);
  assert.doesNotMatch(md, /\breach\b.*\d/i);
  const given = renderReport({ from: "2026-10-19", to: "2026-10-26", rows: [row()], distribution, platform: { "LI-001": { reach: 90, impressions: 120 } } });
  assert.match(given, /\| LI-001 \| 90 \(platform-reported\) \| 120 \(platform-reported\) \| unavailable \| unavailable \|/);
});

test("an empty week reports zero sessions and no rate, not 0%", () => {
  const md = renderReport({ from: "2026-10-19", to: "2026-10-26", rows: [], distribution: { rows: [] } });
  assert.match(md, /n\/a \(no sessions\)/);
});

test("sessionQuery validates its window and excludes the audited session", () => {
  assert.throws(() => sessionQuery("2026-10-19", "2026-10-12"));
  assert.throws(() => sessionQuery("19 Oct", "2026-10-26"));
  const q = sessionQuery("2026-10-12", "2026-10-19");
  assert.match(q, /toDateTime\('2026-10-12 00:00:00'\)/);
  assert.match(q, /01a120d7-2b07-7ed0-af0c-f96d32e4c5bd/);
  assert.match(q, /properties\.target IN/);
  assert.match(q, /maxIf\(timestamp, \(event IN \('installation_viewed'.*\) >= minIf\(timestamp, \(event IN \('component_viewed'.*\) AS progressed/s);
  // a session belongs to the week it started in, and is aggregated over all of its events (sessions cap at 24 h)
  assert.match(q, /timestamp >= toDateTime\('2026-10-12 00:00:00'\) - INTERVAL 1 DAY AND timestamp < toDateTime\('2026-10-19 00:00:00'\) \+ INTERVAL 1 DAY/);
  assert.match(q, /HAVING started >= toDateTime\('2026-10-12 00:00:00'\) AND started < toDateTime\('2026-10-19 00:00:00'\)/);
});

test("platform interest counts each platform a session named, with its cohort", () => {
  const s = summarise([row({ platforms: "Flutter,SwiftUI" }), row({ platforms: "Flutter" }), renderOnly({ platforms: "React" }), row({ diagnostic_events: 1, platforms: "Compose" })]);
  const m = Object.fromEntries(s.byPlatform);
  assert.equal(m.Flutter.sessions, 2);
  assert.equal(m.SwiftUI.sessions, 1);
  assert.equal(m.React.cohort.suspected_automation, 1);
  assert.equal(m.Compose, undefined, "diagnostic sessions name no platform interest");
});

test("installation interest separates a page that loaded from a command someone copied", () => {
  const s = summarise([row({ install_views: 1 }), row({ install_views: 1, install_copies: 1 }), renderOnly({ install_views: 1 })]);
  assert.deepEqual(s.install.viewed, { canonical: 3, audience: 2 });
  assert.deepEqual(s.install.copied, { canonical: 1, audience: 1 });
  const { install_views, install_copies, platforms, ...old } = row();
  const md = renderReport({ from: "2026-10-19", to: "2026-10-26", rows: [old], distribution: { rows: [] } });
  assert.match(md, /## Installation interest\n\nunavailable/);
  assert.match(md, /## Platform interest[\s\S]*?\nunavailable/);
});

test("data-quality warnings fire on a mostly automated week and stay quiet on a clean one", () => {
  const bot = Array.from({ length: 3 }, () => renderOnly());
  const noisy = dataQualityWarnings(summarise([...bot, row()]), [{ asset: "X-1", liveUrl: null }]);
  assert.ok(noisy.some((w) => /3 of 4 eligible sessions .* suspected automation/.test(w)));
  assert.ok(noisy.some((w) => /canonical QER mostly measures pages loading/.test(w)));
  assert.ok(noisy.some((w) => /below the ~30/.test(w)));
  assert.ok(noisy.some((w) => /X-1 is marked published without a live URL/.test(w)));
  const clean = dataQualityWarnings(summarise(Array.from({ length: 30 }, () => row())), []);
  assert.deepEqual(clean, []);
});

test("negative control: a tagged campaign that only automation reached is flagged, never counted as a human arrival", () => {
  const s = summarise([renderOnly({ kx_campaign: "kx_p1_a_parity_proof", kx_source: "linkedin", kx_content: "li_primary" }), row({ kx_campaign: null, kx_source: "direct" })]);
  assert.equal(s.campaignSessions, 1);
  assert.equal(s.campaignAudience, 0);
  assert.ok(dataQualityWarnings(s, []).some((w) => /no tagged human arrival is evidenced/.test(w)));
});

test("the trend lists absolute counts per week, oldest first, and no percentage change", () => {
  const t = trendRows([{ from: "2026-10-05", to: "2026-10-12", rows: [row()] }, { from: "2026-10-12", to: "2026-10-19", rows: [row(), renderOnly()] }]);
  assert.deepEqual(t.map((x) => [x.raw, x.qe, x.audienceQe]), [[1, 1, 1], [2, 2, 1]]);
  const md = renderReport({ from: "2026-10-12", to: "2026-10-19", rows: [row()], distribution: { rows: [] }, history: [{ from: "2026-10-05", to: "2026-10-12", rows: [row()] }] });
  assert.match(md, /\| 2026-10-05 → 2026-10-12 \| 1 \|/);
  const trend = md.split("## Trend")[1].split("\n## ")[0];
  assert.doesNotMatch(trend, /%/);
});

test("sessionQuery carries the installation and platform columns", () => {
  const q = sessionQuery("2026-10-12", "2026-10-19");
  assert.match(q, /countIf\(event = 'installation_viewed'\) AS install_views/);
  assert.match(q, /AS install_copies/);
  assert.match(q, /groupUniqArrayIf\(toString\(properties\.platform\), event IN \('platform_selected', 'component_code_viewed', 'install_command_copied'\)/);
});

test("the compact export carries every column summarise reads and parses back to the same summary", () => {
  const q = compactQuery("2026-10-12", "2026-10-19");
  assert.ok(q.includes(sessionQuery("2026-10-12", "2026-10-19")), "wraps the canonical query unchanged");
  for (const c of COMPACT_COLUMNS) assert.match(q, new RegExp(`\\b${c}\\b`));
  const rows = [row({ started: "2026-10-12T09:00:00Z", platforms: "flutter,react" }), renderOnly({ started: "2026-10-13T01:00:00Z", kx_campaign: null, kx_content: null })];
  const text = [COMPACT_COLUMNS.join("|"), ...rows.map((r) => COMPACT_COLUMNS.map((c) => r[c] ?? "").join("|"))].join("\n");
  const back = parseCompact(text);
  assert.equal(back[1].kx_campaign, null);
  assert.deepEqual(summarise(back).cohorts, summarise(rows).cohorts);
  assert.deepEqual(summarise(back).byPlatform, summarise(rows).byPlatform);
});

test("negative control: a compact export with a missing or reordered column is refused, not misread", () => {
  assert.throws(() => parseCompact(COMPACT_COLUMNS.slice(1).join("|") + "\n1|2"), /header/);
  assert.throws(() => parseCompact(COMPACT_COLUMNS.join("|") + "\n2026-10-12T00:00:00Z|0"), /fields/);
});

test("the QER warning follows the suspected share of qualifying sessions, not of all sessions", () => {
  const loads = Array.from({ length: 6 }, () => renderOnly({ qe_signals: 0 }));
  const w = dataQualityWarnings(summarise([...loads, ...Array.from({ length: 4 }, () => row())]), []);
  assert.ok(w.some((x) => /6 of 10 eligible sessions/.test(x)), "the volume warning still fires");
  assert.ok(!w.some((x) => /canonical QER mostly measures/.test(x)), "but every qualifying session is audience");
});

test("experiment arms are counted from the audience cohort, with a destination-neutral action and copy-only intent", () => {
  const tag = (content, over = {}) => ({ kx_campaign: "kx_p1_d_partial_evidence", kx_source: "linkedin", kx_content: content, ...over });
  const s = summarise([
    // B2-style: a component landing qualifies on render, and with a LinkedIn referrer stays audience, but nobody acted
    row(tag("li_xb_relevant", { pageviews: 1, interaction_events: 0, engaged_events: 0, kx_referrer: "linkedin" })),
    row(tag("li_xb_relevant", { ai_copy_or_rung: 1 })),
    // C2-style: an installation page load is Adoption Intent but not a copy
    row(tag("x_xc_firstuse", { pageviews: 1, interaction_events: 0, ai_signals: 1, install_views: 1, kx_referrer: "x" })),
    // automation on the same tag never reaches the arm table
    renderOnly(tag("li_xb_relevant")),
    row(tag("li_xb_relevant", { internal_events: 1 })),
  ]);
  const arms = Object.fromEntries(s.byArm);
  assert.deepEqual(arms["li_xb_relevant"], { sessions: 2, qe: 2, acted: 1, copied: 1 });
  assert.deepEqual(arms["x_xc_firstuse"], { sessions: 1, qe: 1, acted: 0, copied: 0 });
  const md = renderReport({ from: "2026-10-19", to: "2026-10-26", rows: [row(tag("li_xb_relevant"))], distribution: { rows: [] } });
  assert.match(md, /\| li_xb_relevant \| 1 \| 1 \| 1 \| 0 \|/);
});

test("an arm run through several posts is one row, and content that is not an arm tag stays out of the arm table", () => {
  const s = summarise([
    row({ kx_campaign: "kx_p1_d_partial_evidence", kx_source: "linkedin", kx_content: "li_xa_infra" }),
    row({ kx_campaign: "kx_p1_a_parity_proof", kx_source: "linkedin", kx_content: "li_xa_infra" }),
    row({ kx_campaign: "kx_p1_a_parity_proof", kx_source: "linkedin", kx_content: "li_primary" }),
  ]);
  assert.deepEqual(s.byArm.map(([k, g]) => [k, g.sessions]), [["li_xa_infra", 2]]);
});

test("arm shares are printed only once a count reaches the floor, so unequal traffic is compared as a rate", () => {
  const tag = (content, n, acted) =>
    Array.from({ length: n }, (_, i) =>
      row({ kx_campaign: "kx_p2_b_relevant", kx_source: "linkedin", kx_content: content, kx_referrer: "linkedin",
            pageviews: 1, interaction_events: i < acted ? 1 : 0, ai_copy_or_rung: 0 }));
  const md = renderReport({ from: "2026-10-19", to: "2026-10-26", rows: [...tag("li_xb_coverage", 100, 60), ...tag("li_xb_relevant", 31, 31)], distribution: { rows: [] } });
  assert.match(md, /\| li_xb_coverage \| 100 \| [^|]+ \| 60 \(60\.0%\) \| 0 \(0\.0%\) \|/);
  assert.match(md, /\| li_xb_relevant \| 31 \| [^|]+ \| 31 \(100\.0%\) \| 0 \(0\.0%\) \|/);
  const few = renderReport({ from: "2026-10-19", to: "2026-10-26", rows: tag("li_xb_relevant", 5, 2), distribution: { rows: [] } });
  assert.match(few, /\| li_xb_relevant \| 5 \| [^|]+ \| 2 \| 0 \|/);
});

test("a copy count is shown as a share once the arm's acted floor is met, even below 30 copies (experiment C)", () => {
  const rows = Array.from({ length: 100 }, (_, i) =>
    row({ kx_campaign: "kx_p2_c_first_use", kx_source: "x", kx_content: "x_xc_firstuse", kx_referrer: "x", qe_signals: 0,
          pageviews: 1, interaction_events: i < 40 ? 1 : 0, ai_copy_or_rung: i < 5 ? 1 : 0 }));
  const md = renderReport({ from: "2026-10-19", to: "2026-10-26", rows, distribution: { rows: [] } });
  assert.match(md, /\| x_xc_firstuse \| 100 \| 0 \(0\.0%\) \| 40 \(40\.0%\) \| 5 \(5\.0%\) \|/);
});

test("negative control: what a session did before following the arm link is not credited to the arm", () => {
  // Browsing three pages and copying a command, then following an arm link and doing nothing after it.
  const s = summarise([
    row({ kx_content: "li_xb_relevant", kx_referrer: "linkedin", pageviews: 4, interaction_events: 3, qe_signals: 2, ai_copy_or_rung: 1,
          arm_pageviews: 1, arm_interactions: 0, arm_qe_signals: 0, arm_copies: 0 }),
  ]);
  assert.deepEqual(Object.fromEntries(s.byArm)["li_xb_relevant"], { sessions: 1, qe: 0, acted: 0, copied: 0 });
});

test("sessionQuery counts arm outcomes only from the first arm-tagged event, and an export without arm columns still reads", () => {
  const q = sessionQuery("2026-10-19", "2026-10-26");
  assert.match(q, /argMinIf\(properties\.kx_content, timestamp, match\(/);
  assert.match(q, /x\.1 >= minIf\(timestamp, match\(/);
  for (const c of ["arm_pageviews", "arm_interactions", "arm_qe_signals", "arm_copies"]) assert.match(q, new RegExp(`AS ${c}\\b`));
  const base = COMPACT_COLUMNS.slice(0, COMPACT_COLUMNS.indexOf("landing") + 1);
  const old = parseCompact(base.join("|") + "\n" + base.map((c) => (c === "started" ? "2026-10-12T00:00:00Z" : c.startsWith("kx_") || c === "landing" || c === "platforms" ? "" : "0")).join("|"));
  assert.equal(old[0].arm_content, undefined);
  assert.deepEqual(summarise(old).byArm, []);
});

test("each arm's shares follow its experiment's registered floor: QE for A, acted for B and C", () => {
  // 40 sessions that qualify on render and nobody acts in: A's floor is met, B's is not
  const loads = (content) =>
    Array.from({ length: 40 }, () => row({ kx_content: content, kx_referrer: "linkedin", pageviews: 1, interaction_events: 0 }));
  const md = renderReport({ from: "2026-10-19", to: "2026-10-26", rows: [...loads("li_xa_infra"), ...loads("li_xb_relevant")], distribution: { rows: [] } });
  assert.match(md, /\| li_xa_infra \| 40 \| 40 \(100\.0%\) \| 0 \(0\.0%\) \| 0 \(0\.0%\) \|/);
  assert.match(md, /\| li_xb_relevant \| 40 \| 40 \| 0 \| 0 \|/);
});

test("--arms-from accumulates the arm table across weeks while every other figure stays this week's", () => {
  const acted = (started) => row({ started, kx_content: "li_xb_relevant", kx_referrer: "linkedin" });
  const earlier = Array.from({ length: 20 }, () => acted("2026-10-20T10:00:00Z"));
  const week = Array.from({ length: 10 }, () => acted("2026-10-27T10:00:00Z"));
  const md = renderReport({ from: "2026-10-26", to: "2026-11-02", rows: week, armRows: [...earlier, ...week], armsFrom: "2026-10-19", distribution: { rows: [] } });
  assert.match(md, /\| li_xb_relevant \| 30 \| [^|]+ \| 30 \(100\.0%\) \|/);
  assert.match(md, /Cumulative: audience sessions from 2026-10-19 to 2026-11-02/);
  assert.equal(summarise(week).audience.sessions, 10);
  const weekOnly = renderReport({ from: "2026-10-26", to: "2026-11-02", rows: week, distribution: { rows: [] } });
  assert.match(weekOnly, /\| li_xb_relevant \| 10 \| [^|]+ \| 10 \|/);
});
