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
import { nodeIdNumber, walkNodes } from "./node-ids.mjs";

export const SCHEMA_PATH = "docs/create/create-project.schema.json";
export const loadSchema = () => JSON.parse(readFileSync(join(ROOT, SCHEMA_PATH), "utf8"));

/** Every semantic rule, so a fixture names a code rather than matching prose. */
export const SEMANTIC_CODES = {
  "ref-unresolved": "a namespaced reference does not resolve in the file that owns its identifier space",
  "node-id-duplicate": "two nodes share an id",
  "node-id-retired": "a node uses an id listed in retiredNodeIds",
  "next-node-id-too-low": "an allocated node id — live or retired — is not strictly below nextNodeId, so the next allocation would hand out an id that has already been used",
  "page-id-duplicate": "two pages share an id",
  "route-duplicate": "two pages claim the same route",
  "provenance-unknown-node": "provenance names a node id the document does not contain",
  "figma-unknown-page": "figmaBinding.nodeIds names a page id the document does not contain",
  "ai-node-without-request": "a node attributed to AI carries no requestId or model",
  "document-too-deep": "the document nests deeper than the validator will walk",
};

/**
 * The deepest JSON nesting the validator will walk. Both the structural interpreter and the semantic
 * walk below are recursive, so without this a deeply nested document leaves `validateCreateProject`
 * through a RangeError instead of through a rejection — a crash where the contract promises a verdict.
 * Each node level costs two JSON levels (its object, then its `children` array), so 100 is roughly 45
 * nested nodes: far past any real page, and far short of the stack.
 */
export const MAX_JSON_DEPTH = 100;

/** Iterative on purpose: measuring the depth must not itself be able to overflow the stack. */
const exceedsDepth = (value, limit) => {
  const stack = [[value, 1]];
  while (stack.length) {
    const [node, depth] = stack.pop();
    if (node === null || typeof node !== "object") continue;
    if (depth > limit) return true;
    for (const child of Array.isArray(node) ? node : Object.values(node)) stack.push([child, depth + 1]);
  }
  return false;
};

/**
 * @param doc        a parsed document — never a string
 * @param registries from loadRegistries(); pass one explicitly to validate against a fixed snapshot
 * @returns {{ ok: boolean, errors: {code: string, message: string}[] }}
 */
export function validateCreateProject(doc, { schema = loadSchema(), registries = loadRegistries(), maxDepth = MAX_JSON_DEPTH } = {}) {
  const errors = [];
  const push = (code, message) => errors.push({ code, message });

  // Before anything recursive touches the document. A document this deep is rejected, not crashed on.
  if (exceedsDepth(doc, maxDepth)) {
    push("document-too-deep", `the document nests deeper than ${maxDepth} JSON levels, which is past what the validator walks`);
    return { ok: false, errors };
  }

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

  for (const [i, page] of doc.pages.entries()) {
    const where = `pages[${i}] (${page.id})`;
    if (pageIds.has(page.id)) push("page-id-duplicate", `${where}: id already used`);
    pageIds.add(page.id);
    if (routes.has(page.route))
      push("route-duplicate", `${where}: route ${page.route} is already claimed by ${routes.get(page.route)}`);
    routes.set(page.route, page.id);

    walkNodes(page.root, (node, path) => {
      const at = `${where} ${path} (${node.id})`;
      if (seenNodes.has(node.id)) push("node-id-duplicate", `${at}: id already used in this project`);
      if (retired.has(node.id)) push("node-id-retired", `${at}: id is retired and must never be reused`);
      seenNodes.add(node.id);
      // Allocation order, not document order: the id is checked against the persisted frontier and
      // never against its siblings, so reordering a page cannot turn an accepted document into a
      // rejected one. See scripts/create-schema/node-ids.mjs for the contract this enforces.
      if (nodeIdNumber(node.id) >= doc.nextNodeId)
        push("next-node-id-too-low", `${at}: nextNodeId is ${doc.nextNodeId}, so this id is at or above the allocation frontier and could be handed out again`);
      if (node.kind === "block" || node.kind === "component") refProblem(node.ref, at);
    });
  }

  // A retired id at or above the frontier is the deletion-reuse hole: the id is recorded as spent,
  // yet the counter would hand it out again. Live nodes are covered above, with their path; this
  // covers the ids that no longer have one. It is also the condition an imported document has to
  // satisfy once normalizeImportedNodeIds has raised its counter.
  for (const id of retired)
    if (nodeIdNumber(id) >= doc.nextNodeId)
      push("next-node-id-too-low", `retiredNodeIds contains ${id}, which is at or above nextNodeId ${doc.nextNodeId}: deleting a node would make its id allocatable again`);

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
