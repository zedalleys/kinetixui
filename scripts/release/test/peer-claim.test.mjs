import assert from "node:assert/strict";
import { it } from "node:test";
import { unpublishedClaimChanges } from "../check-peer-claim.mjs";

const ALLOWLIST = [
  { name: "@kinetixui/ui", directory: "packages/ui" },
  { name: "@kinetixui/angular", directory: "packages/ui-angular" },
];
/** A tree pair: what the base has, and what this branch has. */
const run = (was, now, publishing = []) =>
  unpublishedClaimChanges({
    allowlist: ALLOWLIST,
    base: (f) => (f in was ? JSON.stringify(was[f]) : null),
    here: (f) => now[f] ?? was[f],
    publishing: new Set(publishing),
  });

const NG = "packages/ui-angular/package.json";
const UI = "packages/ui/package.json";
const base = () => ({
  [UI]: { name: "@kinetixui/ui", version: "0.26.0" },
  [NG]: { name: "@kinetixui/angular", version: "0.26.1", peerDependencies: { "@kinetixui/tokens": ">=0.24.0 <0.27.0" } },
});

it("passes when nothing changed", () => {
  assert.deepEqual(run(base(), {}), []);
});

it("catches a widened range on a package the release does not publish", () => {
  // The whole point: release:check passes this, because it reads the repository's manifest.
  const now = { [NG]: { ...base()[NG], peerDependencies: { "@kinetixui/tokens": ">=0.24.0 <0.28.0" } } };
  const found = run(base(), now);
  assert.equal(found.length, 1);
  assert.equal(found[0].package, "@kinetixui/angular");
  assert.equal(found[0].was, ">=0.24.0 <0.27.0");
  assert.equal(found[0].now, ">=0.24.0 <0.28.0");
});

it("allows the same change when that package is in the release", () => {
  const now = { [NG]: { ...base()[NG], peerDependencies: { "@kinetixui/tokens": ">=0.24.0 <0.28.0" } } };
  assert.deepEqual(run(base(), now, ["@kinetixui/angular"]), []);
});

it("catches a narrowed or removed range too, not only a widened one", () => {
  // Narrowing an unpublished claim is the same defect pointed the other way: npm keeps the wider one.
  assert.equal(run(base(), { [NG]: { ...base()[NG], peerDependencies: { "@kinetixui/tokens": ">=0.25.0 <0.27.0" } } }).length, 1);
  assert.equal(run(base(), { [NG]: { ...base()[NG], peerDependencies: {} } }).length, 1);
  assert.equal(run(base(), { [NG]: { ...base()[NG], peerDependencies: { "@kinetixui/tokens": ">=0.24.0 <0.27.0", react: "^19" } } }).length, 1);
});

it("ignores manifest changes that are not peer ranges", () => {
  assert.deepEqual(run(base(), { [NG]: { ...base()[NG], description: "changed", version: "0.26.2" } }), []);
});

it("says nothing about a package that does not exist on the base branch", () => {
  // A package added by this branch has no published claim to contradict.
  const was = base();
  delete was[NG];
  assert.deepEqual(run(was, { [NG]: { name: "@kinetixui/angular", peerDependencies: { "@kinetixui/tokens": ">=0.24.0 <0.28.0" } } }), []);
});
