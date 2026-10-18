import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { approvalProblems, copyHash, fileCopyText, m1Status, postKey, publicationEvidenceProblems, sectionText } from "./marketing-publication-rules.mjs";

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
  const off = [{ id: "off-001", channel: "linkedin", url: good().liveUrl }];
  assert.match(publicationEvidenceProblems([li005], off).join("\n"), /already the evidence for LI-005/);
});

test("negative control: a channel page that names no single post is not evidence", () => {
  for (const [channel, liveUrl] of [
    ["x", "https://x.com/home"],
    ["x", "https://x.com/zedalleys"],
    ["linkedin", "https://www.linkedin.com/in/zedalleys/"],
    ["linkedin", "https://www.linkedin.com/feed/"],
    ["devto", "https://dev.to/zedalleys"],
    ["devto", "https://dev.to/t/designsystems"],
    ["github", "https://github.com/zedalleys/kinetixui"],
  ]) {
    const row = { ...good(), channel, liveUrl };
    assert.match(publicationEvidenceProblems([row]).join("\n"), /names no single post/, liveUrl);
  }
});

test("negative control: a LinkedIn short link is not evidence (it names no post until resolved)", () => {
  const row = { ...good(), liveUrl: "https://lnkd.in/p/dafq4fNP" };
  assert.match(publicationEvidenceProblems([row]).join("\n"), /not a linkedin host/);
});

test("negative control: one post spelled two ways still cannot evidence two records", () => {
  const a = { ...good(), asset: "X-001", channel: "x", liveUrl: "https://x.com/zedalleys/status/1" };
  const b = { ...a, asset: "X-008", liveUrl: "https://twitter.com/zedalleys/status/1/?utm_source=x#reply" };
  assert.match(publicationEvidenceProblems([a, b]).join("\n"), /already the evidence for X-001/);
  const li = { ...good(), liveUrl: "https://www.linkedin.com/feed/update/urn:li:activity:7513596965998333955/" };
  const off = [{ id: "off-001", channel: "linkedin", url: "https://www.linkedin.com/posts/zedalleys_iot-activity-7513596965998333955-KRhK?trk=x" }];
  assert.match(publicationEvidenceProblems([li], off).join("\n"), /already the evidence for LI-001/);
});

test("postKey ignores query, fragment, trailing slash and www", () => {
  assert.equal(postKey("devto", "https://dev.to/zedalleys/a-post-1/?x=1#c"), postKey("devto", "https://dev.to/zedalleys/a-post-1"));
  assert.equal(postKey("x", "https://www.x.com/u/status/9?s=20"), "x:status:9");
});

test("negative control: a planned row carrying a live URL fails", () => {
  const row = { ...good(), status: "planned", date: null };
  assert.match(publicationEvidenceProblems([row]).join("\n"), /a live post means the row is published/);
});

/** A draft file with two variants, read through the injected reader so the rule stays pure. */
const DRAFT = "# LI-X\n\n## A — default\n\nHook.\n\n---\n\nThe approved words.\n\nSecond line.\n\n---\n\n## B — alternative\n\n---\n\nOther words.\n\n---\n";
const files = (body = DRAFT) => (f) => {
  if (f !== "draft.md") throw new Error("missing");
  return body;
};
const pinned = (over = {}) => ({
  id: "LI-001",
  status: "ready",
  file: "draft.md",
  variant: "A",
  approval: { by: "Ziad", on: "2026-10-18", evidence: "project thread message", copy: { file: "draft.md", section: "A", sha256: copyHash("The approved words.\n\nSecond line.") } },
  ...over,
});

test("approval: absent is fine, a complete approval that pins its words is fine", () => {
  assert.deepEqual(approvalProblems([{ id: "LI-001", status: "ready" }]), []);
  assert.deepEqual(approvalProblems([pinned()], files()), []);
  // an approval from before the pin rule needs no pin
  assert.deepEqual(approvalProblems([{ id: "LI-001", status: "ready", approval: { by: "Ziad", on: "2026-10-17", evidence: "x" } }]), []);
});

test("sectionText takes exactly the span between the --- lines under the heading", () => {
  assert.equal(sectionText(DRAFT, "A"), "The approved words.\n\nSecond line.");
  assert.equal(sectionText(DRAFT, "B"), "Other words.");
  assert.equal(sectionText(DRAFT, "C"), null);
  // trailing whitespace and CRLF do not change the hash; a changed word does
  assert.equal(copyHash("a  \r\nb"), copyHash("a\nb"));
  assert.notEqual(copyHash("a\nb"), copyHash("a\nc"));
});

/** The register-entry layout (content/linkedin.md): a heading, a campaign line, quoted copy, a closing ---. */
const ENTRIES = "# LinkedIn\n\n## LI-007 · P2\n\n> Old post.\n\n---\n\n## LI-008 · P1 · Pillar D\n\n**Campaign:** `c`\n\n> The post.\n\n---\n\n## LI-009 · P2\n\n> Next post.\n\n---\n";

test("sectionText reads a register entry up to its closing ---, never into the next entry", () => {
  assert.equal(sectionText(ENTRIES, "LI-008"), "**Campaign:** `c`\n\n> The post.");
  assert.equal(sectionText(ENTRIES, "LI-009"), "> Next post.");
  assert.equal(sectionText(ENTRIES, "LI-00"), null);
  const pin = { id: "LI-008", status: "ready", file: "draft.md", approval: { by: "Ziad", on: "2026-10-19", evidence: "x", copy: { file: "draft.md", section: "LI-008", sha256: copyHash("**Campaign:** `c`\n\n> The post.") } } };
  assert.deepEqual(approvalProblems([pin], files(ENTRIES)), []);
  // editing the neighbouring entry leaves the approval intact; editing this one breaks it
  assert.deepEqual(approvalProblems([pin], files(ENTRIES.replace("Next post.", "Changed."))), []);
  assert.match(approvalProblems([pin], files(ENTRIES.replace("The post.", "The edited post."))).join("\n"), /changed after approval/);
});

test("an approval with no section pins the whole file after its front matter (a thread file)", () => {
  const thread = "---\nid: a01\nstatus: ready\n---\n\n# X\n\n**1/**\n\nFirst.\n\n---\n\n**2/**\n\nSecond.\n";
  assert.equal(fileCopyText(thread).startsWith("# X"), true);
  const pin = { id: "X-001", status: "ready", file: "draft.md", approval: { by: "Ziad", on: "2026-10-19", evidence: "x", copy: { file: "draft.md", sha256: copyHash(fileCopyText(thread)) } } };
  assert.deepEqual(approvalProblems([pin], files(thread)), []);
  // front matter is metadata: changing status does not change the approved words
  assert.deepEqual(approvalProblems([pin], files(thread.replace("status: ready", "status: published"))), []);
  assert.match(approvalProblems([pin], files(thread.replace("Second.", "Second, edited."))).join("\n"), /approved copy \(draft\.md\) changed after approval/);
  assert.match(approvalProblems([{ ...pin, approval: { ...pin.approval, copy: { ...pin.approval.copy, section: " " } } }], files(thread)).join("\n"), /optional non-empty section/);
});

test("the real content register's approvals pin copy that still matches", () => {
  const register = JSON.parse(readFileSync("marketing/content/register.json", "utf8"));
  assert.deepEqual(approvalProblems(register.assets, (f) => readFileSync(f, "utf8")), []);
  const li001 = register.assets.find((a) => a.id === "LI-001");
  assert.ok(li001.approval?.copy, "LI-001's approval pins its words");
});

test("negative control: an approval from 2026-10-18 without the approved words pinned fails", () => {
  const unpinned = pinned();
  delete unpinned.approval.copy;
  assert.match(approvalProblems([unpinned], files()).join("\n"), /must pin the approved words/);
});

test("negative control: a pin must cover this asset's own words, not some other stable text", () => {
  const p = pinned().approval.copy;
  // another file, even one whose text matches the hash
  const other = pinned({ approval: { ...pinned().approval, copy: { ...p, file: "notes.md" } } });
  assert.match(approvalProblems([other], () => DRAFT).join("\n"), /pins notes\.md, but this asset's copy is draft\.md/);
  // another section of the right file (B, the variant that is not being approved)
  const b = pinned({ approval: { ...pinned().approval, copy: { ...p, section: "B", sha256: copyHash("Other words.") } } });
  assert.match(approvalProblems([b], files()).join("\n"), /pins section "B", but this asset's copy is section "A"/);
  // a register entry pinned to its neighbour
  const entry = { id: "LI-008", status: "ready", file: "draft.md", approval: { by: "Ziad", on: "2026-10-19", evidence: "x", copy: { file: "draft.md", section: "LI-007", sha256: copyHash("> Old post.") } } };
  assert.match(approvalProblems([entry], files(ENTRIES)).join("\n"), /pins section "LI-007", but this asset's copy is section "LI-008"/);
  // a whole-file pin where the asset is one entry of the file
  const whole = { ...entry, approval: { ...entry.approval, copy: { file: "draft.md", sha256: copyHash(fileCopyText(ENTRIES)) } } };
  assert.match(approvalProblems([whole], files(ENTRIES)).join("\n"), /pins the whole file, but this asset's copy is section "LI-008"/);
  // a shared file with no variant cannot say which section is this asset's
  const { variant, ...noVariant } = pinned();
  assert.match(approvalProblems([noVariant, { id: "LI-002", status: "ready", file: "draft.md" }], files()).join("\n"), /holds other assets too — set "variant"/);
});

test("negative control: copy edited after approval fails, even by one word", () => {
  const edited = DRAFT.replace("The approved words.", "The improved words.");
  assert.match(approvalProblems([pinned()], files(edited)).join("\n"), /changed after approval/);
  // editing ANOTHER variant in the same file does not touch the approval
  assert.deepEqual(approvalProblems([pinned()], files(DRAFT.replace("Other words.", "New words."))), []);
});

test("negative control: a pin to a missing section or file fails", () => {
  assert.match(approvalProblems([pinned({ variant: "Z", approval: { ...pinned().approval, copy: { ...pinned().approval.copy, section: "Z" } } })], files()).join("\n"), /section "Z" is not in/);
  assert.match(approvalProblems([pinned({ file: "gone.md", approval: { ...pinned().approval, copy: { ...pinned().approval.copy, file: "gone.md" } } })], files()).join("\n"), /cannot be read/);
  assert.match(approvalProblems([pinned({ approval: { ...pinned().approval, copy: { file: "draft.md", section: "A", sha256: "abc" } } })], files()).join("\n"), /sha256 hex digest/);
});

test("negative control: copy flagged stale cannot be approved, and a stale flag must say why and since when", () => {
  const stale = pinned({ stale: { reason: "states 98 entries; the catalogue is 109", since: "2026-10-18" } });
  assert.match(approvalProblems([stale], files()).join("\n"), /approval on copy flagged stale/);
  assert.equal(m1Status(stale, []), "READY FOR REVIEW");
  assert.match(approvalProblems([{ id: "X-002", status: "drafted", stale: { reason: "" } }]).join("\n"), /stale must be/);
  // a published asset can be flagged stale (the live copy aged) without that being an approval problem
  assert.deepEqual(approvalProblems([{ id: "ART-001", status: "published", stale: { reason: "today paragraph", since: "2026-10-18" } }]), []);
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
