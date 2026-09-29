import { describe, expect, it } from "vitest";
import {
  canRunAutomation,
  clampLevel,
  compareAutomationAttention,
  describeAutomationStatus,
  describePowerState,
  describeRelativeTime,
  formatRelativeTime,
  millisecondsUntil,
  normalizePowerState,
  resolveActiveMode,
  resolveControlState,
  resolveDeviceCategory,
  snapToStep,
} from "./index";

/**
 * The headless control layer.
 *
 * These are the rules every React control depends on, so they are tested here once rather than
 * re-asserted through the DOM in five components.
 */

const NOW = "2026-09-27T12:00:00.000Z";
const at = (offsetMs: number) => new Date(Date.parse(NOW) + offsetMs).toISOString();

describe("resolveControlState", () => {
  it("fails safe when the device status is unreported", () => {
    // `normalizeDeviceStatus` maps an absent status to "offline" package-wide, and this inherits it
    // rather than inventing a second rule: a control for a device nothing is known about should not
    // look live. An explicitly online device is what produces a ready control.
    expect(resolveControlState()).toMatchObject({ availability: "offline", interactive: false });
    expect(resolveControlState({ deviceStatus: "online" })).toMatchObject({
      availability: "ready",
      phase: "idle",
      interactive: true,
    });
  });

  it("puts an explicit disabled above everything else", () => {
    const state = resolveControlState({ disabled: true, deviceStatus: "online", commandStatus: "completed" });
    expect(state.availability).toBe("unavailable");
    expect(state.interactive).toBe(false);
  });

  it("lets device status outrank an in-flight command", () => {
    // The command cannot be pending in any useful sense if the device is offline.
    const state = resolveControlState({ deviceStatus: "offline", commandStatus: "sent" });
    expect(state.availability).toBe("offline");
    expect(state.interactive).toBe(false);
  });

  it("marks an in-flight command pending and locks the control", () => {
    const state = resolveControlState({ deviceStatus: "online", commandStatus: "sent" });
    expect(state).toMatchObject({ availability: "pending", phase: "requested", interactive: false });
  });

  it("keeps a stale device interactive", () => {
    // Sending a command is how you discover whether a quiet device is still there, so stale must not
    // lock the control the way offline does.
    const state = resolveControlState({ deviceStatus: "stale" });
    expect(state.availability).toBe("stale");
    expect(state.interactive).toBe(true);
    expect(state.lastKnown).toBe(true);
  });

  it("reports a failed command without making the device unusable", () => {
    const state = resolveControlState({ deviceStatus: "online", commandStatus: "failed" });
    expect(state.phase).toBe("failed");
    expect(state.interactive).toBe(true);
  });

  it("carries a description for every state it returns", () => {
    for (const deviceStatus of ["online", "offline", "stale", "error", "updating"] as const) {
      expect(resolveControlState({ deviceStatus }).description.length).toBeGreaterThan(0);
    }
  });
});

describe("power state", () => {
  it("maps booleans and keeps unknown distinct from off", () => {
    expect(normalizePowerState(true)).toBe("on");
    expect(normalizePowerState(false)).toBe("off");
    // The distinction that matters: a device that has not reported is not a device that is off.
    expect(normalizePowerState(null)).toBe("unknown");
    expect(normalizePowerState(undefined)).toBe("unknown");
  });

  it("names the transition while a request is unconfirmed", () => {
    // "Turning on" rather than "Off": the user asked, the device has not agreed, and the word says
    // exactly that without claiming either state.
    expect(describePowerState("off", "on")).toBe("Turning on");
    expect(describePowerState("on", "off")).toBe("Turning off");
    // No request, or a request matching what is confirmed, is just the state.
    expect(describePowerState("on", "on")).toBe("On");
    expect(describePowerState("unknown")).toBe("Unknown");
  });
});

describe("level maths", () => {
  it("returns null for an unreported level instead of pretending it is zero", () => {
    expect(clampLevel(null)).toBeNull();
    expect(clampLevel(undefined)).toBeNull();
    expect(clampLevel(Number.NaN)).toBeNull();
    // Zero is a real level and must survive.
    expect(clampLevel(0)).toBe(0);
  });

  it("clamps to the range", () => {
    expect(clampLevel(120)).toBe(100);
    expect(clampLevel(-5)).toBe(0);
    expect(clampLevel(50, 0, 10)).toBe(10);
  });

  it("snaps to the step without escaping the range", () => {
    expect(snapToStep(23, 0, 100, 10)).toBe(20);
    expect(snapToStep(26, 0, 100, 10)).toBe(30);
    expect(snapToStep(999, 0, 100, 7)).toBeLessThanOrEqual(100);
    expect(snapToStep(-999, 0, 100, 7)).toBeGreaterThanOrEqual(0);
  });
});

describe("resolveActiveMode", () => {
  const modes = [
    { id: "heat", label: "Heat" },
    { id: "cool", label: "Cool" },
    { id: "eco", label: "Eco", unavailable: true },
  ];

  it("keeps the confirmed mode and the requested one apart", () => {
    // The whole point of the layer: it does not collapse them into one "current" mode, because the
    // UI has to draw the confirmed one as selected and the requested one as merely asked for.
    const { active, pendingId } = resolveActiveMode(modes, "heat", "cool");
    expect(active?.id).toBe("heat");
    expect(pendingId).toBe("cool");
  });

  it("reports no pending mode when the request already matches", () => {
    expect(resolveActiveMode(modes, "heat", "heat").pendingId).toBeNull();
    expect(resolveActiveMode(modes, "heat").pendingId).toBeNull();
  });

  it("leaves active undefined for an id the product did not supply", () => {
    expect(resolveActiveMode(modes, "turbo").active).toBeUndefined();
  });
});

describe("resolveDeviceCategory", () => {
  it("infers from the device's own type string", () => {
    expect(resolveDeviceCategory({ type: "smart light" })).toBe("light");
    expect(resolveDeviceCategory({ type: "door lock" })).toBe("lock");
    expect(resolveDeviceCategory({ type: "soil moisture sensor" })).toBe("sensor");
  });

  it("falls back to unknown rather than guessing", () => {
    expect(resolveDeviceCategory({ type: "flux capacitor" })).toBe("unknown");
    expect(resolveDeviceCategory(null)).toBe("unknown");
    expect(resolveDeviceCategory("")).toBe("unknown");
  });
});

describe("relative time", () => {
  it("reads a future timestamp as future", () => {
    // The regression this exists for: formatLastSeen floors elapsed time at zero, so it renders
    // tomorrow's scheduled run as "just now". A next-run must not go through it.
    expect(formatRelativeTime(at(4 * 3_600_000), { now: NOW })).toBe("in 4h");
    expect(describeRelativeTime(at(4 * 3_600_000), { now: NOW })).toBe("in 4 hours");
    expect(formatRelativeTime(at(26 * 3_600_000), { now: NOW })).toBe("in 1d");
  });

  it("reads a past timestamp as past", () => {
    expect(formatRelativeTime(at(-5 * 60_000), { now: NOW })).toBe("5m ago");
    expect(describeRelativeTime(at(-1 * 60_000), { now: NOW })).toBe("1 minute ago");
  });

  it("collapses either side of now", () => {
    expect(formatRelativeTime(at(5_000), { now: NOW })).toBe("now");
    expect(formatRelativeTime(at(-5_000), { now: NOW })).toBe("now");
  });

  it("returns a signed delta, unlike millisecondsSince", () => {
    expect(millisecondsUntil(at(60_000), NOW)).toBe(60_000);
    expect(millisecondsUntil(at(-60_000), NOW)).toBe(-60_000);
    expect(millisecondsUntil(null, NOW)).toBeNull();
  });

  it("labels an absent timestamp", () => {
    expect(formatRelativeTime(undefined, { now: NOW })).toBe("Unknown");
    expect(formatRelativeTime(undefined, { now: NOW, unknownLabel: "Not scheduled" })).toBe("Not scheduled");
  });
});

describe("automations", () => {
  it("reads a disarmed automation as off whatever its status says", () => {
    expect(describeAutomationStatus("idle", false)).toBe("Off");
    expect(describeAutomationStatus("idle", true)).toBe("Idle");
  });

  it("refuses a second run while one is in flight", () => {
    // Duplicate-run protection: cosmetic on a lighting scene, not on an irrigation valve.
    expect(canRunAutomation({ status: "running", enabled: true })).toBe(false);
    expect(canRunAutomation({ status: "idle", enabled: false })).toBe(false);
    expect(canRunAutomation({ status: "idle", enabled: true })).toBe(true);
    expect(canRunAutomation({ status: "failed", enabled: true })).toBe(true);
  });

  it("sorts failures first and preserves the product's order within a band", () => {
    const items = [
      { id: "a", status: "idle" as const },
      { id: "b", status: "failed" as const },
      { id: "c", status: "running" as const },
      { id: "d", status: "idle" as const },
    ];
    expect([...items].sort(compareAutomationAttention).map((i) => i.id)).toEqual(["b", "c", "a", "d"]);
    // "a" before "d" is the point: equal ranks must not be reordered, matching compareDeviceAttention.
  });
});
