import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Node, not jsdom: nothing here touches a document. A DOM environment would make it possible to
    // reach for one by accident, in a package whose whole point is that it does not have one.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
