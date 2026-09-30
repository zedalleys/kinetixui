import { describe, expect, it } from "vitest";
import {
  assessDevices,
  deriveDeviceConnectivity,
  deriveDeviceHealth,
  describeConnectivity,
  describeDeviceHealth,
  healthRank,
  summarizeDeviceState,
  summarizeFleetHealth,
  worseHealth,
  type KinetixDevice,
  type KinetixDeviceAlert,
  type KinetixDeviceState,
} from "./index";

const NOW = "2026-09-27T12:00:00.000Z";
const dev = (id: string, over: Partial<KinetixDevice> = {}): KinetixDevice => ({ id, name: id, type: "sensor", status: "online", ...over });
const alert = (over: Partial<KinetixDeviceAlert>): KinetixDeviceAlert => ({ id: "a", deviceId: "d1", severity: "warning", message: "m", raisedAt: NOW, ...over });

describe("deriveDeviceHealth", () => {
  it("is healthy only with positive evidence, unknown with none", () => {
    expect(deriveDeviceHealth({ connectivity: { state: "online" } }).level).toBe("healthy");
    expect(deriveDeviceHealth({ battery: 80 }).level).toBe("healthy");
    expect(deriveDeviceHealth({}).level).toBe("unknown");
    expect(deriveDeviceHealth().level).toBe("unknown");
    expect(deriveDeviceHealth({ status: "disabled" }).level).toBe("unknown");
    expect(deriveDeviceHealth({ battery: NaN }).level).toBe("unknown");
  });

  it("takes the worst reason and orders reasons worst-first", () => {
    const h = deriveDeviceHealth({
      connectivity: { state: "stale" },
      battery: 5,
      firmware: { status: "unknown", currentVersion: "1.0", availableVersion: "1.1" },
    });
    expect(h.level).toBe("critical");
    expect(h.reasons.map((r) => r.code)).toEqual(["battery-critical", "stale", "firmware-update-available"]);
  });

  it("maps connectivity", () => {
    expect(deriveDeviceHealth({ connectivity: { state: "offline" } }).level).toBe("warning");
    expect(deriveDeviceHealth({ connectivity: { state: "unreachable" } }).reasons[0]?.code).toBe("unreachable");
    expect(deriveDeviceHealth({ connectivity: { state: "stale" } }).level).toBe("degraded");
    expect(deriveDeviceHealth({ status: "offline" }).reasons[0]?.code).toBe("offline");
    expect(deriveDeviceHealth({ status: "error", connectivity: { state: "online" } }).level).toBe("critical");
    expect(deriveDeviceHealth({ status: "warning" }).level).toBe("warning");
  });

  it("maps battery bands and firmware failures", () => {
    expect(deriveDeviceHealth({ battery: 20, connectivity: { state: "online" } }).level).toBe("warning");
    expect(deriveDeviceHealth({ battery: 50, connectivity: { state: "online" } }).level).toBe("healthy");
    expect(deriveDeviceHealth({ firmware: { status: "failed" } }).reasons[0]?.code).toBe("firmware-failed");
    expect(deriveDeviceHealth({ firmware: { status: "up-to-date", currentVersion: "2", availableVersion: "2" } }).level).toBe("healthy");
  });

  it("counts uncleared faults only, by severity", () => {
    const faults = [
      { id: "f1", code: "E1", message: "Jam", severity: "critical" as const },
      { id: "f2", code: "E2", message: "Old", severity: "critical" as const, clearedAt: NOW },
      { id: "f3", code: "E3", message: "Note", severity: "info" as const },
    ];
    const h = deriveDeviceHealth({ faults, connectivity: { state: "online" } });
    expect(h.level).toBe("critical");
    expect(h.faults.map((f) => f.id)).toEqual(["f1", "f3"]);
    expect(deriveDeviceHealth({ faults: [faults[1]!], connectivity: { state: "online" } }).level).toBe("healthy");
  });

  it("alerts: acknowledged still count, resolved and info do not", () => {
    const online = { connectivity: { state: "online" as const } };
    expect(deriveDeviceHealth({ ...online, alerts: [alert({ severity: "critical", acknowledgedAt: NOW })] }).level).toBe("critical");
    expect(deriveDeviceHealth({ ...online, alerts: [alert({ severity: "critical", resolvedAt: NOW })] }).level).toBe("healthy");
    expect(deriveDeviceHealth({ ...online, alerts: [alert({ severity: "info" })] }).level).toBe("healthy");
    const h = deriveDeviceHealth({ ...online, alerts: [alert({ severity: "warning" }), alert({ id: "b", severity: "warning" })] });
    expect(h.reasons[0]?.message).toBe("2 warnings");
  });

  it("tolerates junk arrays and is deterministic", () => {
    expect(deriveDeviceHealth({ faults: null, alerts: [null as never], connectivity: { state: "online" } }).level).toBe("healthy");
    const input = { battery: 15, connectivity: { state: "offline" as const } };
    expect(deriveDeviceHealth(input)).toEqual(deriveDeviceHealth(input));
  });
});

describe("health ranking", () => {
  it("orders levels and puts unknown below everything", () => {
    expect(["unknown", "healthy", "degraded", "warning", "critical"].map((l) => healthRank(l as never))).toEqual([-1, 0, 1, 2, 3]);
    expect(worseHealth("unknown", "healthy")).toBe("healthy");
    expect(worseHealth("warning", "degraded")).toBe("warning");
    expect(worseHealth("unknown", "unknown")).toBe("unknown");
  });
  it("has words", () => {
    expect(describeDeviceHealth("unknown")).toBe("Health unknown");
    expect(describeConnectivity("unreachable")).toBe("Unreachable");
  });
});

describe("deriveDeviceConnectivity", () => {
  it("maps status, and only marks stale by age when asked", () => {
    expect(deriveDeviceConnectivity({ status: "offline" }).state).toBe("offline");
    expect(deriveDeviceConnectivity({ status: "stale" }).state).toBe("stale");
    expect(deriveDeviceConnectivity({ status: "updating" }).state).toBe("online");
    const old = { status: "online" as const, lastSeenAt: "2026-09-27T10:00:00.000Z", signal: 40 };
    expect(deriveDeviceConnectivity(old, { now: NOW }).state).toBe("online");
    expect(deriveDeviceConnectivity(old, { now: NOW, staleAfterMs: 3_600_000 })).toEqual({ state: "stale", lastSeenAt: old.lastSeenAt, signal: 40 });
    expect(deriveDeviceConnectivity({ status: "online" }, { now: NOW, staleAfterMs: 1000 }).state).toBe("stale");
  });
});

describe("summarizeDeviceState", () => {
  const base: KinetixDeviceState = {
    device: dev("pump-1", { name: "Pump 1", type: "pump" }),
    connectivity: { state: "online" },
    health: { level: "healthy", reasons: [], faults: [] },
    capabilities: [{ id: "power", kind: "power" }],
    confirmedValues: { power: false },
    requestedValues: { power: true },
    pendingCommands: [],
    faults: [],
    alerts: [],
  };
  it("reports unconfirmed requests as requests", () => {
    const s = summarizeDeviceState(base);
    expect(s.unconfirmed).toEqual(["power"]);
    expect(s.description).toBe("Pump 1: healthy. online. 1 change requested but not confirmed.");
    expect(s.needsAttention).toBe(false);
  });
  it("a confirmed value is not unconfirmed; pending commands are counted", () => {
    const s = summarizeDeviceState({ ...base, requestedValues: { power: false }, pendingCommands: [{ id: "c", deviceId: "pump-1", name: "x", status: "sent", createdAt: NOW }] });
    expect(s.unconfirmed).toEqual([]);
    expect(s.pendingCommands).toBe(1);
    expect(s.description).toContain("1 command in progress");
  });
  it("flags attention and counts open items", () => {
    const s = summarizeDeviceState({
      ...base,
      connectivity: { state: "unreachable" },
      health: { level: "warning", reasons: [], faults: [] },
      faults: [{ id: "f", code: "c", message: "m", severity: "warning" }, { id: "g", code: "c", message: "m", severity: "warning", clearedAt: NOW }],
      alerts: [alert({}), alert({ id: "b", resolvedAt: NOW })],
    });
    expect(s).toMatchObject({ needsAttention: true, activeFaults: 1, activeAlerts: 1, connectivity: "unreachable" });
  });
});

describe("fleet health", () => {
  const devices = [
    dev("ok"),
    dev("low", { battery: 20 }),
    dev("dead", { status: "offline" }),
    dev("bad", { status: "error" }),
    dev("quiet", { status: "disabled" }),
  ];
  it("counts every level, sums to total, lists offline separately and sorts worst-first", () => {
    const s = summarizeFleetHealth(devices, { now: NOW });
    expect(s.total).toBe(5);
    expect(s.byHealth).toEqual({ healthy: 1, degraded: 0, warning: 2, critical: 1, unknown: 1 });
    expect(Object.values(s.byHealth).reduce((a, b) => a + b, 0)).toBe(s.total);
    expect(s.offline).toBe(1);
    expect(s.worst).toBe("critical");
    expect(s.entries.map((e) => e.device.id)).toEqual(["bad", "low", "dead", "ok", "quiet"]);
    expect(s.description).toBe("1 of 5 healthy, 1 critical, 2 warning, 1 unknown, 1 offline.");
  });
  it("uses alerts by device id", () => {
    const s = summarizeFleetHealth([dev("ok")], { alerts: [alert({ deviceId: "ok", severity: "critical" }), alert({ deviceId: "other", severity: "critical" })] });
    expect(s.worst).toBe("critical");
  });
  it("handles empty and junk input", () => {
    expect(summarizeFleetHealth([])).toMatchObject({ total: 0, worst: "unknown", description: "No devices." });
    expect(summarizeFleetHealth(null).total).toBe(0);
    expect(assessDevices([null as never, dev("x")])).toHaveLength(1);
  });
  it("is stable: equal levels keep input order", () => {
    const s = summarizeFleetHealth([dev("b"), dev("a"), dev("c")]);
    expect(s.entries.map((e) => e.device.id)).toEqual(["b", "a", "c"]);
  });
});
