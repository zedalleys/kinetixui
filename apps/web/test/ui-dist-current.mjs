/**
 * The web suite measures the BUILT @kinetixui/ui, so refuse to run against a stale build.
 *
 * `apps/web` depends on `@kinetixui/ui` by its package name, and that package's `exports` map resolves
 * to `packages/ui/dist/index.js`. So every test here that renders a library component — the create
 * scenes, the block fixtures — asserts over the last build of that package, not over the source in the
 * working tree. When the two disagree the suite reports it as a product failure: `create-spacing.test.tsx`
 * looks for the three `[data-kx-metric-pair]` rows `Metric` emits and finds none, which reads as a
 * regression in `Metric` when nothing about `Metric` has changed. A developer who trusts that message
 * goes looking for a defect in the component, or deletes a test that is in fact correct.
 *
 * `scripts/ui-dist-stamp.mjs` already answers exactly this question for the browser evidence scripts, and
 * for the same reason. This is that guard on the one other consumer of `dist` that was missing it. It runs
 * once per suite rather than per file, and it throws rather than calling the script's `process.exit`,
 * so vitest attributes the failure instead of losing a worker.
 *
 * `turbo.json` carries the matching half: `@kinetixui/web#test` takes `^build`, so `turbo run test`
 * builds the package before measuring it. That cannot cover `pnpm --filter @kinetixui/web test` or a
 * bare `vitest run`, which bypass turbo entirely — which is what this guard is for. (CI is already
 * safe by accident: `ci.yml` runs `pnpm build:ui` several steps before the web test step.)
 *
 * Note this says nothing about whether the build is CORRECT — only that it corresponds to the inputs
 * here. A green suite over a matching build is still evidence about compiled output, not about source.
 */
import { existsSync, readFileSync } from "node:fs";
import { STAMP, sourceHash } from "../../../scripts/ui-dist-stamp.mjs";

const REBUILD =
  "Run `pnpm build:ui` (or `pnpm -F @kinetixui/ui build`) and run the suite again.";

export default function setup() {
  if (!existsSync(STAMP)) {
    throw new Error(
      "@kinetixui/web tests: packages/ui/dist carries no source stamp, so the components these tests " +
        `render cannot be shown to match the source in this tree. ${REBUILD}`,
    );
  }
  const recorded = JSON.parse(readFileSync(STAMP, "utf8")).sourceHash;
  const actual = sourceHash();
  if (recorded !== actual) {
    throw new Error(
      "@kinetixui/web tests: packages/ui/dist was built from different inputs than this working tree, " +
        "so a failure here could be about code that is no longer in the repository.\n" +
        `  dist was built from  ${recorded.slice(0, 12)}\n` +
        `  the inputs here are  ${actual.slice(0, 12)}\n` +
        `${REBUILD}`,
    );
  }
}
