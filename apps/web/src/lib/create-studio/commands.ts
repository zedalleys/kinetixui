import { ADAPTERS, adapterFor, type Props } from "./registry";
import { assertDocument, findNode, walk, serializeDocument, type Document, type Node } from "./model";
import { BREAKPOINTS, canOverride, type Breakpoint } from "./responsive";

type TokenBindings = NonNullable<Node["tokenBindings"]>;
export type Command =
  | { type: "insert"; parentId: string; ref: string }
  | { type: "props"; ids: string[]; patch: Props }
  | { type: "responsive"; id: string; breakpoint: Breakpoint; property: string; value?: Props[string] }
  // A per-property patch, not a whole object: `undefined` for a property clears just that property,
  // so changing one node's surface cannot disturb another's foreground. Mirrors `props` above.
  | { type: "bindings"; ids: string[]; patch: { [K in keyof TokenBindings]?: TokenBindings[K] | undefined } }
  | { type: "delete"; ids: string[] }
  | { type: "move"; ids: string[]; parentId: string; index: number }
  | { type: "page"; name: string }
  | { type: "rename"; name: string };
export type Snapshot = { doc: Document; selection: string[] };
export type History = Snapshot & { past: Snapshot[]; future: Snapshot[] };
const idsOf = (doc: Document) => { const ids = new Set<string>(); doc.pages.forEach(page => walk(page.root, node => ids.add(node.id))); return ids; };
export const newHistory = (doc: Document): History => ({ doc, selection: [], past: [], future: [] });
function parentOf(doc: Document, id: string): Node | undefined {
  let result: Node | undefined;
  doc.pages.forEach(page => walk(page.root, (node, parent) => { if (node.id === id) result = parent; }));
  return result;
}
function topRoots(doc: Document, ids: string[]): Node[] {
  const selected = new Set(ids);
  return [...selected].map(id => {
    const node = findNode(doc, id);
    if (!node) throw new Error("Selected node no longer exists");
    let parent = parentOf(doc, id);
    if (!parent) throw new Error("Page roots cannot be moved or removed");
    while (parent) { if (selected.has(parent.id)) return undefined; parent = parentOf(doc, parent.id); }
    return node;
  }).filter((node): node is Node => !!node);
}
function retire(doc: Document, node: Node) {
  const retired = new Set(doc.retiredNodeIds);
  walk(node, child => { retired.add(child.id); if (doc.provenance) delete doc.provenance[child.id]; });
  doc.retiredNodeIds = [...retired].sort();
  // External mappings are derivations of the old content; M1 never silently rewrites them.
  if (doc.figmaBinding) doc.figmaBinding = null;
}
export function execute(history: History, command: Command): History {
  const doc = structuredClone(history.doc);
  let selection = [...history.selection];
  if (command.type === "insert") {
    const adapter = adapterFor(command.ref);
    const parent = findNode(doc, command.parentId);
    if (!parent || (parent.kind !== "slot" && !ADAPTERS[parent.ref!]?.container)) throw new Error("Choose a legal container");
    if (doc.nextNodeId >= 10_000_000_000) throw new Error("Node identity space exhausted");
    const node: Node = { id: `node_${doc.nextNodeId++}`, kind: command.ref.startsWith("layout:") ? "layout" : "component", ref: command.ref, props: { ...adapter.defaults }, ...(adapter.container ? { children: [] } : {}) };
    parent.children = [...(parent.children ?? []), node]; selection = [node.id];
  } else if (command.type === "responsive") {
    const node = findNode(doc, command.id);
    if (!node?.ref || !canOverride(node.ref, command.property) || !BREAKPOINTS.some(({ id }) => id === command.breakpoint)) {
      throw new Error("Unsupported responsive property or breakpoint");
    }
    const responsive = { ...node.responsive };
    const patch = { ...responsive[command.breakpoint] };
    if (command.value === undefined) delete patch[command.property];
    else patch[command.property] = command.value;
    if (Object.keys(patch).length) responsive[command.breakpoint] = patch;
    else delete responsive[command.breakpoint];
    if (Object.keys(responsive).length) node.responsive = responsive;
    else delete node.responsive;
  } else if (command.type === "props" || command.type === "bindings") {
    for (const id of command.ids) {
      const node = findNode(doc, id); if (!node || !node.ref) throw new Error("Select an editable node");
      if (command.type === "props") node.props = { ...node.props, ...command.patch };
      else {
        const bindings: TokenBindings = { ...node.tokenBindings };
        for (const property of Object.keys(command.patch) as (keyof TokenBindings)[]) {
          const ref = command.patch[property];
          if (ref === undefined) delete bindings[property];
          else bindings[property] = ref;
        }
        // Absent rather than `{}` when nothing is left, so the document serializes byte-identically
        // to one that never carried bindings.
        if (Object.keys(bindings).length) node.tokenBindings = bindings;
        else delete node.tokenBindings;
      }
    }
  } else if (command.type === "delete") {
    const nodes = topRoots(doc, command.ids);
    for (const node of nodes) { const parent = parentOf(doc, node.id)!; parent.children = parent.children!.filter(child => child.id !== node.id); retire(doc, node); }
    selection = [];
  } else if (command.type === "move") {
    const nodes = topRoots(doc, command.ids);
    const parent = findNode(doc, command.parentId);
    if (!parent || (parent.kind !== "slot" && !ADAPTERS[parent.ref!]?.container)) throw new Error("Destination is not a container");
    if (!Number.isInteger(command.index) || command.index < 0 || command.index > (parent.children?.length ?? 0)) throw new Error("Invalid destination index");
    const descendants = new Set<string>(); nodes.forEach(node => walk(node, child => descendants.add(child.id)));
    if (descendants.has(parent.id)) throw new Error("Cannot move a node inside itself or a descendant");
    // Index is the requested position in the destination AFTER removal.
    for (const node of nodes) { const old = parentOf(doc, node.id)!; old.children = old.children!.filter(child => child.id !== node.id); }
    parent.children ??= [];
    parent.children.splice(Math.min(command.index, parent.children.length), 0, ...nodes); selection = nodes.map(n => n.id);
  } else if (command.type === "page") {
    const n = doc.nextNodeId++;
    let pageNumber = n;
    while (doc.pages.some(page => page.id === `page_${pageNumber}` || page.route === `/screen-${pageNumber}`)) pageNumber++;
    doc.pages.push({ id: `page_${pageNumber}`, name: command.name, route: `/screen-${pageNumber}`, root: { id: `node_${n}`, kind: "slot", name: "page", children: [] } });
    selection = [];
  } else if (command.type === "rename") doc.name = command.name;
  assertDocument(doc);
  return { doc, selection, past: [...history.past, { doc: history.doc, selection: history.selection }].slice(-100), future: [] };
}
function restore(current: History, snapshot: Snapshot): { snapshot: Snapshot; remap: Map<string, string> } {
  const doc = structuredClone(snapshot.doc);
  const targetIds = idsOf(doc);
  const retired = new Set([...current.doc.retiredNodeIds ?? [], ...doc.retiredNodeIds ?? []]);
  for (const id of idsOf(current.doc)) if (!targetIds.has(id)) retired.add(id);
  doc.nextNodeId = Math.max(doc.nextNodeId, current.doc.nextNodeId);
  const remap = new Map<string, string>();
  for (const page of doc.pages) walk(page.root, node => {
    if (retired.has(node.id)) { const old = node.id; node.id = `node_${doc.nextNodeId++}`; remap.set(old, node.id); }
  });
  if (doc.provenance) doc.provenance = Object.fromEntries(Object.entries(doc.provenance).map(([id, value]) => [remap.get(id) ?? id, value]));
  if (remap.size || serializeDocument(current.doc.figmaBinding ?? null) !== serializeDocument(doc.figmaBinding ?? null)) doc.figmaBinding = null;
  doc.retiredNodeIds = [...retired].sort();
  assertDocument(doc);
  const live = idsOf(doc);
  return { snapshot: { doc, selection: snapshot.selection.map(id => remap.get(id) ?? id).filter(id => live.has(id)) }, remap };
}
function rebaseSnapshot(snapshot: Snapshot, remap: Map<string, string>): Snapshot {
  if (!remap.size) return snapshot;
  const doc = structuredClone(snapshot.doc);
  doc.pages.forEach(page => walk(page.root, node => { node.id = remap.get(node.id) ?? node.id; }));
  if (doc.provenance) doc.provenance = Object.fromEntries(Object.entries(doc.provenance).map(([id, record]) => [remap.get(id) ?? id, record]));
  return { doc, selection: snapshot.selection.map(id => remap.get(id) ?? id) };
}
export function undo(history: History): History {
  const target = history.past.at(-1); if (!target) return history;
  const { snapshot, remap } = restore(history, target);
  return { ...snapshot, past: history.past.slice(0, -1).map(s => rebaseSnapshot(s, remap)), future: [...history.future, { doc: history.doc, selection: history.selection }].map(s => rebaseSnapshot(s, remap)) };
}
export function redo(history: History): History {
  const target = history.future.at(-1); if (!target) return history;
  const { snapshot, remap } = restore(history, target);
  return { ...snapshot, past: [...history.past, { doc: history.doc, selection: history.selection }].map(s => rebaseSnapshot(s, remap)), future: history.future.slice(0, -1).map(s => rebaseSnapshot(s, remap)) };
}

