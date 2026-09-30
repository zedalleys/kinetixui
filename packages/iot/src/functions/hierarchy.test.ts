import { describe, expect, it } from "vitest";
import {
  buildSpaceTree,
  descendantDeviceIds,
  describeSpaceRollup,
  findSpace,
  rollupSpaceHealth,
  spacePath,
  type KinetixDevice,
  type KinetixSpaceNode,
} from "./index";

const n = (id: string, kind: string, parentId?: string, deviceIds?: string[]): KinetixSpaceNode => ({ id, name: id.toUpperCase(), kind, parentId, deviceIds });
const dev = (id: string, over: Partial<KinetixDevice> = {}): KinetixDevice => ({ id, name: id, type: "sensor", status: "online", ...over });

/** Each vocabulary is the same four-level shape with different `kind`s. */
const VOCABULARIES: Record<string, { nodes: KinetixSpaceNode[]; kinds: string[]; leaf: string }> = {
  "portfolio-site-building-zone": {
    kinds: ["portfolio", "site", "building", "zone"],
    leaf: "zone",
    nodes: [n("port", "portfolio"), n("site", "site", "port"), n("bldg", "building", "site"), n("zone", "zone", "bldg", ["dev-a", "dev-b"])],
  },
  "farm-field-irrigation-zone": {
    kinds: ["farm", "field", "irrigation-zone"],
    leaf: "iz",
    nodes: [n("farm", "farm"), n("field", "field", "farm"), n("iz", "irrigation-zone", "field", ["dev-a", "dev-b"])],
  },
  "home-floor-room": {
    kinds: ["home", "floor", "room"],
    leaf: "room",
    nodes: [n("home", "home"), n("floor", "floor", "home"), n("room", "room", "floor", ["dev-a", "dev-b"])],
  },
  "org-site-line-machine": {
    kinds: ["organisation", "site", "line", "machine"],
    leaf: "machine",
    nodes: [n("org", "organisation"), n("site", "site", "org"), n("line", "line", "site"), n("machine", "machine", "line", ["dev-a", "dev-b"])],
  },
};

describe.each(Object.entries(VOCABULARIES))("the same functions express %s", (_name, { nodes, leaf }) => {
  const devices = [dev("dev-a"), dev("dev-b", { status: "error" })];
  const tree = buildSpaceTree(nodes);
  const root = nodes[0]!;

  it("builds one root with no issues and the right depths", () => {
    expect(tree.issues).toEqual([]);
    expect(tree.roots.map((r) => r.node.id)).toEqual([root.id]);
    expect(findSpace(tree, leaf)?.depth).toBe(nodes.length - 1);
    expect(tree.byId.size).toBe(nodes.length);
  });
  it("produces a breadcrumb root-first with names, ids and kinds", () => {
    const path = spacePath(tree, leaf);
    expect(path.map((p) => p.id)).toEqual(nodes.map((x) => x.id));
    expect(path.map((p) => p.name)).toEqual(nodes.map((x) => x.name));
    expect(path.map((p) => p.kind)).toEqual(nodes.map((x) => x.kind));
  });
  it("collects devices from descendants", () => {
    expect(descendantDeviceIds(tree, root.id)).toEqual(["dev-a", "dev-b"]);
    expect(descendantDeviceIds(tree, leaf, { includeSelf: false })).toEqual([]);
  });
  it("rolls the worst status up to every ancestor", () => {
    const rollups = rollupSpaceHealth(tree, devices);
    for (const node of nodes) {
      expect(rollups.get(node.id), node.id).toMatchObject({ total: 2, healthy: 1, critical: 1, worst: "critical" });
    }
  });
});

describe("buildSpaceTree", () => {
  it("keeps children in input order and supports several roots", () => {
    const tree = buildSpaceTree([n("b", "room", "h"), n("h", "home"), n("a", "room", "h"), n("solo", "home")]);
    expect(tree.roots.map((r) => r.node.id)).toEqual(["h", "solo"]);
    expect(findSpace(tree, "h")!.children.map((c) => c.node.id)).toEqual(["b", "a"]);
  });
  it("reports orphans and promotes them to roots", () => {
    const tree = buildSpaceTree([n("root", "site"), n("lost", "room", "ghost")]);
    expect(tree.issues).toMatchObject([{ code: "orphan", spaceId: "lost" }]);
    expect(tree.roots.map((r) => r.node.id)).toEqual(["root", "lost"]);
    expect(spacePath(tree, "lost").map((p) => p.id)).toEqual(["lost"]);
  });
  it("reports a self-parent", () => {
    const tree = buildSpaceTree([n("me", "room", "me")]);
    expect(tree.issues[0]).toMatchObject({ code: "orphan", spaceId: "me" });
    expect(tree.roots).toHaveLength(1);
  });
  it("breaks a cycle without hanging, keeps every space, and reports it once", () => {
    const tree = buildSpaceTree([n("a", "x", "c"), n("b", "x", "a"), n("c", "x", "b"), n("tail", "x", "b")]);
    expect(tree.issues).toHaveLength(1);
    expect(tree.issues[0]).toMatchObject({ code: "cycle", spaceId: "a" });
    expect(tree.issues[0]!.spaceIds.sort()).toEqual(["a", "b", "c"]);
    expect(tree.byId.size).toBe(4);
    expect(tree.roots.map((r) => r.node.id)).toEqual(["a"]);
    expect(spacePath(tree, "tail").map((p) => p.id)).toEqual(["a", "b", "tail"]);
    expect(tree.roots).toHaveLength(1);
  });
  it("breaks a two-node mutual cycle", () => {
    const tree = buildSpaceTree([n("x", "k", "y"), n("y", "k", "x")]);
    expect(tree.issues).toMatchObject([{ code: "cycle", spaceId: "x" }]);
    expect(spacePath(tree, "y").map((p) => p.id)).toEqual(["x", "y"]);
  });
  it("uses the first of duplicate ids and reports the rest", () => {
    const tree = buildSpaceTree([n("dup", "site"), { ...n("dup", "room"), name: "Second" }]);
    expect(tree.issues).toMatchObject([{ code: "duplicate-id", spaceId: "dup" }]);
    expect(findSpace(tree, "dup")!.node.kind).toBe("site");
  });
  it("copes with a very deep chain without recursion overflow", () => {
    const nodes = Array.from({ length: 50_000 }, (_, i) => n(`n${i}`, "level", i === 0 ? undefined : `n${i - 1}`, i === 49_999 ? ["deep"] : undefined));
    const tree = buildSpaceTree(nodes);
    expect(tree.issues).toEqual([]);
    expect(findSpace(tree, "n49999")!.depth).toBe(49_999);
    expect(descendantDeviceIds(tree, "n0")).toEqual(["deep"]);
    expect(spacePath(tree, "n49999")).toHaveLength(50_000);
  });
  it("is safe on junk input", () => {
    expect(buildSpaceTree(null).roots).toEqual([]);
    expect(buildSpaceTree([null as never, { name: "no id" } as never]).byId.size).toBe(0);
    expect(findSpace(null, "x")).toBeUndefined();
    expect(spacePath(buildSpaceTree([]), "x")).toEqual([]);
    expect(descendantDeviceIds(undefined, "x")).toEqual([]);
  });
  it("is deterministic", () => {
    const nodes = [n("a", "k"), n("b", "k", "a", ["d"])];
    expect(buildSpaceTree(nodes).roots.map((r) => r.node.id)).toEqual(buildSpaceTree(nodes).roots.map((r) => r.node.id));
  });
});

describe("descendantDeviceIds", () => {
  const tree = buildSpaceTree([n("s", "site", undefined, ["s1", "shared"]), n("r1", "room", "s", ["a", "shared"]), n("r2", "room", "s", ["b"]), n("r1a", "desk", "r1", ["c", "a"])]);
  it("is pre-order, distinct and stable", () => {
    expect(descendantDeviceIds(tree, "s")).toEqual(["s1", "shared", "a", "c", "b"]);
    expect(descendantDeviceIds(tree, "r1")).toEqual(["a", "shared", "c"]);
    expect(descendantDeviceIds(tree, "s", { includeSelf: false })).toEqual(["a", "shared", "c", "b"]);
    expect(descendantDeviceIds(tree, "nope")).toEqual([]);
  });
});

describe("rollupSpaceHealth", () => {
  const tree = buildSpaceTree([n("site", "site"), n("ok", "zone", "site", ["a", "b"]), n("bad", "zone", "site", ["c", "d", "ghost"]), n("empty", "zone", "site")]);
  const devices = [dev("a"), dev("b", { battery: 20 }), dev("c", { status: "offline" }), dev("d", { status: "error" })];
  const rollups = rollupSpaceHealth(tree, devices);

  it("counts by health and connectivity per space", () => {
    expect(rollups.get("ok")).toEqual({ total: 2, healthy: 1, degraded: 0, warning: 1, critical: 0, unknown: 0, offline: 0, missing: 0, worst: "warning" });
    expect(rollups.get("bad")).toEqual({ total: 3, healthy: 0, degraded: 0, warning: 1, critical: 1, unknown: 1, offline: 1, missing: 1, worst: "critical" });
  });
  it("propagates the worst status and sums children into the parent", () => {
    expect(rollups.get("site")).toMatchObject({ total: 5, healthy: 1, warning: 2, critical: 1, offline: 1, worst: "critical" });
  });
  it("gives an empty space a zero rollup with unknown worst", () => {
    expect(rollups.get("empty")).toMatchObject({ total: 0, worst: "unknown" });
    expect(describeSpaceRollup(rollups.get("empty")!)).toBe("No devices.");
    expect(describeSpaceRollup(rollups.get("bad")!)).toBe("0 of 3 healthy, 1 critical, 1 warning, 1 unknown, 1 offline.");
  });
  it("counts a device placed in two child spaces once in the parent", () => {
    const t = buildSpaceTree([n("p", "site"), n("x", "room", "p", ["a"]), n("y", "room", "p", ["a"])]);
    expect(rollupSpaceHealth(t, [dev("a")]).get("p")).toMatchObject({ total: 1, healthy: 1 });
  });
  it("uses alerts", () => {
    const r = rollupSpaceHealth(tree, devices, { alerts: [{ id: "1", deviceId: "a", severity: "critical", message: "m", raisedAt: "2026-09-27T12:00:00Z" }] });
    expect(r.get("ok")).toMatchObject({ critical: 1, worst: "critical" });
  });
  it("handles no tree, no devices", () => {
    expect(rollupSpaceHealth(null, devices).size).toBe(0);
    expect(rollupSpaceHealth(tree, null).get("ok")).toMatchObject({ total: 2, missing: 2, unknown: 2, worst: "unknown" });
  });
});
