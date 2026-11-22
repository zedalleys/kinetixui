import { describe, expect, it } from "vitest";
import { createDocument } from "./model";
import { newHistory, execute } from "./commands";
import { exportReact } from "./export";
import { ADAPTERS } from "./registry";
describe("deterministic real-library React page compiler", () => {
  it("exports each supported adapter with actual imports and safe text", () => {
    let h = newHistory(createDocument("proj_exporttest", "Export"));
    for (const ref of Object.keys(ADAPTERS)) h = execute(h, { type: "insert", parentId: "node_2", ref });
    h = execute(h, { type: "insert", parentId: "node_2", ref: "component:Button" });
    h = execute(h, { type: "props", ids: h.selection, patch: { text: '</script><img src=x onerror="alert(1)">' } });
    const a = exportReact(h.doc), b = exportReact(h.doc);
    expect(a).toEqual(b);
    expect(a.source).toContain('from "@kinetixui/ui"');
    expect(a.source).toContain("Button");
    expect(a.source).toContain("\\u003c/script>");
    expect(a.source).not.toContain("<img");
    expect(a.source).not.toContain(" onClick=");
    // The text is JSON data, never a generated event prop.
    expect(a.source).toContain("style={{");
  });
  it("fails closed on unsupported nodes/props rather than plausible output", () => {
    const d = createDocument("proj_exporttest", "Export");
    d.pages[0].root.children![0].ref = "layout:canvas";
    expect(() => exportReact(d)).toThrow();
  });
});
