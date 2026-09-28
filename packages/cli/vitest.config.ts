import { defineConfig } from "vitest/config";

/**
 * The CLI had no tests at all until Phase 0.5, which is why this file is new.
 *
 * ## Why `jsdom` is a devDependency of a node-only suite
 *
 * It is not used. Every test here runs in the `node` environment — the CLI's job is files, subprocesses and
 * HTTP, and nothing renders.
 *
 * It is declared because of a resolution quirk in this workspace: with no environment peer present, pnpm
 * resolved `vitest` for this package to a bare `vitest@5.0.1` store entry with no peer suffix, and that
 * directory is **empty** — no `bin`, so `vitest` could not run at all while appearing installed.
 * `packages/iot` and `apps/web` both declare `jsdom` and both get a complete, peer-resolved instance.
 * Declaring it here matches them and makes the binary resolve.
 *
 * If a future pnpm makes this unnecessary, remove it — but only after confirming
 * `pnpm --filter @kinetixui/cli test` still runs, because the failure mode is a missing binary rather than
 * a failing test, which reads like the suite simply is not there.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
