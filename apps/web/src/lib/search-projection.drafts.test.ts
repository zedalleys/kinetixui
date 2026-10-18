import { describe, expect, it, vi } from "vitest";

// Negative control for the draft rule: a draft block in the manifest must never reach ⌘K.
vi.mock("./blocks", async (importOriginal) => {
  const real = await importOriginal<typeof import("./blocks")>();
  return {
    ...real,
    blocks: [...real.blocks, { slug: "unfinished", title: "Unfinished", description: "d", category: "Forms", status: "draft", platforms: ["React"] }],
  };
});

import { searchProjection } from "./search-projection";

describe("search projection and draft blocks", () => {
  it("leaves a draft block out", () => {
    expect(searchProjection().blocks.map((b) => b.id)).not.toContain("block:unfinished");
  });
});
