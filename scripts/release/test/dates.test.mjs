import assert from "node:assert/strict";
import { it } from "node:test";
import { releaseDateErrors } from "../dates.mjs";
const core = { version: "0.24.1", releaseGroup: "core" };
const source = 'export const RELEASES: Release[] = [\n  {\n    version: "0.24.1",\n    date: "2026-10-13",\n  },\n];';
const plan = { publish: [core], alreadyPublished: [] };
it("allows first core publication on the notes' UTC date", () => {
  assert.deepEqual(releaseDateErrors({ plan, source, today: "2026-10-13" }), []);
});
it("blocks stale or missing notes before any upload", () => {
  assert.equal(releaseDateErrors({ plan, source, today: "2026-10-14" }).length, 1);
  assert.equal(releaseDateErrors({ plan, source: "", today: "2026-10-13" }).length, 1);
});
it("keeps dates intact during partial publication recovery", () => {
  assert.deepEqual(releaseDateErrors({ plan: { ...plan, alreadyPublished: [core] }, source, today: "2026-10-14" }), []);
});
it("does not apply core dates to an independent Angular release", () => {
  assert.deepEqual(releaseDateErrors({ plan: { publish: [{ releaseGroup: "angular" }], alreadyPublished: [] }, source: "" }), []);
});
