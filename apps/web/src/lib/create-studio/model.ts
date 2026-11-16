import base from "../../../../../docs/create/create-project.schema.json";
import extension from "../../../../../docs/create/create-project.v2-extension.json";
import capabilities from "../../../../../docs/business-capabilities.json";
import components from "../../../../../components.manifest.json";
import blocks from "../../../../../blocks.manifest.json";
import { migrate } from "../../../../../scripts/create-schema/migrate.mjs";
import { validateCreateProject } from "../../../../../scripts/create-schema/validate-core.mjs";
import { ADAPTERS, LAYOUT_REFS, MOTION_REFS, validateProps, type Props } from "./registry";

export type Node = {
  id: string; kind: "component" | "block" | "slot" | "layout"; ref?: string; name?: string;
  props?: Props; children?: Node[]; tokenBindings?: { background?: string; foreground?: string };
  motionRef?: string; metadata?: { name?: string };
};
export type Page = { id: string; name: string; route: string; root: Node };
export type Document = {
  schemaVersion: 2; id: string; name: string; domain: string;
  designSystem: { preset: string; overrides?: { tokens?: Record<string, string>; typography?: Record<string, string> } };
  pages: Page[]; nextNodeId: number; retiredNodeIds?: string[];
  metadata?: { createdAt: string; updatedAt: string };
  provenance?: Record<string, { by: "human" | "ai"; at: string; requestId?: string; model?: string }>;
  figmaBinding?: null | { fileKey: string; pageNodeId: string; nodeIds: Record<string, string>; lastSyncedAt: string; lastSyncedDigest: string };
};
type SchemaObject = Record<string, unknown>;
const schema = structuredClone(base) as unknown as { properties: Record<string, SchemaObject>; $defs: Record<string, SchemaObject> };
Object.assign(schema, { title: "CreateProject v2", $id: "https://kinetixui.com/schemas/create-project/v2.json" });
schema.properties.schemaVersion = { const: 2 };
schema.properties.pages = extension.pages;
schema.properties.metadata = extension.metadata;
schema.$defs.node = { oneOf: ["blockNode", "componentNode", "slotNode", "layoutNode"].map(name => ({ $ref: `#/$defs/${name}` })) };
schema.$defs.layoutNode = structuredClone(extension.layoutNode);
for (const name of ["blockNode", "componentNode", "slotNode", "layoutNode"]) {
  schema.$defs[name].properties = { ...(schema.$defs[name].properties as SchemaObject), ...extension.nodeProperties };
}
const kebab = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([A-Z])([A-Z][a-z])/g, "$1-$2").toLowerCase();
const registries = { spaces: {
  domain: { source: "business-capabilities", ids: new Set(capabilities.discovery.domains.map(x => x.id)) },
  component: { source: "components.manifest", ids: new Set(Object.keys(components.components)), normalise: kebab },
  block: { source: "blocks.manifest", ids: new Set(Object.keys(blocks.blocks)) },
} };
export const V2_SCHEMA = schema;
export const MAX_DOCUMENT_BYTES = 1_000_000;
export function serializeDocument(doc: unknown): string {
  const seen = new WeakSet<object>();
  const sort = (value: unknown, depth = 0): unknown => {
    if (depth > 100) throw new Error("Document is too deep");
    if (value === null || typeof value !== "object") {
      if (typeof value === "number" && !Number.isFinite(value)) throw new Error("Non-finite number");
      if (typeof value === "function" || typeof value === "undefined" || typeof value === "symbol" || typeof value === "bigint") throw new Error("Only JSON data is allowed");
      return value;
    }
    if (seen.has(value)) throw new Error("Circular or shared object reference");
    seen.add(value);
    if (Array.isArray(value)) return value.map(v => sort(v, depth + 1));
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new Error("Only plain objects are allowed");
    return Object.fromEntries(Object.keys(value).sort().map(key => {
      if (["__proto__", "constructor", "prototype"].includes(key)) throw new Error("Unsafe object key");
      return [key, sort((value as Record<string, unknown>)[key], depth + 1)];
    }));
  };
  const result = JSON.stringify(sort(doc), null, 2) + "\n";
  if (new TextEncoder().encode(result).length > MAX_DOCUMENT_BYTES) throw new Error("Document exceeds 1 MB");
  return result;
}
export function validateDocument(input: unknown): { ok: boolean; errors: string[] } {
  try {
    serializeDocument(input);
    const shape = validateCreateProject(input, { schema, registries });
    if (!shape.ok) return { ok: false, errors: shape.errors.map((e: { code: string; message: string }) => `${e.code}: ${e.message}`) };
    const doc = input as Document;
    const errors: string[] = [];
    const overrides = doc.designSystem.overrides;
    if (overrides && (Object.keys(overrides.tokens ?? {}).length || Object.keys(overrides.typography ?? {}).length)) errors.push("Custom token/typography overrides are not supported in M1; preserve this document for a compatible editor");
    let count = 0;
    for (const page of doc.pages) walk(page.root, node => {
      count++;
      if (node.motionRef && !MOTION_REFS.has(node.motionRef)) errors.push(`${node.id}: unknown motion reference`);
      if (node.kind === "block") errors.push(`${node.id}: block editing is not supported in M1`);
      if (node.kind === "slot") {
        if (node !== page.root || node.name !== "page") errors.push(`${node.id}: only the page-root slot is supported`);
      } else if (node.ref) {
        errors.push(...validateProps(node.ref, node.props ?? {}).map(e => `${node.id}: ${e}`));
        if (node.kind === "layout" && !Object.hasOwn(LAYOUT_REFS, node.ref)) errors.push("Unregistered layout reference");
        if (node.children?.length && ADAPTERS[node.ref] && !ADAPTERS[node.ref].container) errors.push(`${node.id}: this component has no editable child slot`);

      }
    });
    if (count > 1000) errors.push("M1 supports at most 1000 nodes per product");
    return { ok: errors.length === 0, errors };
  } catch (error) { return { ok: false, errors: [error instanceof Error ? error.message : "Invalid document"] }; }
}
export function assertDocument(input: unknown): asserts input is Document {
  const result = validateDocument(input);
  if (!result.ok) throw new Error(result.errors.join("; "));
}
export function walk(node: Node, visit: (node: Node, parent?: Node) => void, parent?: Node): void {
  visit(node, parent);
  for (const child of node.children ?? []) walk(child, visit, node);
}
export function findNode(doc: Document, id: string): Node | undefined {
  let found: Node | undefined;
  for (const page of doc.pages) walk(page.root, node => { if (node.id === id) found = node; });
  return found;
}
export function createDocument(id: string, name: string, now = new Date().toISOString()): Document {
  const doc: Document = { schemaVersion: 2, id, name, domain: "domain:commerce", designSystem: { preset: "KX1_eyJ2IjoxfQ" }, pages: [{ id: "page_home", name: "Home", route: "/", root: { id: "node_1", kind: "slot", name: "page", children: [{ id: "node_2", kind: "layout", ref: "layout:section", props: { ...ADAPTERS["layout:section"].defaults, name: "Home" }, children: [] }] } }], nextNodeId: 3, retiredNodeIds: [], metadata: { createdAt: now, updatedAt: now } };
  assertDocument(doc); return doc;
}
export const STUDIO_MIGRATIONS = { 1: (input: object) => {
  const result = validateCreateProject(input, { schema: base, registries });
  if (!result.ok) throw new Error("Invalid v1 document: " + result.errors.map((e: { message: string }) => e.message).join("; "));
  return { ...structuredClone(input), schemaVersion: 2 };
} };
export function migrateDocument(input: unknown): Document {
  serializeDocument(input);
  if (!input || typeof input !== "object" || !("schemaVersion" in input)) throw new Error("Missing schema version");
  if (input.schemaVersion !== 1 && input.schemaVersion !== 2) throw new Error("Unsupported schema version; open with a compatible editor");
  const doc = migrate(structuredClone(input), { current: 2, migrations: STUDIO_MIGRATIONS }) as Document;
  // Existing trees retain every ID and field. Unsupported old content is rejected explicitly.
  doc.schemaVersion = 2;
  assertDocument(doc);
  return doc;
}
export function parseDocument(text: string): Document {
  if (new TextEncoder().encode(text).length > MAX_DOCUMENT_BYTES) throw new Error("Document exceeds 1 MB");
  return migrateDocument(JSON.parse(text));
}

