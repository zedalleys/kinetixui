import assert from "node:assert/strict";
import { test } from "node:test";
import { classifySession, publishedInWindow, renderReport, sessionQuery, summarise } from "./marketing-weekly-report.mjs";

/** An audience session that qualifies. Each case below changes one thing. */
const row = (over = {}) => ({
  session_id: "s",
  duration_s: 40,
  pageviews: 2,
  arrival_events: 3,
  interaction_events: 1,
  engaged_events: 1,
  qe_signals: 1,
  ai_signals: 0,
  ai_copy_or_rung: 0,
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
  assert.deepEqual(s.canonical, { eligible: 4, qe: 3, ai: 0 });
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
  const given = renderReport({ from: "2026-10-19", to: "2026-10-26", rows: [row()], distribution, platform: { "LI-001": { impressions: 120 } } });
  assert.match(given, /\| LI-001 \| 120 \(platform-reported\) \| unavailable \| unavailable \|/);
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
});
