import { describe, expect, it } from "vitest";
import { compareDeviceAttention, summarizeDevices } from "./group";
import { describeTelemetryQuality, sortTelemetryPoints, telemetryExtent } from "./telemetry";
import { KINETIX_DEVICE_STATUSES, type KinetixDevice } from "../types/device";
import type { KinetixTelemetryPoint, KinetixTelemetrySeries } from "../types/telemetry";

const device = (over: Partial<KinetixDevice> = {}): KinetixDevice => ({
  id: over.id ?? "d1",
  name: "Device",
  type: "sensor",
  status: "online",
  ...over,
});

describe("summarizeDevices", () => {
  it("counts every device, by status", () => {
    const summary = summarizeDevices([
      device({ id: "a", status: "online" }),
      device({ id: "b", status: "online" }),
      device({ id: "c", status: "offline" }),
      device({ id: "d", status: "error" }),
    ]);
    expect(summary.total).toBe(4);
    expect(summary.byStatus.online).toBe(2);
    expect(summary.byStatus.offline).toBe(1);
    expect(summary.byStatus.error).toBe(1);
  });

  /** A row for a status with no devices in it is a fact, not an absence. */
  it("carries a key for every status, including the zeroes", () => {
    const summary = summarizeDevices([device({ status: "online" })]);
    expect(Object.keys(summary.byStatus).sort()).toEqual([...KINETIX_DEVICE_STATUSES].sort());
    expect(summary.byStatus.pairing).toBe(0);
  });

  it("counts the statuses that need attention", () => {
    const summary = summarizeDevices([
      device({ id: "a", status: "error" }),
      device({ id: "b", status: "warning" }),
      device({ id: "c", status: "offline" }),
      device({ id: "d", status: "stale" }),
      device({ id: "e", status: "online" }),
      device({ id: "f", status: "syncing" }),
      device({ id: "g", status: "disabled" }),
    ]);
    expect(summary.needsAttention).toBe(4);
  });

  /** Normalisation is why a fleet assembled from two backends is still one fleet. */
  it("normalises vendor spellings before counting", () => {
    const summary = summarizeDevices([
      device({ id: "a", status: "connected" as never }),
      device({ id: "b", status: "DISCONNECTED" as never }),
      device({ id: "c", status: "firmware_update" as never }),
    ]);
    expect(summary.byStatus.online).toBe(1);
    expect(summary.byStatus.offline).toBe(1);
    expect(summary.byStatus.updating).toBe(1);
  });

  /** The total must equal the input length, or a device vanished from the count. */
  it("counts an unreadable status rather than dropping the device", () => {
    const summary = summarizeDevices([device({ status: "???" as never }), device({ id: "b", status: undefined as never })]);
    expect(summary.total).toBe(2);
    expect(summary.byStatus.offline).toBe(2);
  });

  it("treats a missing list as an empty group rather than throwing", () => {
    for (const input of [null, undefined, "nope" as never]) {
      const summary = summarizeDevices(input);
      expect(summary.total).toBe(0);
      expect(summary.needsAttention).toBe(0);
      expect(summary.byStatus.online).toBe(0);
    }
  });
});

describe("compareDeviceAttention", () => {
  it("sorts worst first, in the canonical status order", () => {
    const sorted = [
      device({ id: "online", status: "online" }),
      device({ id: "error", status: "error" }),
      device({ id: "stale", status: "stale" }),
      device({ id: "warning", status: "warning" }),
    ].sort(compareDeviceAttention);
    expect(sorted.map((d) => d.id)).toEqual(["error", "warning", "stale", "online"]);
  });

  /** The product already ordered its list; a tiebreak here would silently undo that. */
  it("keeps input order within a status", () => {
    const sorted = [
      device({ id: "z", status: "online" }),
      device({ id: "a", status: "online" }),
      device({ id: "m", status: "online" }),
    ].sort(compareDeviceAttention);
    expect(sorted.map((d) => d.id)).toEqual(["z", "a", "m"]);
  });

  it("places an unreadable status where its normalisation puts it", () => {
    const sorted = [device({ id: "bad", status: "???" as never }), device({ id: "ok", status: "online" })].sort(
      compareDeviceAttention,
    );
    // "???" normalises to offline, which needs more attention than online.
    expect(sorted.map((d) => d.id)).toEqual(["bad", "ok"]);
  });

  it("survives null entries", () => {
    expect(() => [device(), null, undefined].sort(compareDeviceAttention as never)).not.toThrow();
  });
});

const point = (over: Partial<KinetixTelemetryPoint> = {}): KinetixTelemetryPoint => ({
  timestamp: "2026-01-01T00:00:00.000Z",
  metric: "temperature",
  value: 20,
  unit: "°C",
  ...over,
});

const series = (points: KinetixTelemetryPoint[]): KinetixTelemetrySeries => ({
  deviceId: "d1",
  metric: "temperature",
  points,
});

describe("sortTelemetryPoints", () => {
  it("orders by timestamp regardless of array order", () => {
    const ordered = sortTelemetryPoints(
      series([
        point({ timestamp: "2026-01-01T02:00:00.000Z", value: 3 }),
        point({ timestamp: "2026-01-01T00:00:00.000Z", value: 1 }),
        point({ timestamp: "2026-01-01T01:00:00.000Z", value: 2 }),
      ]),
    );
    expect(ordered.map((entry) => entry.point.value)).toEqual([1, 2, 3]);
  });

  /** An undated reading cannot be placed on a time axis, so it is not placed on one. */
  it("drops points whose timestamp is unusable rather than sorting them to an end", () => {
    const ordered = sortTelemetryPoints(
      series([
        point({ timestamp: "not a date", value: 99 }),
        point({ timestamp: "2026-01-01T00:00:00.000Z", value: 1 }),
        point({ timestamp: null as never, value: 98 }),
      ]),
    );
    expect(ordered).toHaveLength(1);
    expect(ordered[0]!.point.value).toBe(1);
  });

  it("returns the parsed stamp so a caller does not parse twice", () => {
    const ordered = sortTelemetryPoints(series([point({ timestamp: "2026-01-01T00:00:00.000Z" })]));
    expect(ordered[0]!.at).toBe(Date.parse("2026-01-01T00:00:00.000Z"));
  });

  it("is empty for a missing or malformed series", () => {
    expect(sortTelemetryPoints(null)).toEqual([]);
    expect(sortTelemetryPoints(undefined)).toEqual([]);
    expect(sortTelemetryPoints({ deviceId: "d", metric: "m", points: null as never })).toEqual([]);
  });
});

describe("telemetryExtent", () => {
  it("reports the bounds and the span of a healthy series", () => {
    const extent = telemetryExtent(
      series([
        point({ timestamp: "2026-01-01T00:00:00.000Z", value: 18 }),
        point({ timestamp: "2026-01-01T01:00:00.000Z", value: 24 }),
        point({ timestamp: "2026-01-01T02:00:00.000Z", value: 21 }),
      ]),
    );
    expect(extent.min).toBe(18);
    expect(extent.max).toBe(24);
    expect(extent.measured).toBe(3);
    expect(extent.missing).toBe(0);
    expect(extent.from).toBe(Date.parse("2026-01-01T00:00:00.000Z"));
    expect(extent.to).toBe(Date.parse("2026-01-01T02:00:00.000Z"));
  });

  /**
   * The case this function exists for. A dropout delivered as `value: 0, quality: "missing"` must not
   * drag the axis to zero — that is how a sensor that stopped answering renders as a real measurement.
   */
  it("excludes missing points from the bounds instead of letting them pull the axis", () => {
    const extent = telemetryExtent(
      series([
        point({ timestamp: "2026-01-01T00:00:00.000Z", value: 18 }),
        point({ timestamp: "2026-01-01T01:00:00.000Z", value: 0, quality: "missing" }),
        point({ timestamp: "2026-01-01T02:00:00.000Z", value: 21 }),
      ]),
    );
    expect(extent.min).toBe(18);
    expect(extent.max).toBe(21);
    expect(extent.measured).toBe(2);
    expect(extent.missing).toBe(1);
    // The gap still counts toward the window it covers.
    expect(extent.to).toBe(Date.parse("2026-01-01T02:00:00.000Z"));
  });

  it("treats an errored reading the same way", () => {
    const extent = telemetryExtent(
      series([point({ value: -999, quality: "error" }), point({ timestamp: "2026-01-01T01:00:00.000Z", value: 5 })]),
    );
    expect(extent.min).toBe(5);
    expect(extent.missing).toBe(1);
  });

  it("counts a non-finite value as missing whatever its quality says", () => {
    const extent = telemetryExtent(
      series([
        point({ value: Number.NaN, quality: "good" }),
        point({ timestamp: "2026-01-01T01:00:00.000Z", value: Number.POSITIVE_INFINITY, quality: "good" }),
        point({ timestamp: "2026-01-01T02:00:00.000Z", value: 7 }),
      ]),
    );
    expect(extent.min).toBe(7);
    expect(extent.max).toBe(7);
    expect(extent.measured).toBe(1);
    expect(extent.missing).toBe(2);
  });

  /** Null bounds are the signal to render an empty state, not an axis from null to null. */
  it("reports null bounds when nothing was measured", () => {
    const extent = telemetryExtent(series([point({ value: 0, quality: "missing" })]));
    expect(extent.min).toBeNull();
    expect(extent.max).toBeNull();
    expect(extent.measured).toBe(0);
    expect(extent.missing).toBe(1);
    expect(extent.from).not.toBeNull();
  });

  it("is empty for a missing series", () => {
    const extent = telemetryExtent(null);
    expect(extent).toEqual({ min: null, max: null, from: null, to: null, measured: 0, missing: 0 });
  });

  it("handles a single point, where min and max coincide", () => {
    const extent = telemetryExtent(series([point({ value: 12 })]));
    expect(extent.min).toBe(12);
    expect(extent.max).toBe(12);
    expect(extent.from).toBe(extent.to);
  });

  it("does not mistake a negative reading for a missing one", () => {
    const extent = telemetryExtent(
      series([point({ value: -40 }), point({ timestamp: "2026-01-01T01:00:00.000Z", value: -10 })]),
    );
    expect(extent.min).toBe(-40);
    expect(extent.max).toBe(-10);
    expect(extent.missing).toBe(0);
  });
});

describe("describeTelemetryQuality", () => {
  it("gives every quality a word", () => {
    expect(describeTelemetryQuality("good")).toBe("Measured");
    expect(describeTelemetryQuality("estimated")).toBe("Estimated");
    expect(describeTelemetryQuality("missing")).toBe("No reading");
    expect(describeTelemetryQuality("error")).toBe("Sensor error");
  });
});
