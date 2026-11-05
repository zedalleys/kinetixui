/**
 * node-ids.mjs — the node identity contract for CreateProject.
 *
 * Node ids are ALLOCATION-ordered, never document-ordered. The owner decision (2026-11-04) is:
 *
 *   - every newly allocated node takes the current `nextNodeId`, which is then incremented;
 *   - reordering, moving, grouping or restructuring a node never changes its id;
 *   - a deleted id is never reused — it is listed in `retiredNodeIds` and stays below `nextNodeId`;
 *   - existing ids are stable across save, load and migration;
 *   - an imported or migrated document must raise `nextNodeId` strictly above every id already
 *     allocated, live or retired;
 *   - document order is independent of identity.
 *
 * `nextNodeId` is persisted rather than derived. A derived "highest id plus one" loses the allocation
 * frontier the moment the highest-numbered node is deleted: the next allocation would hand out an id
 * that a Figma frame and a provenance record still name. Persisting the counter is what makes
 * retirement mean something, and what makes the rule checkable from the document alone.
 *
 * Every function here is pure. `allocate` returns a new document; nothing mutates its argument,
 * because an allocator that mutates is an allocator that can half-apply.
 */
export const NODE_ID_PREFIX = "node_";

/** The numeric suffix. The schema's pattern is what guarantees this parses. */
export const nodeIdNumber = (id) => Number(id.slice(NODE_ID_PREFIX.length));
export const formatNodeId = (n) => `${NODE_ID_PREFIX}${n}`;

/**
 * Every node in a page tree, with the path that names it. One traversal definition, used by the
 * validator for its findings and by the helpers below, so the two cannot disagree about what a
 * child is.
 */
export const walkNodes = (node, visit, parentPath = "root") => {
  visit(node, parentPath);
  (node.children ?? []).forEach((child, i) => walkNodes(child, visit, `${parentPath}.children[${i}]`));
};

/** Live node ids, in no meaningful order. Iterative: this runs on documents the depth guard has not seen. */
export const liveNodeIds = (doc) => {
  const ids = [];
  const stack = [...(doc.pages ?? []).map((page) => page.root).filter(Boolean)];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    if (typeof node.id === "string") ids.push(node.id);
    for (const child of node.children ?? []) stack.push(child);
  }
  return ids;
};

/** Live and retired together: the ids that have ever been handed out and must never be handed out again. */
export const allocatedNodeIds = (doc) => [...liveNodeIds(doc), ...(doc.retiredNodeIds ?? [])];

/** The lowest `nextNodeId` a document can legally carry: one above everything ever allocated. */
export const requiredNextNodeId = (doc) => {
  const numbers = allocatedNodeIds(doc).map(nodeIdNumber).filter(Number.isInteger);
  return (numbers.length ? Math.max(...numbers) : 0) + 1;
};

/**
 * Allocate one id. The id is `nextNodeId` itself — not the highest live id plus one — so a deletion
 * cannot make an id available again.
 *
 * @returns {{ id: string, doc: object }} the new id and a document whose counter has moved on
 */
export const allocateNodeId = (doc) => {
  const n = doc.nextNodeId;
  if (!Number.isInteger(n) || n < 1)
    throw new Error(`nextNodeId ${JSON.stringify(n)} is not a positive integer — a document without the counter cannot allocate`);
  return { id: formatNodeId(n), doc: { ...doc, nextNodeId: n + 1 } };
};

/**
 * Normalise a document arriving from outside the editor — an import, or a migration from a version
 * that had no counter. `nextNodeId` is raised above every allocated id, live or retired, and is
 * never lowered: an import must not be able to rewind the frontier.
 */
export const normalizeImportedNodeIds = (doc) => {
  const floor = requiredNextNodeId(doc);
  const current = Number.isInteger(doc.nextNodeId) ? doc.nextNodeId : 0;
  return { ...doc, nextNodeId: Math.max(current, floor) };
};
