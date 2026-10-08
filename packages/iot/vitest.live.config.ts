import { defineConfig } from "vitest/config";

/**
 * Manual live-provider evidence run (M4C-B). Never part of `test` or CI: it needs an authorized Home
 * Assistant instance and switches a real device. See reference/home-assistant/live/live-provider.e2e.ts.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["reference/home-assistant/live/live-provider.e2e.ts"],
    testTimeout: 120_000,
    hookTimeout: 30_000,
  },
});
