import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { registryItemFor } from "./registry-items";
import { componentDocs } from "./site";

/** Vitest runs with apps/web as the root. */
const registry = JSON.parse(readFileSync("../../registry/registry.json", "utf8")) as { items: { name: string; files?: { path: string }[] }[] };
const items = new Set(registry.items.map((i) => i.name));

describe("registryItemFor", () => {
  it("resolves every component docs page to a registry item that exists", () => {
    for (const c of componentDocs) {
      const slug = c.href.split("/").pop()!;
      expect(items.has(registryItemFor(slug)), `${slug} → /r/${registryItemFor(slug)}.json`).toBe(true);
    }
  });

  it("only redirects pages that are not items themselves", () => {
    expect(items.has("avatar-group")).toBe(false);
    expect(items.has("combobox")).toBe(false);
    expect(registryItemFor("button")).toBe("button");
  });
});
