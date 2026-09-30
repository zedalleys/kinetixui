import type { KinetixDevice } from "../types/device";
import type {
  KinetixHierarchyIssue,
  KinetixSpaceHealthRollup,
  KinetixSpaceNode,
  KinetixSpacePathItem,
  KinetixSpaceTree,
  KinetixSpaceTreeNode,
} from "../types/hierarchy";
import { assessDevices, worseHealth, type AssessDevicesOptions } from "./device-state";

/**
 * Space hierarchy: a generic tree of places, and roll-ups over it.
 *
 * Malformed input never hangs or throws. A cycle, a dangling parent or a repeated id produces an
 * entry in `issues` and a tree that still contains every distinct space, so a screen renders the data
 * it has and a developer sees what was wrong with the rest.
 */

/**
 * Build the tree from a flat list.
 *
 * - **Duplicate ids:** the first wins; later ones are reported and ignored.
 * - **Orphans** (a `parentId` naming no space, or the space itself): reported, promoted to roots.
 * - **Cycles:** reported once each, and broken by promoting the loop's earliest member (in input
 *   order) to a root, so nothing is dropped and the walk is linear — it cannot hang.
 *
 * Children keep input order, so the output is deterministic.
 */
export function buildSpaceTree(nodes: readonly KinetixSpaceNode[] | null | undefined): KinetixSpaceTree {
  const issues: KinetixHierarchyIssue[] = [];
  const list: KinetixSpaceNode[] = [];
  const index = new Map<string, number>();

  for (const node of Array.isArray(nodes) ? nodes : []) {
    if (!node || typeof node.id !== "string") continue;
    if (index.has(node.id)) {
      issues.push({ code: "duplicate-id", spaceId: node.id, spaceIds: [node.id], message: `More than one space has the id "${node.id}"; only the first is used.` });
      continue;
    }
    index.set(node.id, list.length);
    list.push(node);
  }

  // parent[i] is the index of i's parent, or -1 for a root.
  const parent: number[] = list.map((node, i) => {
    const pid = node.parentId;
    if (pid === undefined || pid === null) return -1;
    const at = index.get(pid);
    if (at === undefined || at === i) {
      issues.push({
        code: "orphan",
        spaceId: node.id,
        spaceIds: [node.id],
        message: at === i ? `Space "${node.id}" is its own parent.` : `Space "${node.id}" names a parent "${pid}" that does not exist.`,
      });
      return -1;
    }
    return at;
  });

  // Cycle detection: colour walk. 0 = unseen, 1 = on the current walk, 2 = finished.
  const colour = new Array<number>(list.length).fill(0);
  for (let start = 0; start < list.length; start++) {
    if (colour[start] !== 0) continue;
    const walk: number[] = [];
    let at = start;
    while (at !== -1 && colour[at] === 0) {
      colour[at] = 1;
      walk.push(at);
      at = parent[at]!;
    }
    if (at !== -1 && colour[at] === 1) {
      const loop = walk.slice(walk.indexOf(at));
      const promoted = Math.min(...loop);
      parent[promoted] = -1;
      issues.push({
        code: "cycle",
        spaceId: list[promoted]!.id,
        spaceIds: loop.map((i) => list[i]!.id),
        message: `Spaces ${loop.map((i) => `"${list[i]!.id}"`).join(" → ")} form a loop; "${list[promoted]!.id}" was treated as a root.`,
      });
    }
    for (const i of walk) colour[i] = 2;
  }

  const treeNodes: KinetixSpaceTreeNode[] = list.map((node) => ({ node, children: [], depth: 0, parent: null }));
  const roots: KinetixSpaceTreeNode[] = [];
  list.forEach((_, i) => {
    const p = parent[i]!;
    if (p === -1) roots.push(treeNodes[i]!);
    else {
      treeNodes[i]!.parent = treeNodes[p]!;
      treeNodes[p]!.children.push(treeNodes[i]!);
    }
  });

  // Depth top-down with an explicit stack: no recursion, so a 100k-deep chain cannot overflow.
  const stack = [...roots].reverse();
  while (stack.length > 0) {
    const current = stack.pop()!;
    current.depth = current.parent ? current.parent.depth + 1 : 0;
    for (let i = current.children.length - 1; i >= 0; i--) stack.push(current.children[i]!);
  }

  const byId = new Map<string, KinetixSpaceTreeNode>();
  for (const t of treeNodes) byId.set(t.node.id, t);
  return { roots, byId, issues };
}

/** The tree node for an id, or `undefined`. */
export function findSpace(tree: KinetixSpaceTree | null | undefined, id: string | null | undefined): KinetixSpaceTreeNode | undefined {
  if (!tree || typeof id !== "string") return undefined;
  return tree.byId.get(id);
}

/** The breadcrumb from the root down to (and including) the space. Empty for an unknown id. */
export function spacePath(tree: KinetixSpaceTree | null | undefined, id: string | null | undefined): KinetixSpacePathItem[] {
  let current = findSpace(tree, id);
  const path: KinetixSpacePathItem[] = [];
  while (current) {
    path.push({ id: current.node.id, name: current.node.name, kind: current.node.kind });
    current = current.parent ?? undefined;
  }
  return path.reverse();
}

/**
 * Device ids in a space and everything beneath it: pre-order, distinct, deterministic. An unknown
 * space has none. Pass `includeSelf: false` to leave out devices placed directly in the space.
 */
export function descendantDeviceIds(
  tree: KinetixSpaceTree | null | undefined,
  spaceId: string | null | undefined,
  options: { includeSelf?: boolean } = {},
): string[] {
  const start = findSpace(tree, spaceId);
  if (!start) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  const stack: KinetixSpaceTreeNode[] = [start];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current !== start || options.includeSelf !== false) {
      for (const id of current.node.deviceIds ?? []) {
        if (typeof id === "string" && !seen.has(id)) {
          seen.add(id);
          out.push(id);
        }
      }
    }
    for (let i = current.children.length - 1; i >= 0; i--) stack.push(current.children[i]!);
  }
  return out;
}

/**
 * Health counts for every space, keyed by space id.
 *
 * Each space's rollup covers its own devices and all descendants', so the worst status propagates
 * upward by construction: one critical pump in a field makes the field, the farm and the organisation
 * critical. A device listed in more than one space is counted once per rollup. A placed device id
 * with no matching device is `missing` and counted as `unknown`, never silently dropped.
 */
export function rollupSpaceHealth(
  tree: KinetixSpaceTree | null | undefined,
  devices: readonly KinetixDevice[] | null | undefined,
  options: AssessDevicesOptions = {},
): Map<string, KinetixSpaceHealthRollup> {
  const result = new Map<string, KinetixSpaceHealthRollup>();
  if (!tree) return result;
  const assessed = new Map(assessDevices(devices, options).map((entry) => [entry.device.id, entry]));

  for (const id of tree.byId.keys()) {
    const rollup: KinetixSpaceHealthRollup = {
      total: 0, healthy: 0, degraded: 0, warning: 0, critical: 0, unknown: 0, offline: 0, missing: 0, worst: "unknown",
    };
    for (const deviceId of descendantDeviceIds(tree, id)) {
      rollup.total += 1;
      const entry = assessed.get(deviceId);
      if (!entry) {
        rollup.missing += 1;
        rollup.unknown += 1;
        continue;
      }
      rollup[entry.health.level] += 1;
      rollup.worst = worseHealth(rollup.worst, entry.health.level) as KinetixSpaceHealthRollup["worst"];
      if (entry.connectivity.state === "offline" || entry.connectivity.state === "unreachable") rollup.offline += 1;
    }
    result.set(id, rollup);
  }
  return result;
}

/** One sentence for a rollup. Counts only. */
export function describeSpaceRollup(rollup: KinetixSpaceHealthRollup): string {
  if (rollup.total === 0) return "No devices.";
  const parts = [`${rollup.healthy} of ${rollup.total} healthy`];
  if (rollup.critical > 0) parts.push(`${rollup.critical} critical`);
  if (rollup.warning > 0) parts.push(`${rollup.warning} warning`);
  if (rollup.degraded > 0) parts.push(`${rollup.degraded} degraded`);
  if (rollup.unknown > 0) parts.push(`${rollup.unknown} unknown`);
  if (rollup.offline > 0) parts.push(`${rollup.offline} offline`);
  return `${parts.join(", ")}.`;
}
