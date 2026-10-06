import { describe, expect, it } from "vitest";
import {
  classifyBatteryLevel,
  describeActivityOrigin,
  describeCommandFeedback,
  describeDeviceBattery,
  describeDeviceConnection,
  describeReadingAge,
  describeTelemetryReading,
  normalizeConnectivityState,
  resolveActivityOrigin,
  resolveBatteryState,
  resolveBatteryThresholds,
  resolveFreshness,
  resolveReadingDelta,
  startCommandLifecycle,
  summarizeDeviceState,
  transitionCommandLifecycle,
  type KinetixCommandLifecycle,
  type KinetixCommandLifecycleEvent,
} from "./index";

/**
 * M3 at the contract level: freshness, battery, connection, readings, command feedback and activity
 * origin, as pure functions. Numbers in parentheses are the brief's required cases; the rendered half
 * is `react/monitoring.test.tsx` and the browser half `pnpm check:iot-monitoring`.
 */

const NOW = "2026-10-06T12:00:00.000Z";
const MIN = 60_000;
const ago = (ms: number) => new Date(Date.parse(NOW) - ms).toISOString();

function run<T>(state: KinetixCommandLifecycle<T>, ...events: KinetixCommandLifecycleEvent[]): KinetixCommandLifecycle<T> {
  let s = state;
  let at = Date.parse(NOW) - 10 * MIN;
  for (const event of events) {
    const result = transitionCommandLifecycle(s, event, (at += 1000));
    if (!result.ok) throw new Error(`${event.type} refused from ${s.stage}: ${result.rejection.code}`);
    s = result.state;
  }
  return s;
}

describe("freshness contract", () => {
  it("is fresh within the product's window and stale past it", () => {
    expect(resolveFreshness({ observedAt: ago(MIN), staleAfterMs: 10 * MIN, now: NOW })).toBe("fresh");
    expect(resolveFreshness({ observedAt: ago(11 * MIN), staleAfterMs: 10 * MIN, now: NOW })).toBe("stale");
  });

  it("has no hidden timeout: without a policy, an hours-old reading is unknown, not stale or fresh", () => {
    expect(resolveFreshness({ observedAt: ago(600 * MIN), now: NOW })).toBe("unknown");
    for (const staleAfterMs of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, null]) {
      expect(resolveFreshness({ observedAt: ago(MIN), staleAfterMs, now: NOW })).toBe("unknown");
    }
  });

  it("calls undated data unknown rather than guessing", () => {
    for (const observedAt of [undefined, null, "", "not a date"]) {
      expect(resolveFreshness({ observedAt, staleAfterMs: 10 * MIN, now: NOW })).toBe("unknown");
    }
  });

  it("lets an explicit answer win and ignores an unrecognised one", () => {
    expect(resolveFreshness({ observedAt: ago(MIN), staleAfterMs: 10 * MIN, now: NOW, freshness: "stale" })).toBe("stale");
    expect(resolveFreshness({ observedAt: ago(MIN), staleAfterMs: 10 * MIN, now: NOW, freshness: "live" as never })).toBe("fresh");
  });

  it("(16) is independent from connectivity: online + stale, offline + fresh, unknown + stale", () => {
    // Connectivity comes from the device state; freshness from one reading's timestamp. Neither reads the other.
    const online = summarizeDeviceState({ id: "d", connectivity: { state: "online" } });
    const offline = summarizeDeviceState({ id: "d", connectivity: { state: "offline" } });
    const unknown = summarizeDeviceState({ id: "d" });
    expect([online.connectivity, resolveFreshness({ observedAt: ago(60 * MIN), staleAfterMs: 10 * MIN, now: NOW })]).toEqual(["online", "stale"]);
    expect([offline.connectivity, resolveFreshness({ observedAt: ago(MIN), staleAfterMs: 10 * MIN, now: NOW })]).toEqual(["offline", "fresh"]);
    expect([unknown.connectivity, resolveFreshness({ observedAt: ago(60 * MIN), staleAfterMs: 10 * MIN, now: NOW })]).toEqual(["unknown", "stale"]);
  });
});

describe("battery", () => {
  it("(1) unknown battery is not 0 %", () => {
    const sentence = describeDeviceBattery({ value: null });
    expect(sentence).toBe("Battery level unknown");
    expect(sentence).not.toMatch(/\b0\b/);
    expect(resolveBatteryState({ percent: undefined }).available).toBe(false);
  });

  it("(2) a stale battery says stale reading, never offline", () => {
    const sentence = describeDeviceBattery({ value: 18, freshness: "stale" });
    expect(sentence).toBe("Battery 18 percent, low, stale reading");
    expect(sentence).not.toMatch(/offline/i);
  });

  it("says charging only when reported, and 100 % never implies a charger", () => {
    expect(describeDeviceBattery({ value: 42, charging: true })).toBe("Battery 42 percent, charging");
    expect(describeDeviceBattery({ value: 42, charging: false })).toBe("Battery 42 percent, not charging");
    expect(describeDeviceBattery({ value: 42, charging: null })).toBe("Battery 42 percent, charging state unknown");
    expect(describeDeviceBattery({ value: 100 })).toBe("Battery 100 percent");
  });

  it("says unsupported rather than unknown when the device has no battery", () => {
    expect(describeDeviceBattery({ value: null, support: "unsupported" })).toBe("Battery not supported by this device");
    expect(describeDeviceBattery({ value: 50, support: "read-only" })).toBe("Battery 50 percent");
  });

  it("takes the product's thresholds, keeps the defaults otherwise, and never lets low fall below critical", () => {
    expect(classifyBatteryLevel(22)).toBe("low");
    expect(classifyBatteryLevel(22, { critical: 25, low: 40 })).toBe("critical");
    expect(classifyBatteryLevel(35, { critical: 25, low: 40 })).toBe("low");
    expect(resolveBatteryThresholds({ critical: 30, low: 20 })).toEqual({ critical: 30, low: 30 });
    expect(resolveBatteryThresholds({ critical: Number.NaN })).toEqual({ critical: 10, low: 25 });
    expect(describeDeviceBattery({ value: 8, thresholds: { critical: 5 } })).toBe("Battery 8 percent, low");
  });
});

describe("connection", () => {
  it("(3) unknown connectivity is not offline: missing and unrecognised input normalise to unknown", () => {
    for (const input of [undefined, null, "", "weird", { state: "gone" as never }]) {
      expect(normalizeConnectivityState(input)).toBe("unknown");
    }
    expect(describeDeviceConnection({ state: undefined })).toBe("Connection unknown");
  });

  it("(4) connecting is not online", () => {
    expect(describeDeviceConnection({ state: "connecting" })).toBe("Connecting");
    expect(describeDeviceConnection({ state: "connecting" })).not.toMatch(/online/i);
  });

  it("keeps unreachable and stale apart from offline, and adds last seen only where it means something", () => {
    expect(describeDeviceConnection({ state: "unreachable", lastSeenAt: ago(5 * MIN), now: NOW })).toBe("Unreachable, last seen 5 minutes ago");
    expect(describeDeviceConnection({ state: "stale", lastSeenAt: ago(3 * 60 * MIN), now: NOW })).toBe("Data is out of date, last seen 3 hours ago");
    expect(describeDeviceConnection({ state: "online", lastSeenAt: ago(MIN), now: NOW })).toBe("Online");
    expect(describeDeviceConnection({ state: "online", lastSeenAt: ago(MIN), now: NOW, lastSeen: "always" })).toBe("Online, last seen 1 minute ago");
    expect(describeDeviceConnection({ state: "offline", now: NOW })).toBe("Offline");
  });
});

describe("readings", () => {
  it("(7) gives no delta without comparison evidence", () => {
    expect(resolveReadingDelta(21.4, undefined)).toBeNull();
    expect(resolveReadingDelta(21.4, null)).toBeNull();
    expect(resolveReadingDelta(null, 21)).toBeNull();
    expect(resolveReadingDelta(21.5, 21)).toEqual({ value: 0.5, direction: "up" });
    expect(resolveReadingDelta(20, 20)).toEqual({ value: 0, direction: "none" });
  });

  it("(6) an unknown reading is said in words and contains no number", () => {
    const sentence = describeTelemetryReading({ label: "Heart rate", availability: "unknown", valueText: "0" });
    expect(sentence).toBe("Heart rate unknown, no reading");
    expect(sentence).not.toMatch(/\d/);
  });

  it("(5) a stale reading is named stale in the phrase", () => {
    expect(describeTelemetryReading({ label: "Soil moisture", availability: "known", valueText: "31", unitText: "%", stale: true, status: "normal" })).toBe(
      "Soil moisture 31 %, stale reading, last known value",
    );
  });

  it("keeps unavailable and unsupported apart", () => {
    expect(describeTelemetryReading({ label: "Glucose", availability: "unavailable" })).toBe("Glucose unavailable, no reading");
    expect(describeTelemetryReading({ label: "Glucose", availability: "unsupported" })).toBe("Glucose not supported by this device");
  });

  it("states a reading's age from a real timestamp only", () => {
    expect(describeReadingAge(ago(2 * MIN), { now: NOW })).toBe("measured 2 minutes ago");
    expect(describeReadingAge(undefined, { now: NOW })).toBe("");
  });
});

describe("command feedback", () => {
  const off = () => startCommandLifecycle<boolean>({ confirmed: false, requested: true });

  it("(8) requested is not confirmed", () => {
    const fb = describeCommandFeedback(run(off(), { type: "sent" }));
    expect(fb.headline).toBe("Requested, not yet confirmed");
    expect(fb.tone).toBe("pending");
    expect(fb.sentence).toMatch(/not yet confirmed/);
    expect(fb.sentence).not.toMatch(/^Confirmed/);
  });

  it("(9) acknowledged is not confirmed", () => {
    const fb = describeCommandFeedback(run(off(), { type: "sent" }, { type: "acknowledge" }));
    expect(fb.headline).toBe("Acknowledged, not yet confirmed");
    expect(fb.pending).toBe(true);
    expect(fb.tone).not.toBe("success");
  });

  it("(10) a timeout invents no reported state and says the change may still apply", () => {
    const lifecycle = run(off(), { type: "sent" }, { type: "timeout" });
    const fb = describeCommandFeedback(lifecycle, { formatValue: (v) => (v ? "on" : "off") });
    expect(lifecycle.confirmedValue).toBe(false);
    expect(fb.headline).toBe("Timed out, may still apply");
    expect(fb.sentence).toContain("last reported off");
    expect(fb.sentence).toContain("may still apply");
    expect(fb.sentence).not.toMatch(/reports on/);
  });

  it("(11) unreachable stays distinct from failed", () => {
    const unreachable = describeCommandFeedback(run(off(), { type: "sent" }, { type: "deviceUnreachable" }));
    const failed = describeCommandFeedback(run(off(), { type: "sent" }, { type: "fail", reason: "Jammed." }));
    expect(unreachable.headline).toBe("Device unreachable");
    expect(failed.headline).toBe("Failed");
    expect(unreachable.headline).not.toBe(failed.headline);
  });

  it("claims no rollback on cancel, and only confirmed reads as success", () => {
    const cancelled = describeCommandFeedback(run(off(), { type: "sent" }, { type: "cancel" }));
    expect(cancelled.headline).toBe("Cancelled");
    expect(cancelled.sentence).not.toMatch(/roll|revert|restor/i);
    const tones = (["requested", "acknowledged", "retrying", "failed", "timed-out", "unreachable", "cancelled", "idle"] as const).map(
      (stage) => describeCommandFeedback({ ...off(), stage }).tone,
    );
    expect(tones).not.toContain("success");
    expect(describeCommandFeedback(run(off(), { type: "sent" }, { type: "confirm", value: true })).tone).toBe("success");
  });

  it("offers retry only where the lifecycle allows it", () => {
    expect(describeCommandFeedback(run(off(), { type: "sent" }, { type: "timeout" })).retryable).toBe(true);
    expect(describeCommandFeedback(run(off(), { type: "sent" }, { type: "confirm", value: true })).retryable).toBe(false);
  });
});

describe("activity origin", () => {
  it("(12) preserves an explicit origin, including a device-originated change", () => {
    for (const origin of ["user", "device", "automation", "system"] as const) {
      expect(resolveActivityOrigin({ origin })).toBe(origin);
    }
  });

  it("(13) a missing origin is unknown, never user or system, whatever actor or source say", () => {
    expect(resolveActivityOrigin({})).toBe("unknown");
    expect(resolveActivityOrigin({ origin: "person" as never })).toBe("unknown");
    // actor/source are free text; they are deliberately not read.
    expect(resolveActivityOrigin({ actor: "Sam", source: "app" } as never)).toBe("unknown");
    expect(describeActivityOrigin("unknown")).toBe("Source unknown");
  });
});
