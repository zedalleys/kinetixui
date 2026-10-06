import { describe, expect, it } from "vitest";
import {
  KINETIX_CONNECTIVITY_STATES,
  assessDevices,
  deriveDeviceConnectivity,
  deriveDeviceHealth,
  describeConnectivity,
  summarizeDeviceState,
  type KinetixConnectivityState,
  type KinetixDeviceState,
} from "./index";

/**
 * M2A connectivity truth (gap G4 in docs/iot/IOT-MATURITY-AUDIT.md).
 *
 * Every state needs its own evidence, and the absence of evidence is its own state. The failure this
 * guards against is the convenient one: a missing field rendered as "Offline", which tells a reader a
 * device is gone when all that is true is that nobody said.
 */

const base = (connectivity?: KinetixConnectivityState): KinetixDeviceState =>
  ({
    device: { id: "p1", name: "Pump", type: "pump", status: "online" },
    ...(connectivity ? { connectivity: { state: connectivity } } : {}),
    capabilities: [],
    confirmedValues: {},
    requestedValues: {},
    pendingCommands: [],
    faults: [],
    alerts: [],
  }) as unknown as KinetixDeviceState;

describe("connectivity: missing information is unknown, never offline", () => {
  it("(1) a state with no connectivity summarises as unknown", () => {
    const summary = summarizeDeviceState(base());
    expect(summary.connectivity).toBe("unknown");
    expect(summary.description).not.toMatch(/offline/i);
    expect(summary.description).toContain("connection unknown");
    expect(summary.needsAttention).toBe(false);
  });

  it("(1) a missing or unrecognised status derives unknown connectivity", () => {
    expect(deriveDeviceConnectivity({}).state).toBe("unknown");
    expect(deriveDeviceConnectivity({ status: null as never }).state).toBe("unknown");
    expect(deriveDeviceConnectivity({ status: "garbled-field" as never }).state).toBe("unknown");
    // A recognised offline status is still offline: the change is about evidence, not optimism.
    expect(deriveDeviceConnectivity({ status: "offline" }).state).toBe("offline");
    expect(deriveDeviceConnectivity({ status: "disconnected" as never }).state).toBe("offline");
  });

  it("(1) health does not invent an offline reason from an unreadable status", () => {
    const health = deriveDeviceHealth({ status: "garbled-field" });
    expect(health.level).toBe("unknown");
    expect(health.reasons).toEqual([]);
  });

  it("(2) connecting is distinct from offline everywhere it is read", () => {
    expect(describeConnectivity("connecting")).toBe("Connecting");
    expect(describeConnectivity("connecting")).not.toBe(describeConnectivity("offline"));
    const summary = summarizeDeviceState(base("connecting"));
    expect(summary.connectivity).toBe("connecting");
    expect(summary.needsAttention).toBe(false);
    expect(deriveDeviceHealth({ connectivity: { state: "connecting" } })).toEqual({ level: "unknown", reasons: [], faults: [] });
  });

  it("(3) unknown → connecting → online reads truthfully at every step", () => {
    const steps = (["unknown", "connecting", "online"] as const).map((state) => ({
      words: describeConnectivity(state),
      summary: summarizeDeviceState(base(state)).description,
      health: deriveDeviceHealth({ connectivity: { state } }).level,
    }));
    expect(steps.map((s) => s.words)).toEqual(["Connection unknown", "Connecting", "Online"]);
    expect(steps.map((s) => s.health)).toEqual(["unknown", "unknown", "healthy"]);
    for (const step of steps) expect(step.summary).not.toMatch(/offline/i);
  });

  it("(4) online → unreachable is a failed attempt, not offline", () => {
    expect(describeConnectivity("unreachable")).toBe("Unreachable");
    const summary = summarizeDeviceState(base("unreachable"));
    expect(summary.connectivity).toBe("unreachable");
    expect(summary.needsAttention).toBe(true);
    expect(deriveDeviceHealth({ connectivity: { state: "unreachable" } }).reasons[0]?.code).toBe("unreachable");
    // A backend that literally reports "unreachable" keeps the word instead of becoming "offline".
    expect(deriveDeviceConnectivity({ status: "unreachable" as never }).state).toBe("unreachable");
    expect(deriveDeviceHealth({ status: "unreachable" }).reasons[0]?.code).toBe("unreachable");
  });

  it("(5) stale stays distinct from offline and from online", () => {
    expect(describeConnectivity("stale")).toBe("Data is out of date");
    expect(deriveDeviceHealth({ connectivity: { state: "stale" } }).level).toBe("degraded");
    expect(summarizeDeviceState(base("stale")).connectivity).toBe("stale");
  });

  it("(6, 21) every state has its own description, and summarizers repeat it rather than a neighbour's", () => {
    const words = KINETIX_CONNECTIVITY_STATES.map(describeConnectivity);
    expect(new Set(words).size).toBe(KINETIX_CONNECTIVITY_STATES.length);
    expect(KINETIX_CONNECTIVITY_STATES).toEqual(["unreachable", "offline", "stale", "connecting", "unknown", "online"]);
    for (const state of KINETIX_CONNECTIVITY_STATES) {
      const summary = summarizeDeviceState(base(state));
      expect(summary.connectivity).toBe(state);
      expect(summary.description).toContain(describeConnectivity(state).toLowerCase());
      if (state !== "offline") expect(summary.description).not.toMatch(/\boffline\b/i);
    }
  });

  it("(6) fleet assessment counts an unreadable status as unknown, not as an offline device", () => {
    const [entry] = assessDevices([{ id: "x", name: "X", type: "sensor", status: "??" as never }]);
    expect(entry!.connectivity.state).toBe("unknown");
    expect(entry!.health.level).toBe("unknown");
  });
});
