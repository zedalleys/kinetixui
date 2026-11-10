import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    // These tests render real @kinetixui/ui components, and the package name resolves to
    // packages/ui/dist — so a stale build turns into what looks like a product regression here.
    // See test/ui-dist-current.mjs.
    globalSetup: ["./test/ui-dist-current.mjs"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
