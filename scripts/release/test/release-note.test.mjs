import assert from "node:assert/strict";
import { it } from "node:test";
import { noteErrors, linkErrors } from "../check-release-note.mjs";

/** A note that is fit to be injected, so each case below changes exactly one thing. */
const good = () => ({
  version: "0.27.0",
  summary: "What this release is about.",
  breaking: [],
  changes: [{ kind: "accessibility", area: "components", title: "A title", body: "A body." }],
});
const errs = (mutate) => {
  const note = good();
  mutate(note);
  return noteErrors(note, "0.27.0", "release/notes/0.27.0.json");
};

it("accepts a well-formed note", () => {
  assert.deepEqual(errs(() => {}), []);
});

it("rejects a note describing another version", () => {
  // version-release-meta.mjs asserts this itself and throws after the merge; catching it here is
  // the whole point of the gate.
  assert.equal(errs((n) => (n.version = "0.26.9")).length, 1);
});

it("requires summary, breaking and a non-empty changes list", () => {
  assert.equal(errs((n) => delete n.breaking).length, 1);
  assert.equal(errs((n) => (n.summary = "   ")).length, 1);
  assert.equal(errs((n) => (n.changes = [])).length, 1);
  assert.equal(errs((n) => delete n.changes).length, 1);
});

it("rejects a hand-written date", () => {
  // The publishing run stamps entry.date with its own UTC day, and scripts/release/dates.mjs
  // refuses first publication unless it matches. A date written here is overwritten or misleading.
  assert.equal(errs((n) => (n.date = "2026-10-25")).length, 1);
});

it("holds changes to the vocabulary releases.ts declares", () => {
  assert.equal(errs((n) => (n.changes[0].kind = "tweak")).length, 1);
  assert.equal(errs((n) => (n.changes[0].area = "widgets")).length, 1);
  assert.equal(errs((n) => delete n.changes[0].title).length, 1);
  assert.deepEqual(errs((n) => (n.changes[0].area = ["components", "tokens"])), []);
});

it("preserves the supported optional metadata rather than rejecting what it does not know", () => {
  assert.deepEqual(
    errs((n) => {
      n.migration = "Replace x with y.";
      n.limitations = ["Still React-only."];
      n.newComponents = [{ group: "Forms", slugs: ["date-picker"] }];
      n.githubReleaseUrl = "https://github.com/zedalleys/kinetixui/releases/tag/v0.27.0";
      n.changes[0].href = "/docs/components/date-picker";
      n.someFutureField = 1;
    }),
    [],
  );
});

it("rejects a githubReleaseUrl that names a different version", () => {
  assert.equal(errs((n) => (n.githubReleaseUrl = "https://github.com/zedalleys/kinetixui/releases/tag/v0.26.0")).length, 1);
  assert.equal(errs((n) => (n.githubReleaseUrl = "https://example.com/v0.27.0")).length, 1);
});

it("accepts a site-absolute route or an absolute URL as a link, and nothing else", () => {
  // Resolving a route to a real page is check:release-links, which needs a built site.
  assert.deepEqual(linkErrors("/docs/components/date-picker", "href"), []);
  assert.deepEqual(linkErrors("https://kinetixui.com/docs", "href"), []);
  assert.equal(linkErrors("docs/date-picker", "href").length, 1);
  assert.equal(linkErrors("", "href").length, 1);
  assert.equal(linkErrors(undefined, "href").length, 1);
});
