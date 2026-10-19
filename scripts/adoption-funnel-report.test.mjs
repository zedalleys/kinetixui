import assert from "node:assert/strict";
import { test } from "node:test";
import { FUNNEL_COHORTS, STAGES, funnelQuery, renderFunnel, summariseFunnel } from "./adoption-funnel-report.mjs";

const none = Object.fromEntries(STAGES.map((s) => [s.stage, 0]));
/** An audience session that explored and looked at evidence. Each case below changes one thing. */
const row = (over = {}) => ({
  session_id: "s", duration_s: 60, pageviews: 2, arrival_events: 3, interaction_events: 2,
  diagnostic_events: 0, internal_events: 0, kx_referrer: "direct",
  ...none, exploration: 1, verification_inspection: 1, install_platforms: [],
  ...over,
});

test("counts distinct sessions per stage and cohort, in any order", () => {
  const f = summariseFunnel([row(), row({ session_id: "t", exploration: 4 }), row({ session_id: "u", internal_events: 2, code_copy: 1 })]);
  assert.equal(f.cohorts.audience.sessions, 2);
  assert.equal(f.cohorts.audience.stages.exploration, 2, "four component views in one session are one session");
  assert.equal(f.cohorts.audience.stages.verification_inspection, 2);
  assert.equal(f.cohorts.internal.sessions, 1);
  assert.equal(f.cohorts.internal.stages.code_copy, 1);
  assert.equal(f.cohorts.audience.stages.code_copy, 0, "internal traffic never lands in the audience column");
});

test("keeps diagnostic and non-arrival sessions out of every column, and counts them", () => {
  const f = summariseFunnel([row({ diagnostic_events: 1, adoption_intent: 1 }), row({ arrival_events: 0 })]);
  for (const c of FUNNEL_COHORTS) assert.equal(f.cohorts[c].sessions, 0);
  assert.deepEqual(f.excluded, { diagnostic: 1, not_arrival: 1 });
});

test("a render-only direct visit is suspected automation, not audience", () => {
  const f = summariseFunnel([row({ duration_s: 1, pageviews: 1, interaction_events: 0, verification_inspection: 0 })]);
  assert.equal(f.cohorts.suspected_automation.sessions, 1);
  assert.equal(f.cohorts.suspected_automation.stages.exploration, 1);
  assert.equal(f.cohorts.audience.sessions, 0);
});

test("never reports an install, however far a session got (negative control for inferring one)", () => {
  const everything = row(Object.fromEntries(STAGES.map((s) => [s.stage, 9])));
  const f = summariseFunnel([everything]);
  assert.equal(f.installSuccess, "not observable");
  assert.ok(!STAGES.some((s) => /install(ed|_success)|activation/.test(s.stage)), "no stage claims an install");
  const md = renderFunnel({ from: "2026-10-18", to: "2026-10-25", rows: [everything], generatedAt: "2026-10-18" });
  assert.match(md, /\| \*\*Successful install\*\* \| _not observable_ \| _not observable_ \| _not observable_ \|/);
});

test("breaks installation interest down by the platform its events carried", () => {
  const f = summariseFunnel([row({ installation_interest: 2, install_platforms: ["swiftui", "react"] }), row({ session_id: "t", installation_interest: 1, install_platforms: '["swiftui"]' })]);
  assert.deepEqual(f.cohorts.audience.installPlatforms, { swiftui: 2, react: 1 });
});

test("the query counts each stage from its signals, and only platformed docs views as installation interest", () => {
  const q = funnelQuery("2026-10-18", "2026-10-25");
  for (const s of STAGES) assert.match(q, new RegExp(`AS ${s.stage}\\b`));
  assert.match(q, /event IN \('docs_viewed'\) AND notEmpty\(toString\(properties\.platform\)\)/);
  assert.match(q, /event IN \('verification_inspected'\) OR \(event = 'cta_clicked' AND properties\.target IN \('view_verification'\)\)/);
  assert.throws(() => funnelQuery("2026-10-25", "2026-10-18"));
});
