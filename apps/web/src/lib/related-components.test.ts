import { describe, expect, it } from "vitest";
import { RELATED, relatedComponents } from "./related-components";
import { componentDocs } from "./site";

const SLUGS = componentDocs.map((i) => i.href.split("/").pop()!);

describe("related components", () => {
  it("names only real component pages, never the page itself", () => {
    for (const [from, to] of Object.entries(RELATED)) {
      expect(SLUGS, `${from} is not a component page`).toContain(from);
      for (const s of to) {
        expect(SLUGS, `${from} → ${s} is not a component page`).toContain(s);
        expect(s).not.toBe(from);
      }
    }
  });

  it("follows the brief's families", () => {
    expect(relatedComponents("dialog").map((c) => c.slug)).toEqual(["alert-dialog", "modal", "sheet", "drawer"]);
    expect(relatedComponents("select").map((c) => c.slug)).toEqual(["native-select", "combobox", "multi-select", "command"]);
    expect(relatedComponents("input").map((c) => c.slug)).toEqual(["input-group", "textarea", "password-input", "number-input"]);
  });

  it("gives every component page related links, and every page at least one inbound one", () => {
    const inbound = new Map(SLUGS.map((s) => [s, 0]));
    for (const s of SLUGS) {
      const related = relatedComponents(s);
      expect(related.length, s).toBeGreaterThan(0);
      expect(new Set(related.map((c) => c.slug)).size).toBe(related.length);
      for (const c of related) {
        expect(c.href).toBe(`/docs/components/${c.slug}`);
        inbound.set(c.slug, inbound.get(c.slug)! + 1);
      }
    }
    expect([...inbound].filter(([, n]) => n === 0).map(([s]) => s)).toEqual([]);
  });

  it("returns nothing for an unknown slug", () => {
    expect(relatedComponents("not-a-component")).toEqual([]);
  });
});
