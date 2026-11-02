/**
 * validate.mjs — the one CreateProject validator. One entry point, used without variation by the
 * editor, the save route and the AI gateway when those exist. There is no relaxed mode, no repair
 * pass and no best-effort acceptance: a generation that does not validate is rejected. "An AI
 * generation cannot bypass validation" is only a property, rather than a claim, if there is exactly
 * one validator and it has no second door.
 *
 * Two layers, deliberately named apart:
 *
 *   STRUCTURAL  docs/create/create-project.schema.json, executed by ./json-schema.mjs.
 *   SEMANTIC    the rules a structural schema cannot carry — a reference resolving against a live
 *               manifest, node-id uniqueness and retirement, provenance pointing at a node that
 *               exists. Each has a code so a fixture can state which rejection it expects.
 *
 * Generated content is always parsed with a real JSON parser and validated structurally. It is
 * never string-matched: a model's tool input can carry different JSON escaping for the same value.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validate as structural } from "./json-schema.mjs";
import { loadRegistries, resolveRef, ROOT } from "./registries.mjs";

export const SCHEMA_PATH = "docs/create/create-project.schema.json";
export const loadSchema = () => JSON.parse(readFileSync(join(ROOT, SCHEMA_PATH), "utf8"));

/** Every semantic rule, so a fixture names a code rather than matching prose. */
export const SEMANTIC_CODES = {
  "ref-unresolved": "a namespaced reference does not resolve in the file that owns its identifier space",
  "node-id-duplicate": "two nodes share an id",
  "node-id-retired": "a node uses an id listed in retiredNodeIds",
  "node-id-not-monotonic": "a node id is not greater than every id before it in document order",
  "page-id-duplicate": "two pages share an id",
  "route-duplicate": "two pages claim the same route",
  "provenance-unknown-node": "provenance names a node id the document does not contain",
  "figma-unknown-page": "figmaBinding.nodeIds names a page id the document does not contain",
  "ai-node-without-request": "a node attributed to AI carries no requestId or model",
};

const walk = (node, visit, parentPath = "root") => {
  visit(node, parentPath);
  (node.children ?? []).forEach((child, i) => walk(child, visit, `${parentPath}.children[${i}]`));
};

/**
 * @param doc        a parsed document — never a string
 * @param registries from loadRegistries(); pass one explicitly to validate against a fixed snapshot
 * @returns {{ ok: boolean, errors: {code: string, message: string}[] }}
 */
export function validateCreateProject(doc, { schema = loadSchema(), registries = loadRegistries() } = {}) {
  const errors = [];
  const push = (code, message) => errors.push({ code, message });

  for (const message of structural(doc, schema)) push("structural", message);
  // The semantic layer reads fields by path; running it over a document whose shape is unknown
  // would report confusing consequences of the structural failure rather than its cause.
  if (errors.length) return { ok: false, errors };

  const refProblem = (ref, where) => {
    const why = resolveRef(ref, registries);
    if (why) push("ref-unresolved", `${where}: ${why}`);
  };
  refProblem(doc.domain, "domain");

  const retired = new Set(doc.retiredNodeIds ?? []);
  const seenNodes = new Set();
  const pageIds = new Set();
  const routes = new Map();
  let highest = 0;

  for (const [i, page] of doc.pages.entries()) {
    const where = `pages[${i}] (${page.id})`;
    if (pageIds.has(page.id)) push("page-id-duplicate", `${where}: id already used`);
    pageIds.add(page.id);
    if (routes.has(page.route))
      push("route-duplicate", `${where}: route ${page.route} is already claimed by ${routes.get(page.route)}`);
    routes.set(page.route, page.id);

    walk(page.root, (node, path) => {
      const at = `${where} ${path} (${node.id})`;
      if (seenNodes.has(node.id)) push("node-id-duplicate", `${at}: id already used in this project`);
      if (retired.has(node.id)) push("node-id-retired", `${at}: id is retired and must never be reused`);
      seenNodes.add(node.id);
      const n = Number(node.id.slice("node_".length));
      if (n <= highest) push("node-id-not-monotonic", `${at}: not greater than the highest id so far (node_${highest})`);
      highest = Math.max(highest, n);
      if (node.kind === "block" || node.kind === "component") refProblem(node.ref, at);
    });
  }

  for (const [nodeId, record] of Object.entries(doc.provenance ?? {})) {
    if (!seenNodes.has(nodeId)) push("provenance-unknown-node", `provenance.${nodeId}: no such node in this document`);
    if (record.by === "ai" && !(record.requestId && record.model))
      push("ai-node-without-request", `provenance.${nodeId}: attributed to AI with no requestId and model, so the claim is unauditable`);
  }

  for (const pageId of Object.keys(doc.figmaBinding?.nodeIds ?? {}))
    if (!pageIds.has(pageId)) push("figma-unknown-page", `figmaBinding.nodeIds.${pageId}: no such page in this document`);

  return { ok: errors.length === 0, errors };
}

/** The canonical on-disk form: two-space JSON with a trailing newline. Stored fixtures are byte-stable. */
export const serialize = (doc) => `${JSON.stringify(doc, null, 2)}\n`;
