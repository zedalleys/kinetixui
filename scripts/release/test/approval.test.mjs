import assert from "node:assert/strict";
import { it } from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { assertApproved } from "../approval.mjs";
import { readPendingChangesets } from "../peers.mjs";

const environment = "publish-npm";
const approvedBy = (login, name = environment) => ({ state: "approved", comment: "", user: { login }, environments: [{ name }] });
const refused = (reviews) => assertApproved(reviews, { environment });

it("accepts one named approval of this environment", () => {
  const verdict = refused([approvedBy("zedalleys")]);
  assert.equal(verdict.ok, true);
  assert.deepEqual(verdict.approvers, ["zedalleys"]);
});

// The case that matters most, and the reason this script exists rather than trusting `environment:`
// alone: an environment that does not exist is created unprotected on first reference and the job
// runs with nobody having approved anything. That produces exactly this history.
it("refuses a run with no approvals at all", () => {
  assert.equal(refused([]).ok, false);
});

it("refuses an approval of some other environment", () => {
  assert.equal(refused([approvedBy("zedalleys", "preview")]).ok, false);
});

it("refuses a rejection, and refuses a history holding both", () => {
  assert.equal(refused([{ state: "rejected", user: { login: "zedalleys" }, environments: [{ name: environment }] }]).ok, false);
  assert.equal(refused([approvedBy("zedalleys"), { state: "rejected", user: { login: "zedalleys" }, environments: [{ name: environment }] }]).ok, false);
});

it("refuses an approval with no user, and a pending one", () => {
  assert.equal(refused([{ state: "approved", environments: [{ name: environment }] }]).ok, false);
  assert.equal(refused([{ state: "pending", user: { login: "zedalleys" }, environments: [{ name: environment }] }]).ok, false);
});

// Anything this cannot read is a refusal. A gate that returns "yes" for a shape it did not expect
// is not a gate, and the shape here comes from an API response.
it("refuses every unreadable shape rather than interpreting it", () => {
  for (const shape of [null, undefined, {}, "approved", 0, [null], [{ state: "approved", user: { login: "zedalleys" } }], [{ state: "approved", user: { login: "zedalleys" }, environments: "publish-npm" }]]) {
    assert.equal(assertApproved(shape, { environment }).ok, false, `${JSON.stringify(shape)} must not be read as an approval`);
  }
});

it("reports every approver once when several approve", () => {
  const verdict = refused([approvedBy("zedalleys"), approvedBy("zedalleys"), approvedBy("someone-else")]);
  assert.equal(verdict.ok, true);
  assert.deepEqual(verdict.approvers, ["zedalleys", "someone-else"]);
});

// The fact the two release paths key off. Both jobs compare it positively, so this answer decides
// which one runs and a wrong answer stalls a release rather than publishing one.
//
// `pending.mjs` deliberately has no rule of its own: it reads this, the same function the release
// plan and the peer-range checks use. Asserted here against real directories because a second rule
// that disagreed with this one is exactly the defect the delegation exists to prevent.
const changesetDir = (entries) => {
  const root = mkdtempSync(path.join(tmpdir(), "kinetixui-pending-"));
  mkdirSync(path.join(root, ".changeset"));
  for (const [name, body] of Object.entries(entries)) writeFileSync(path.join(root, ".changeset", name), body);
  return root;
};
const bump = '---\n"@kinetixui/ui": minor\n---\n\nsomething\n';

it("reports no pending changesets for a directory holding only its own furniture", () => {
  assert.deepEqual(readPendingChangesets(changesetDir({ "README.md": "# changesets", "config.json": "{}" })), []);
});

it("reports every pending changeset, sorted, and is not fooled by the README's casing", () => {
  const root = changesetDir({ "README.md": "# changesets", "config.json": "{}", "two-cats.md": bump, "a-dog.md": bump, "ReadMe.MD": "# not a changeset" });
  assert.deepEqual(readPendingChangesets(root).map((entry) => entry.id), ["a-dog", "two-cats"]);
});
