import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { approvalProblems, m1Status, publicationEvidenceProblems } from "./marketing-publication-rules.mjs";

/** A row that passes every rule. Each negative control below breaks exactly one thing. */
const good = () => ({
  asset: "LI-001",
  day: 16,
  channel: "linkedin",
  date: "2026-10-19",
  status: "published",
  liveUrl: "https://www.linkedin.com/feed/update/urn:li:activity:1/",
});

test("a published row with a live post on its own channel passes", () => {
  assert.deepEqual(publicationEvidenceProblems([good()]), []);
});

test("the real distribution register passes", () => {
  const register = JSON.parse(readFileSync("marketing/distribution/register.json", "utf8"));
  assert.deepEqual(publicationEvidenceProblems(register.rows, register.offCalendar), []);
});

test("negative control: published on or after the cutoff with no liveUrl fails, even with a gap note", () => {
  const row = { ...good(), liveUrl: null, liveUrlGap: "the author said it went out" };
  assert.match(publicationEvidenceProblems([row]).join("\n"), /live post URL is required/);
});

test("negative control: a historical row may name a gap, but not leave it empty", () => {
  const ok = { ...good(), date: "2026-10-03", liveUrl: null, liveUrlGap: "not recorded at close-out" };
  assert.deepEqual(publicationEvidenceProblems([ok]), []);
  assert.match(publicationEvidenceProblems([{ ...ok, liveUrlGap: " " }]).join("\n"), /no liveUrlGap/);
});

test("negative control: a published row without the liveUrl field fails", () => {
  const { liveUrl, ...row } = good();
  assert.match(publicationEvidenceProblems([row]).join("\n"), /no liveUrl field/);
});

test("negative control: our own destination URL is not publication evidence", () => {
  const row = { ...good(), liveUrl: "https://kinetixui.com/docs/platforms?utm_source=linkedin" };
  assert.match(publicationEvidenceProblems([row]).join("\n"), /not a linkedin host/);
});

test("negative control: a post on another channel is not evidence for this one", () => {
  const row = { ...good(), liveUrl: "https://x.com/zedalleys/status/1" };
  assert.match(publicationEvidenceProblems([row]).join("\n"), /not a linkedin host/);
});

test("negative control: the same asset published twice on one channel fails", () => {
  const second = { ...good(), date: "2026-10-26", liveUrl: "https://www.linkedin.com/feed/update/urn:li:activity:2/" };
  assert.match(publicationEvidenceProblems([good(), second]).join("\n"), /already logged as published on linkedin/);
});

test("negative control: one post cannot be the evidence for two records (the LI-005 failure)", () => {
  const li005 = { ...good(), asset: "LI-005", day: 9 };
  const off = [{ id: "off-001", url: good().liveUrl }];
  assert.match(publicationEvidenceProblems([li005], off).join("\n"), /already the evidence for LI-005/);
});

test("negative control: a planned row carrying a live URL fails", () => {
  const row = { ...good(), status: "planned", date: null };
  assert.match(publicationEvidenceProblems([row]).join("\n"), /a live post means the row is published/);
});

test("approval: absent is fine, a complete approval on ready copy is fine", () => {
  assert.deepEqual(approvalProblems([{ id: "LI-001", status: "ready" }]), []);
  const approved = { id: "LI-001", status: "ready", approval: { by: "Ziad", on: "2026-10-18", evidence: "project thread message" } };
  assert.deepEqual(approvalProblems([approved]), []);
});

test("negative control: approval needs a person, a date, evidence, and ready copy", () => {
  const out = approvalProblems([
    { id: "A", status: "drafted", approval: { by: "Ziad", on: "2026-10-18", evidence: "x" } },
    { id: "B", status: "ready", approval: { on: "2026-10-18", evidence: "x" } },
    { id: "C", status: "ready", approval: { by: "Ziad", on: "soon", evidence: "x" } },
    { id: "D", status: "ready", approval: { by: "Ziad", on: "2026-10-18" } },
  ]).join("\n");
  assert.match(out, /A: approval on a "drafted" asset/);
  assert.match(out, /B: approval has no "by"/);
  assert.match(out, /C: approval "on" is not YYYY-MM-DD/);
  assert.match(out, /D: approval has no "evidence"/);
});

test("m1Status derives from both registers and never invents SCHEDULED or APPROVED", () => {
  assert.equal(m1Status({ id: "A", status: "ready" }, [{ asset: "A", status: "blocked" }]), "BLOCKED");
  assert.equal(m1Status({ id: "A", status: "ready" }, [{ asset: "A", status: "planned" }]), "READY FOR REVIEW");
  assert.equal(m1Status({ id: "A", status: "ready", approval: { by: "Z" } }, []), "APPROVED");
  assert.equal(m1Status({ id: "A", status: "published" }, []), "PUBLISHED");
  assert.equal(m1Status({ id: "A", status: "drafted" }, []), "DRAFTED");
  assert.equal(m1Status({ id: "A", status: "brief" }, []), "PLANNED");
  assert.equal(m1Status({ id: "A", status: "ready" }, [{ asset: "A", status: "skipped" }]), "CANCELLED");
});
