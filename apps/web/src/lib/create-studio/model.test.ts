import { describe, expect, it } from "vitest";
import minimal from "../../../../../docs/create/fixtures/v1/minimal.json";
import { createDocument, parseDocument, serializeDocument, validateDocument, migrateDocument, findNode } from "./model";
import { execute, newHistory, undo, redo } from "./commands";
import { exportReact } from "./export";
import { ADAPTERS, catalogueContains } from "./registry";
const create = () => createDocument("proj_testmodel1", "Test", "2026-11-11T00:00:00Z");
describe("CreateProject v2 is a canonical v1 extension", () => {
  it("creates and byte-stably round-trips a document", () => {
    const doc = create();
    expect(validateDocument(doc)).toEqual({ ok: true, errors: [] });
    expect(serializeDocument(parseDocument(serializeDocument(doc)))).toBe(serializeDocument(doc));
    expect(serializeDocument({ b: 1, a: 2 })).toBe(serializeDocument({ a: 2, b: 1 }));
  });
  it("migrates a real stored v1 fixture without changing its identities/frontier", () => {
    const migrated = migrateDocument(minimal);
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.pages).toEqual(minimal.pages);
    expect(migrated.nextNodeId).toBe(minimal.nextNodeId);
    expect(migrateDocument(migrated)).toEqual(migrated);
    expect(minimal.schemaVersion).toBe(1);
  });
  it("refuses missing/future/gapped versions and unsupported legacy content", () => {
    expect(() => migrateDocument({ ...minimal, schemaVersion: 99 })).toThrow("Unsupported schema version");
    expect(() => migrateDocument({ ...minimal, schemaVersion: 0 })).toThrow();
    expect(() => migrateDocument({})).toThrow("Missing schema version");
    const doc = create(); doc.pages[0].root.children![0].ref = "component:Unknown";
    expect(validateDocument(doc).ok).toBe(false);
  });
  it("rejects duplicate IDs, unknown parents and circular/shared object references", () => {
    const doc = create(); doc.pages[0].root.children!.push(structuredClone(doc.pages[0].root.children![0]));
    expect(validateDocument(doc).errors.join()).toContain("node-id-duplicate");
    const circular = create(); circular.pages[0].root.children!.push(circular.pages[0].root);
    expect(validateDocument(circular).errors.join()).toContain("Circular");
    expect(() => execute(newHistory(create()), { type: "insert", parentId: "node_missing", ref: "component:Button" })).toThrow("legal container");
  });
  it("rejects executable values, dangerous keys, wrong props, nonfinite numbers and unsupported layouts", () => {
    const doc = create();
    doc.pages[0].root.children![0].props = { onClick: "alert(1)" };
    expect(validateDocument(doc).ok).toBe(false);
    expect(validateDocument(JSON.parse('{"constructor":{}}')).ok).toBe(false);
    expect(() => serializeDocument({ code: () => 1 })).toThrow();
    expect(() => serializeDocument({ value: NaN })).toThrow();
    doc.pages[0].root.children![0].ref = "layout:unknown";
    expect(validateDocument(doc).ok).toBe(false);
  });
  it("resolves all enabled adapters against actual catalogue and layout registry", () => {
    for (const ref of Object.keys(ADAPTERS)) expect(catalogueContains(ref), ref).toBe(true);
  });
});
describe("command history and permanent identity retirement", () => {
  it("adds, edits, reorders and nests without uncontrolled mutation", () => {
    const doc = create();
    let h = execute(newHistory(doc), { type: "insert", ref: "component:Button", parentId: "node_2" });
    const id = h.selection[0];
    h = execute(h, { type: "props", ids: [id], patch: { text: "Done" } });
    expect(findNode(h.doc, id)?.props?.text).toBe("Done");
    expect(doc.nextNodeId).toBe(3);
    h = execute(h, { type: "insert", ref: "component:Badge", parentId: "node_2" });
    const badge = h.selection[0];
    h = execute(h, { type: "move", ids: [badge], parentId: "node_2", index: 0 });
    expect(findNode(h.doc, "node_2")?.children?.[0].id).toBe(badge);
    expect(undo(h).doc.pages[0].root.children![0].children![1].id).toBe(badge);
  });
  it("deletes/undoes/redoes with consistent selection and no retired ID reuse", () => {
    let h = execute(newHistory(create()), { type: "insert", ref: "component:Button", parentId: "node_2" });
    const id = h.selection[0];
    h = execute(h, { type: "delete", ids: [id] });
    expect(h.selection).toEqual([]);
    expect(h.doc.retiredNodeIds).toContain(id);
    h = undo(h);
    expect(h.selection[0]).not.toBe(id);
    expect(findNode(h.doc, h.selection[0])?.ref).toBe("component:Button");
    expect(validateDocument(h.doc).ok).toBe(true);
    h = redo(h);
    expect(findNode(h.doc, "node_2")?.children).toEqual([]);
    expect(validateDocument(h.doc).ok).toBe(true);
  });
  it("rejects ancestor-to-descendant moves, leaf children, invalid props and root deletion", () => {
    const h = execute(newHistory(create()), { type: "insert", ref: "layout:stack", parentId: "node_2" });
    expect(() => execute(h, { type: "move", ids: ["node_2"], parentId: h.selection[0], index: 0 })).toThrow("descendant");
    expect(() => execute(h, { type: "delete", ids: ["node_1"] })).toThrow("roots");
    const b = execute(h, { type: "insert", ref: "component:Button", parentId: h.selection[0] });
    expect(() => execute(b, { type: "insert", ref: "component:Input", parentId: b.selection[0] })).toThrow("container");
    expect(() => execute(b, { type: "props", ids: b.selection, patch: { variant: "invented" } })).toThrow("Invalid option");
  });
  it("carries restored identity across older property history and redo", () => {
    let h = execute(newHistory(create()), { type: "insert", ref: "component:Button", parentId: "node_2" });
    const original = h.selection[0];
    h = execute(h, { type: "props", ids: [original], patch: { text: "Changed" } });
    h = execute(h, { type: "delete", ids: [original] });
    h = undo(h);
    const restored = h.selection[0];
    const frontier = h.doc.nextNodeId;
    h = undo(h);
    expect(findNode(h.doc, restored)?.props?.text).toBe("Continue");
    expect(h.doc.nextNodeId).toBe(frontier);
    h = redo(h);
    expect(findNode(h.doc, restored)?.props?.text).toBe("Changed");
    expect(h.doc.nextNodeId).toBe(frontier);
    expect(h.doc.retiredNodeIds).not.toContain(restored);
  });
  it("preserves value-equal Figma bindings through unrelated undo/redo", () => {
    const d = create();
    d.figmaBinding = { fileKey: "abcdefgh", pageNodeId: "1:2", nodeIds: { page_home: "1:3" }, lastSyncedAt: "2026-11-11T00:00:00Z", lastSyncedDigest: "sha256:" + "a".repeat(64) };
    const h = execute(newHistory(d), { type: "rename", name: "Renamed" });
    expect(undo(h).doc.figmaBinding).toEqual(d.figmaBinding);
    expect(redo(undo(h)).doc.figmaBinding).toEqual(d.figmaBinding);
  });
  it("changing one surface keeps every selected node's own foreground", () => {
    // A Surface token change must patch only `background`. It used to replace each selected node's
    // whole tokenBindings object with a copy of the PRIMARY node's, so a mixed selection lost its
    // per-node foreground; and clearing the surface deleted foreground too, even for one node.
    const doc = create();
    let h = execute(newHistory(doc), { type: "insert", ref: "component:Button", parentId: "node_2" });
    const a = h.selection[0];
    h = execute(h, { type: "insert", ref: "component:Badge", parentId: "node_2" });
    const b = h.selection[0];
    findNode(h.doc, a)!.tokenBindings = { background: "color.card", foreground: "color.foreground" };
    findNode(h.doc, b)!.tokenBindings = { background: "color.card", foreground: "color.muted-foreground" };

    // Mixed selection: both foregrounds survive, and both backgrounds change.
    h = execute(h, { type: "bindings", ids: [a, b], patch: { background: "color.primary" } });
    expect(findNode(h.doc, a)?.tokenBindings).toEqual({ background: "color.primary", foreground: "color.foreground" });
    expect(findNode(h.doc, b)?.tokenBindings).toEqual({ background: "color.primary", foreground: "color.muted-foreground" });
    expect(validateDocument(h.doc)).toEqual({ ok: true, errors: [] });

    // Undo restores each node's own prior pair; redo reapplies without cross-contamination.
    expect(findNode(undo(h).doc, b)?.tokenBindings).toEqual({ background: "color.card", foreground: "color.muted-foreground" });
    expect(findNode(redo(undo(h)).doc, a)?.tokenBindings).toEqual({ background: "color.primary", foreground: "color.foreground" });

    // "Inherit component default" clears only the surface, and leaves no empty object behind.
    h = execute(h, { type: "bindings", ids: [a], patch: { background: undefined } });
    expect(findNode(h.doc, a)?.tokenBindings).toEqual({ foreground: "color.foreground" });
    h = execute(h, { type: "bindings", ids: [a], patch: { foreground: undefined } });
    expect(Object.hasOwn(findNode(h.doc, a)!, "tokenBindings")).toBe(false);

    // Survives save/reopen byte-stably, and no unsupported field was introduced.
    const reopened = parseDocument(serializeDocument(h.doc));
    expect(serializeDocument(reopened)).toBe(serializeDocument(h.doc));
    expect(findNode(reopened, b)?.tokenBindings).toEqual({ background: "color.primary", foreground: "color.muted-foreground" });
    expect(h.doc.nextNodeId).toBe(doc.nextNodeId + 2);
    expect(h.doc.retiredNodeIds ?? []).toEqual([]);

    // Bindings reach the export through nodeStyle, so the overwrite used to ship in generated code.
    // Each node's own foreground must appear, and the export must be deterministic.
    const source = exportReact(reopened).source;
    expect(source).toBe(exportReact(reopened).source);
    expect(source).toContain("hsl(var(--muted-foreground))");
    expect(source).toContain("hsl(var(--primary))");
  });
  it("allocates an unused page ID and route independently of node IDs", () => {
    const d = create();
    d.pages[0].id = "page_3";
    d.pages[0].route = "/screen-4";
    expect(validateDocument(d).ok).toBe(true);
    const h = execute(newHistory(d), { type: "page", name: "Imported successor" });
    expect(h.doc.pages[1].id).toBe("page_5");
    expect(h.doc.pages[1].route).toBe("/screen-5");
    expect(h.doc.pages[1].root.id).toBe("node_3");
    expect(h.doc.nextNodeId).toBe(4);
  });
  it("clears redo on a new command and allows multiple pages in the same product", () => {
    let h = execute(newHistory(create()), { type: "page", name: "Second screen" });
    expect(h.doc.pages).toHaveLength(2);
    h = undo(h);
    expect(h.future).toHaveLength(1);
    h = execute(h, { type: "rename", name: "Renamed product" });
    expect(h.future).toHaveLength(0);
    expect(h.doc.pages).toHaveLength(1);
  });
});

