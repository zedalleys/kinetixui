/**
 * The space hierarchy model.
 *
 * A connected product organises devices into places, and every product names the levels differently:
 * Portfolio → Site → Building → Zone, Farm → Field → Irrigation Zone, Home → Floor → Room, Org → Site
 * → Line → Machine. So the levels are **not** modelled. There is one node type, a `kind` string the
 * product fills in, and a `parentId`; depth is whatever the data says it is. A library that shipped
 * `"site" | "building" | "zone"` would be wrong for the farm and the factory.
 *
 * This is a description of a tree to render and roll up. It is not a permissions model, a device
 * registry or a database schema.
 */

export type KinetixSpaceNode = {
  id: string;
  name: string;
  /** Product vocabulary: "site", "farm", "field", "room", "line". Never interpreted by this package. */
  kind: string;
  /** Absent or `null` means a root. */
  parentId?: string | null;
  /** Devices placed directly in this space. Descendants' devices are found by walking the tree. */
  deviceIds?: readonly string[];
  metadata?: Record<string, unknown>;
};

/** Something wrong with the input that the builder worked around rather than threw on. */
export type KinetixHierarchyIssue = {
  code: "duplicate-id" | "orphan" | "cycle";
  /** The space the issue is about. For a cycle, the one that was promoted to a root to break it. */
  spaceId: string;
  /** Every space involved. A single id for duplicate/orphan; the loop, for a cycle. */
  spaceIds: string[];
  message: string;
};

export type KinetixSpaceTreeNode = {
  node: KinetixSpaceNode;
  children: KinetixSpaceTreeNode[];
  /** Root is 0. */
  depth: number;
  parent: KinetixSpaceTreeNode | null;
};

export type KinetixSpaceTree = {
  /** Every space is reachable from here: orphans and broken cycles are promoted to roots, in input order. */
  roots: KinetixSpaceTreeNode[];
  byId: ReadonlyMap<string, KinetixSpaceTreeNode>;
  issues: KinetixHierarchyIssue[];
};

/** One step of a breadcrumb. */
export type KinetixSpacePathItem = { id: string; name: string; kind: string };

export type KinetixSpaceHealthRollup = {
  /** Distinct devices in the space and everything beneath it. */
  total: number;
  healthy: number;
  degraded: number;
  warning: number;
  critical: number;
  unknown: number;
  /** Offline or unreachable. Overlaps the health counts, as in the fleet summary. */
  offline: number;
  /** Placed here but absent from the device list supplied. Counted as `unknown`, not dropped. */
  missing: number;
  /** The worst level anywhere beneath. `unknown` for an empty space. */
  worst: "healthy" | "degraded" | "warning" | "critical" | "unknown";
};
