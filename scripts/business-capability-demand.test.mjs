import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { demandProblems, isRealDay } from "./business-capability-demand.mjs";

const TODAY = "2026-11-09";
const at = "A / DataGrid";

/** A signal that satisfies every rule. Each negative control below breaks exactly one thing. */
const signal = (over = {}) => ({
  date: "2026-11-01",
  source: "interview",
  ref: "notes/p1-interviews/01.md",
  signal: "we gave up and built our own pivot table",
  confidence: "medium",
  askedForThisCapability: true,
  ...over,
});
const row = (demand) => ({ name: "DataGrid", demand });
const problems = (demand) => demandProblems(at, row(demand), TODAY);

// ---------------------------------------------------------------------------------------------------
// The states the model exists for. Honest absence of evidence is valid DATA, not a gap to be filled.
// ---------------------------------------------------------------------------------------------------

test("unmeasured with no signals is valid — nobody has looked", () => {
  assert.deepEqual(problems({ state: "unmeasured", signals: [] }), []);
});

test("unknown with no signals is valid — someone looked and found nothing conclusive", () => {
  assert.deepEqual(problems({ state: "unknown", signals: [] }), []);
});

test("evidenced with one complete signal is valid — the model admits real evidence, not only its absence", () => {
  assert.deepEqual(problems({ state: "evidenced", signals: [signal()] }), []);
});

test("the real inventory passes, and every row states a demand position", () => {
  const data = JSON.parse(readFileSync("docs/business-capabilities.json", "utf8"));
  const rows = data.families.flatMap((f) => f.capabilities);
  assert.ok(rows.length > 0, "no capability rows were read");
  const found = rows.flatMap((r) => demandProblems(`${r.name}`, r, TODAY));
  assert.deepEqual(found, []);
});

// ---------------------------------------------------------------------------------------------------
// Rule 1 — a state that claims evidence must carry it, and a state that claims none must not.
// ---------------------------------------------------------------------------------------------------

test("negative control: an unsupported state fails", () => {
  assert.match(problems({ state: "high", signals: [] }).join("\n"), /demand state "high"/);
});

test("negative control: no demand block at all fails", () => {
  assert.deepEqual(demandProblems(at, { name: "DataGrid" }, TODAY), [`${at}: no demand block`]);
});

test("negative control: evidenced with an empty signals array fails", () => {
  assert.match(problems({ state: "evidenced", signals: [] }).join("\n"), /no signals/);
});

test("negative control: unmeasured carrying a signal fails", () => {
  assert.match(problems({ state: "unmeasured", signals: [signal()] }).join("\n"), /carries 1 signal/);
});

// ---------------------------------------------------------------------------------------------------
// Rule 2 — the key sets are closed, so no numeric demand score can be stored anywhere.
// ---------------------------------------------------------------------------------------------------

test("negative control: an invented score on the demand block fails", () => {
  assert.match(problems({ state: "unmeasured", signals: [], score: 7 }).join("\n"), /demand key "score" is not part of the model/);
});

test("negative control: an invented score on a signal fails", () => {
  assert.match(problems({ state: "evidenced", signals: [signal({ score: 7 })] }).join("\n"), /key "score" is not part of the model/);
});

// ---------------------------------------------------------------------------------------------------
// Rule 3 — provenance, the stakeholder's own words, and a real date.
// ---------------------------------------------------------------------------------------------------

test("negative control: an evidenced signal with no ref fails — no provenance", () => {
  const { ref, ...noRef } = signal();
  assert.match(problems({ state: "evidenced", signals: [noRef] }).join("\n"), /missing ref/);
});

test("negative control: a whitespace ref fails", () => {
  assert.match(problems({ state: "evidenced", signals: [signal({ ref: "   " })] }).join("\n"), /ref is empty/);
});

test("negative control: an evidenced signal with no date fails", () => {
  const { date, ...noDate } = signal();
  assert.match(problems({ state: "evidenced", signals: [noDate] }).join("\n"), /missing date/);
});

test("negative control: a future date fails", () => {
  assert.match(problems({ state: "evidenced", signals: [signal({ date: "2099-01-01" })] }).join("\n"), /is in the future/);
});

test("negative control: askedForThisCapability must be a boolean, not a yes", () => {
  assert.match(problems({ state: "evidenced", signals: [signal({ askedForThisCapability: "yes" })] }).join("\n"), /must be true or false/);
});

// ---------------------------------------------------------------------------------------------------
// The dates the calendar does not have. `Date.parse` ROLLS these forward instead of rejecting them, so
// a validator built on it accepts a day that never existed. Reported by Codex on PR #549.
// ---------------------------------------------------------------------------------------------------

test("negative control: a date the calendar does not have fails, however Date.parse reads it", () => {
  for (const impossible of ["2026-02-29", "2026-02-30", "2026-04-31", "2026-06-31", "2025-02-29"]) {
    assert.ok(!Number.isNaN(Date.parse(impossible)), `${impossible} should be the rolling case this guards`);
    assert.match(
      problems({ state: "evidenced", signals: [signal({ date: impossible })] }).join("\n"),
      /is not a real calendar day/,
      `${impossible} was accepted`,
    );
  }
});

test("a real leap day is still accepted — the guard rejects impossible days, not February 29th", () => {
  assert.deepEqual(problems({ state: "evidenced", signals: [signal({ date: "2024-02-29" })] }), []);
});

test("isRealDay: the month's own day count decides", () => {
  for (const real of ["2026-01-31", "2026-02-28", "2024-02-29", "2026-04-30", "2026-12-31"]) assert.ok(isRealDay(real), real);
  for (const not of ["2026-02-29", "2026-04-31", "2026-13-01", "2026-00-10", "2026-11-00", "0026-01-01"]) assert.ok(!isRealDay(not), not);
});
