/** Shared environment-neutral CreateProject validation. Filesystem defaults live in validate.mjs. */
import { validate as structural } from "./json-schema.mjs";
import { resolveRef } from "./references.mjs";
import { nodeIdNumber, walkNodes } from "./node-ids.mjs";
import { decodePreset } from "../../packages/create-preset/src/index.ts";

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
  "preset-undecodable": "designSystem.preset is a well-formed KX1_ envelope whose payload the canonical preset codec cannot read",
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
/** @param {unknown} doc @param {{schema: object, registries: object, maxDepth?: number}} options */
export function validateCreateProject(doc, { schema, registries, maxDepth = MAX_JSON_DEPTH } = {}) {
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

  // Structural validation has already proved the envelope (`^KX1_[A-Za-z0-9_-]+$`). Only the codec
  // can say whether the payload inside it decodes, so the codec's own error code is quoted rather
  // than paraphrased: whatever the runtime would refuse to load, the validator refuses to store.
  if (doc.designSystem?.preset !== undefined) {
    const decoded = decodePreset(doc.designSystem.preset);
    if (!decoded.ok)
      push("preset-undecodable", `designSystem.preset: the canonical codec rejects this payload (${decoded.error.code}: ${decoded.error.message})`);
  }

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
