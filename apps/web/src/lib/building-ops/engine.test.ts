import { describe, expect, it } from "vitest";
import {
  BUILDING,
  DEFAULT_SEED,
  SCENARIOS,
  buildingOccupancy,
  deriveAlerts,
  deriveSnapshot,
  findFloor,
  floorCameraSummary,
  floorOccupancy,
  getScenario,
  initialViewState,
  reduceView,
  type ScenarioId,
} from "./index";

const snap = (id: ScenarioId, seconds: number, seed = DEFAULT_SEED) => deriveSnapshot(BUILDING, getScenario(id), seed, seconds * 1000);
const alerts = (id: ScenarioId, seconds: number) => deriveAlerts(BUILDING, getScenario(id), DEFAULT_SEED, seconds * 1000);
const floor = (id: string) => findFloor(BUILDING, id)!;
const open = (list: ReturnType<typeof alerts>) => list.filter((a) => !a.resolvedAt);

describe("fixtures", () => {
  it("gives every camera a unique name and every zone a positive capacity", () => {
    const cameras = BUILDING.floors.flatMap((f) => f.cameras);
    expect(new Set(cameras.map((c) => c.name)).size).toBe(cameras.length);
    expect(new Set(cameras.map((c) => c.network.ip)).size).toBe(cameras.length);
    for (const z of BUILDING.floors.flatMap((f) => f.zones)) expect(z.capacity).toBeGreaterThan(0);
  });

  it("places every camera inside the zone it belongs to", () => {
    for (const f of BUILDING.floors) {
      for (const c of f.cameras) {
        const z = f.zones.find((x) => x.id === c.zoneId)!;
        expect(c.x, c.name).toBeGreaterThanOrEqual(z.rect.x);
        expect(c.x, c.name).toBeLessThanOrEqual(z.rect.x + z.rect.width);
        expect(c.y, c.name).toBeGreaterThanOrEqual(z.rect.y);
        expect(c.y, c.name).toBeLessThanOrEqual(z.rect.y + z.rect.height);
      }
    }
  });

  it("has the five scenarios, each opening on a camera that is on its floor", () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual(["normal", "crowded", "camera-offline", "stale-telemetry", "recovery"]);
    for (const s of SCENARIOS) expect(floor(s.floorId).cameras.some((c) => c.id === s.cameraId)).toBe(true);
  });
});

describe("determinism", () => {
  it("returns the same snapshot for the same scenario, seed and time", () => {
    expect(JSON.stringify(snap("crowded", 42))).toBe(JSON.stringify(snap("crowded", 42)));
    expect(JSON.stringify(alerts("recovery", 35))).toBe(JSON.stringify(alerts("recovery", 35)));
  });

  it("varies with the seed", () => {
    expect(JSON.stringify(snap("normal", 20, 1).zones)).not.toBe(JSON.stringify(snap("normal", 20, 2).zones));
  });

  it("does not depend on the path taken to a time (no hidden state)", () => {
    const direct = snap("recovery", 61);
    for (const t of [0, 10, 25, 40]) snap("recovery", t);
    expect(snap("recovery", 61)).toEqual(direct);
  });
});

describe("normal operation", () => {
  it("raises nothing and keeps every reading fresh for the first ten minutes", () => {
    for (let t = 0; t <= 600; t += 30) {
      expect(open(alerts("normal", t)), `t=${t}s`).toEqual([]);
      const s = snap("normal", t);
      expect(Object.values(s.zones).every((z) => z.freshness === "fresh" && z.load !== "over")).toBe(true);
      expect(Object.values(s.cameras).every((c) => c.connectivity === "online" && c.telemetryFreshness === "fresh")).toBe(true);
    }
  });
});

describe("occupancy totals", () => {
  it("adds up fresh zone readings, and is kept apart from the camera count", () => {
    const s = snap("normal", 0);
    const gf = floor("gf");
    const occ = floorOccupancy(gf, s);
    const sum = gf.zones.reduce((n, z) => n + s.zones[z.id]!.value!, 0);
    expect(occ.people).toBe(sum);
    expect(occ.reportingZones).toBe(gf.zones.length);
    expect(occ.notReporting).toEqual([]);
    expect(occ.capacity).toBe(gf.zones.reduce((n, z) => n + z.capacity, 0));
    // Occupancy is people; the camera summary is devices. Different numbers, different sources.
    expect(floorCameraSummary(gf, s).total).toBe(gf.cameras.length);
    expect(occ.people).not.toBe(gf.cameras.length);
  });

  it("building total is the sum of the floor totals", () => {
    const s = snap("normal", 15);
    const b = buildingOccupancy(BUILDING, s);
    expect(b.people).toBe(BUILDING.floors.reduce((n, f) => n + (floorOccupancy(f, s).people ?? 0), 0));
    expect(b.totalZones).toBe(BUILDING.floors.reduce((n, f) => n + f.zones.length, 0));
    expect(b.partialFloors).toEqual([]);
  });

  it("flags a crowded zone over capacity and raises a critical alert once it crosses", () => {
    const before = snap("crowded", 0).zones["gf-atr"]!;
    expect(before.load).toBe("busy");
    expect(before.value!).toBeLessThanOrEqual(180);
    const after = snap("crowded", 60).zones["gf-atr"]!;
    expect(after.load).toBe("over");
    expect(after.value!).toBeGreaterThan(180);
    expect(floorOccupancy(floor("gf"), snap("crowded", 60)).overCapacity).toEqual(["gf-atr"]);

    const early = open(alerts("crowded", 0)).find((a) => a.deviceId === "gf-atr")!;
    expect(early.severity).toBe("warning");
    const late = open(alerts("crowded", 60)).find((a) => a.deviceId === "gf-atr")!;
    expect(late.severity).toBe("critical");
    // Same episode: escalation keeps the moment the condition began.
    expect(late.raisedAt).toBe(early.raisedAt);
    expect(late.message).toContain(`${after.value} people for 180`);
  });
});

describe("stale and offline", () => {
  it("keeps a silent sensor's last count as last known, never as current and never as zero", () => {
    const s = snap("stale-telemetry", 0);
    const meet = s.zones["l1-meet"]!;
    expect(meet.freshness).toBe("stale");
    expect(meet.value).not.toBeNull();
    expect(meet.value).toBeGreaterThan(0);
    expect(meet.load).toBeNull();
    expect(Date.parse(s.now) - Date.parse(meet.observedAt!)).toBeGreaterThanOrEqual(180_000);

    const occ = floorOccupancy(floor("l1"), s);
    expect(occ.notReporting).toEqual(["l1-meet"]);
    expect(occ.reportingZones).toBe(floor("l1").zones.length - 1);
    const freshSum = floor("l1").zones.filter((z) => z.id !== "l1-meet").reduce((n, z) => n + s.zones[z.id]!.value!, 0);
    expect(occ.people).toBe(freshSum);
    expect(buildingOccupancy(BUILDING, s).partialFloors).toEqual(["l1"]);
  });

  it("marks an answering camera's stopped telemetry stale without calling the camera offline", () => {
    const cam = snap("stale-telemetry", 0).cameras["l1-cam-5"]!;
    expect(cam.connectivity).toBe("online");
    expect(cam.telemetryFreshness).toBe("stale");
    expect(cam.telemetry).not.toBeNull();
    const kinds = open(alerts("stale-telemetry", 0)).map((a) => `${a.kind}:${a.deviceId}`).sort();
    expect(kinds).toEqual(["stale-reading:l1-meet", "stale-telemetry:l1-cam-5"]);
  });

  it("shows an offline camera with its last heartbeat and last known telemetry, and leaves occupancy alone", () => {
    const s = snap("camera-offline", 0);
    const cam = s.cameras["l2-cam-3"]!;
    expect(cam.connectivity).toBe("offline");
    expect(cam.telemetryFreshness).toBe("stale");
    expect(Date.parse(s.now) - Date.parse(cam.lastSeenAt)).toBeGreaterThanOrEqual(240_000);
    const summary = floorCameraSummary(floor("l2"), s);
    expect(summary).toMatchObject({ total: 6, online: 5, down: 1 });
    // A camera going offline says nothing about how many people are on the floor.
    expect(floorOccupancy(floor("l2"), s).reportingZones).toBe(floor("l2").zones.length);
    const a = open(alerts("camera-offline", 0));
    expect(a.map((x) => `${x.kind}:${x.deviceId}`)).toEqual(["device-offline:l2-cam-3"]);
  });
});

describe("recovery after a link failure", () => {
  it("has no floor total while the link is down, rather than zero", () => {
    const s = snap("recovery", 0);
    expect(s.links.l3).toBe("down");
    const occ = floorOccupancy(floor("l3"), s);
    expect(occ.people).toBeNull();
    expect(occ.reportingZones).toBe(0);
    for (const z of floor("l3").zones) expect(s.zones[z.id]!.freshness).toBe("stale");
    for (const c of floor("l3").cameras) expect(s.cameras[c.id]!.connectivity).toBe("unreachable");
    // One floor alert, not one per device.
    expect(open(alerts("recovery", 0)).map((a) => `${a.kind}:${a.deviceId}:${a.severity}`)).toEqual(["network-link:l3:critical"]);
  });

  it("reconnects, then recovers: devices online, readings fresh, alert resolved", () => {
    expect(snap("recovery", 22).cameras["l3-cam-1"]!.connectivity).toBe("connecting");
    expect(open(alerts("recovery", 22))[0]!.message).toContain("reconnecting");

    const s = snap("recovery", 31);
    expect(s.links.l3).toBe("up");
    for (const c of floor("l3").cameras) {
      expect(s.cameras[c.id]!.connectivity).toBe("online");
      expect(s.cameras[c.id]!.telemetryFreshness).toBe("fresh");
    }
    const occ = floorOccupancy(floor("l3"), s);
    expect(occ.reportingZones).toBe(floor("l3").zones.length);
    expect(occ.people).toBeGreaterThan(0);

    const all = alerts("recovery", 31);
    expect(open(all)).toEqual([]);
    const resolved = all.find((a) => a.kind === "network-link")!;
    expect(resolved.resolvedAt).toBe("2026-03-10T09:30:30.000Z");
    expect(resolved.message).toContain("restored");
  });
});

describe("view state synchronisation", () => {
  const recovery = getScenario("recovery");

  it("opens on the scenario's floor and camera", () => {
    expect(initialViewState(recovery)).toMatchObject({ floorId: "l3", cameraId: "l3-cam-1", zoneId: null, status: "all" });
  });

  it("re-targets the selected camera and clears the zone filter on a floor change", () => {
    let v = initialViewState(recovery);
    v = reduceView(BUILDING, v, { type: "zone", zoneId: "l3-kit" });
    expect(v.cameraId).toBe("l3-cam-6");
    v = reduceView(BUILDING, v, { type: "floor", floorId: "gf" });
    expect(v).toMatchObject({ floorId: "gf", cameraId: "gf-cam-1", zoneId: null });
  });

  it("moves to the camera's floor when a camera on another floor is selected", () => {
    const v = reduceView(BUILDING, initialViewState(recovery), { type: "camera", cameraId: "b1-cam-5" });
    expect(v).toMatchObject({ floorId: "b1", cameraId: "b1-cam-5", zoneId: null });
  });

  it("keeps the selection when the zone filter already contains it, and drops a filter that would hide it", () => {
    let v = reduceView(BUILDING, initialViewState(recovery), { type: "zone", zoneId: "l3-wsw" });
    expect(v.cameraId).toBe("l3-cam-1");
    v = reduceView(BUILDING, v, { type: "camera", cameraId: "l3-cam-2" });
    expect(v.zoneId).toBeNull();
  });

  it("ignores unknown ids", () => {
    const v = initialViewState(recovery);
    expect(reduceView(BUILDING, v, { type: "floor", floorId: "l9" })).toBe(v);
    expect(reduceView(BUILDING, v, { type: "camera", cameraId: "nope" })).toBe(v);
  });
});
