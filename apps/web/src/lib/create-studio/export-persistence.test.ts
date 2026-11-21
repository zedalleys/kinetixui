// @vitest-environment node
//
// The M1 vertical slice ends at "reopen the saved product and export the same code".
// export.test.ts proves the compiler is a function of its argument (two calls, one document);
// nothing proved the argument survives the storage boundary. These tests gate that:
// the document the editor exports after a real save/load must export byte-identically,
// and every value the saved document declares must be observable in the generated source.
import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileStore } from "./file-store";
import { StudioService } from "./service";
import { execute, newHistory, type History } from "./commands";
import { createDocument, parseDocument, serializeDocument, walk, type Document } from "./model";
import { exportReact } from "./export";
import { adapterFor } from "./registry";
import { BREAKPOINTS } from "./responsive";

/** The same composition the consumer fixture builds: every supported adapter, two screens, overrides at both breakpoints. */
function composed(id = "proj_persistence01"): History {
  let history = newHistory(createDocument(id, "Persistence"));
  for (const ref of ["component:Card", "component:Badge", "component:Input", "component:Button", "component:Tabs", "layout:stack", "layout:grid"]) {
    history = execute(history, { type: "insert", parentId: "node_2", ref });
  }
  const gridId = history.selection[0];
  const stackId = history.doc.pages[0].root.children![0].children!.find(node => node.ref === "layout:stack")!.id;
  history = execute(history, { type: "responsive", id: stackId, breakpoint: "tablet", property: "axis", value: "row" });
  history = execute(history, { type: "responsive", id: stackId, breakpoint: "desktop", property: "gap", value: "spacing.8" });
  history = execute(history, { type: "responsive", id: gridId, breakpoint: "tablet", property: "columns", value: 3 });
  history = execute(history, { type: "responsive", id: gridId, breakpoint: "desktop", property: "columns", value: 4 });
  history = execute(history, { type: "responsive", id: "node_2", breakpoint: "tablet", property: "widthMode", value: "fill" });
  history = execute(history, { type: "responsive", id: "node_2", breakpoint: "desktop", property: "padding", value: "spacing.8" });
  history = execute(history, { type: "props", ids: [stackId], patch: { align: "center" } });
  history = execute(history, { type: "page", name: "Settings" });
  history = execute(history, { type: "insert", parentId: history.doc.pages[1].root.id, ref: "layout:section" });
  return history;
}

async function store(run: (service: StudioService) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), "kinetix-create-persistence-"));
  try { await run(new StudioService(new FileStore(directory))); } finally { await rm(directory, { recursive: true, force: true }); }
}

describe("generated code is a function of the saved document, not of the live session", () => {
  it("exports identically after the serialization boundary a save crosses", () => {
    const doc = composed().doc;
    const reopened = parseDocument(serializeDocument(doc));
    // Not toEqual: the acceptance claim is byte-identical source, theme and instructions.
    expect(exportReact(reopened).source).toBe(exportReact(doc).source);
    expect(exportReact(reopened).theme).toBe(exportReact(doc).theme);
    expect(exportReact(reopened).readme).toBe(exportReact(doc).readme);
  });

  it("exports identically after a real save and reopen through the local service", async () => store(async service => {
    const token = await service.start();
    const created = await service.create(token, "Persistence", "request_persistence");
    const edited = { ...composed(created.id).doc, id: created.id } as Document;
    const inSession = exportReact(edited);
    const saved = await service.save(token, created.id, created.revision, edited);
    const reopened = await service.load(token, created.id);
    expect(reopened.revision).toBe(saved.revision);
    expect(serializeDocument(reopened.doc)).toBe(serializeDocument(edited));
    expect(exportReact(reopened.doc).source).toBe(inSession.source);
    expect(exportReact(reopened.doc).theme).toBe(inSession.theme);
  }));

  it("reopening a saved product reproduces every node identity, property and override", async () => store(async service => {
    const token = await service.start();
    const created = await service.create(token, "Persistence", "request_identity");
    const edited = { ...composed(created.id).doc, id: created.id } as Document;
    await service.save(token, created.id, created.revision, edited);
    const reopened = (await service.load(token, created.id)).doc;
    const describe_ = (doc: Document) => doc.pages.map(page => {
      const nodes: unknown[] = [];
      walk(page.root, node => nodes.push({ id: node.id, kind: node.kind, ref: node.ref, props: node.props, responsive: node.responsive }));
      return { id: page.id, route: page.route, name: page.name, nodes };
    });
    expect(describe_(reopened)).toEqual(describe_(edited));
    expect(reopened.nextNodeId).toBe(edited.nextNodeId);
  }));
});

describe("the generated source agrees with what the saved document declares", () => {
  it("carries every saved text value, frame name and responsive breakpoint", () => {
    const doc = parseDocument(serializeDocument(composed().doc));
    const { source, theme } = exportReact(doc);
    let frames = 0, texts = 0, overrides = 0;
    for (const page of doc.pages) {
      walk(page.root, node => {
        if (!node.ref) return;
        const effective = { ...adapterFor(node.ref).defaults, ...node.props };
        for (const [key, control] of Object.entries(adapterFor(node.ref).controls)) {
          if (control.type !== "text") continue;
          // Text reaches the source as escaped JSON data, so look for the JSON encoding.
          expect(source).toContain(JSON.stringify(String(effective[key])));
          if (node.ref === "layout:section" && key === "name") frames++; else texts++;
        }
        if (node.responsive) {
          // A node with overrides must be addressable from the generated stylesheet.
          expect(source).toContain(`data-kx-layout={${JSON.stringify(node.id)}}`);
          expect(theme).toContain(`[data-kx-layout="${node.id}"]`);
          for (const breakpoint of BREAKPOINTS) {
            if (node.responsive[breakpoint.id]) {
              expect(theme).toContain(`min-width: ${breakpoint.minWidth}px`);
              overrides++;
            }
          }
        }
      });
    }
    // Guard the guard: a composition that lost its content would satisfy every expect above.
    expect(frames).toBeGreaterThanOrEqual(2);
    expect(texts).toBeGreaterThanOrEqual(8);
    expect(overrides).toBeGreaterThanOrEqual(6);
    expect(source.match(/export function Screen/g)).toHaveLength(doc.pages.length);
  });

  it("drops no screen and invents none", () => {
    const doc = composed().doc;
    const { source } = exportReact(doc);
    for (const [index] of doc.pages.entries()) expect(source).toContain(`export function Screen${index + 1}(`);
    expect(source).not.toContain(`export function Screen${doc.pages.length + 1}(`);
  });
});
