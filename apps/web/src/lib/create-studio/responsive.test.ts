import { describe, expect, it } from "vitest";
import { execute, newHistory, redo, undo } from "./commands";
import { exportReact } from "./export";
import { createDocument, findNode, migrateDocument, parseDocument, serializeDocument, validateDocument } from "./model";
import { nodeStyle } from "./presentation";

function setup() {
  const base = newHistory(createDocument("proj_responsive01", "Responsive"));
  const history = execute(base, { type: "insert", parentId: "node_2", ref: "layout:stack" });
  return { history, id: history.selection[0] };
}

describe("responsive layout contract", () => {
  it("migrates stored v2 without changing values, identities, or base-only layout", () => {
    const { history } = setup();
    const old = { ...history.doc, schemaVersion: 2 };
    const current = migrateDocument(old);
    expect(current).toEqual(history.doc);
    expect(exportReact(current).theme).not.toContain("@media (min-width:");
    expect(parseDocument(serializeDocument(current))).toEqual(current);
  });

  it("cascades matching breakpoints per property and resets via command history", () => {
    const { history, id } = setup();
    const tablet = execute(history, { type: "responsive", id, breakpoint: "tablet", property: "axis", value: "row" });
    const desktop = execute(tablet, { type: "responsive", id, breakpoint: "desktop", property: "gap", value: "spacing.8" });
    const node = findNode(desktop.doc, id)!;
    expect([767, 768, 769, 959, 960, 961].map(width => {
      const { flexDirection, gap } = nodeStyle(node, width);
      return [flexDirection, gap];
    })).toEqual([["column", 16], ["row", 16], ["row", 16], ["row", 16], ["row", 32], ["row", 32]]);
    const reset = execute(desktop, { type: "responsive", id, breakpoint: "desktop", property: "gap" });
    expect(findNode(reset.doc, id)?.responsive).toEqual({ tablet: { axis: "row" } });
    expect(undo(reset).doc).toEqual(desktop.doc);
    expect(redo(undo(reset)).doc).toEqual(reset.doc);
    expect(parseDocument(serializeDocument(desktop.doc))).toEqual(desktop.doc);
    expect(exportReact(desktop.doc)).toEqual(exportReact(parseDocument(serializeDocument(desktop.doc))));
    expect(exportReact(desktop.doc).source.match(/data-kx-layout/g)).toHaveLength(1);
  });

  it("rejects unknown breakpoints, ineligible properties and invalid or executable values", () => {
    const { history, id } = setup();
    expect(() => execute(history, { type: "responsive", id, breakpoint: "tablet", property: "gap", value: "0;display:none" })).toThrow("Invalid option");
    expect(() => execute(history, { type: "responsive", id, breakpoint: "desktop", property: "width", value: 960 })).toThrow("Unsupported responsive property");
    const doc = structuredClone(history.doc);
    Object.assign(findNode(doc, id)!, { responsive: { mobile: { gap: "spacing.4" } } });
    expect(validateDocument(doc).ok).toBe(false);
    expect(() => exportReact(doc)).toThrow();
  });
});
