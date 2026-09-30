import { describe, expect, it } from "vitest";
import {
  KINETIX_METRIC_IDS,
  KINETIX_METRIC_REGISTRY,
  KINETIX_READING_STATES,
  classifyAgainstThresholds,
  describeMetric,
  describeReadingState,
  describeSeriesForAssistiveTech,
  detectSeriesGaps,
  evaluateReading,
  getMetricDefinition,
  readingStateGlyph,
  resolveMetricThresholds,
  summarizeSeries,
  thresholdCrossings,
  type KinetixTelemetryPoint,
  type KinetixTelemetrySeries,
} from "./index";

const T0 = Date.parse("2026-09-27T12:00:00.000Z");
const MIN = 60_000;
const pt = (offsetMin: number, value: number, over: Partial<KinetixTelemetryPoint> = {}): KinetixTelemetryPoint => ({
  timestamp: new Date(T0 + offsetMin * MIN).toISOString(),
  metric: "temperature",
  value,
  ...over,
});
const series = (points: KinetixTelemetryPoint[], metric = "temperature"): KinetixTelemetrySeries => ({ deviceId: "d", metric, points });

describe("metric registry", () => {
  it("contains the thirteen metrics with label, decimals and consistent ids", () => {
    expect(KINETIX_METRIC_IDS).toEqual([
      "temperature", "humidity", "soil-moisture", "pressure", "air-quality", "motion", "light-level",
      "flow", "water-level", "power", "energy", "battery", "signal-strength",
    ]);
    for (const id of KINETIX_METRIC_IDS) {
      const def = KINETIX_METRIC_REGISTRY[id]!;
      expect(def.id).toBe(id);
      expect(def.label.length).toBeGreaterThan(0);
      expect(Number.isInteger(def.decimals) && def.decimals >= 0).toBe(true);
    }
  });
  it("only ships thresholds that are not domain-specific", () => {
    expect(getMetricDefinition("temperature")?.thresholds).toBeUndefined();
    expect(getMetricDefinition("battery")?.thresholds).toEqual({ warningLow: 25, criticalLow: 10 });
  });
  it("looks up loosely, describes unknown keys readably, and guards prototype keys", () => {
    expect(getMetricDefinition(" Soil_Moisture ")?.id).toBe("soil-moisture");
    expect(getMetricDefinition("toString")).toBeUndefined();
    expect(getMetricDefinition(undefined)).toBeUndefined();
    expect(describeMetric("heart-rate")).toBe("Heart rate");
    expect(describeMetric("")).toBe("Reading");
    expect(describeMetric("flow")).toBe("Flow");
  });
  it("merges product thresholds over defaults field by field and ignores junk", () => {
    expect(resolveMetricThresholds("battery", { warningLow: 40 })).toEqual({ warningLow: 40, criticalLow: 10 });
    expect(resolveMetricThresholds("battery", { warningLow: NaN, criticalHigh: 200 })).toEqual({ warningLow: 25, criticalLow: 10, criticalHigh: 200 });
    expect(resolveMetricThresholds("temperature")).toEqual({});
    expect(resolveMetricThresholds("battery", null)).toEqual({ warningLow: 25, criticalLow: 10 });
  });
});

describe("reading states", () => {
  it("has a word and a distinct glyph for every state, so colour is never alone", () => {
    const glyphs = KINETIX_READING_STATES.map(readingStateGlyph);
    expect(new Set(glyphs).size).toBe(KINETIX_READING_STATES.length);
    expect(glyphs.sort()).toEqual(["check", "clock", "dash", "octagon", "triangle"]);
    expect(KINETIX_READING_STATES.map(describeReadingState)).toEqual(["Critical", "Warning", "Stale", "Unavailable", "Normal"]);
  });
});

describe("evaluateReading", () => {
  const thresholds = { warningLow: 10, criticalLow: 5, warningHigh: 30, criticalHigh: 40 };
  const ev = (value: number | null | undefined, over = {}) => evaluateReading({ value, thresholds, ...over }).state;

  it("classifies with inclusive bounds", () => {
    expect(ev(20)).toBe("normal");
    expect(ev(30)).toBe("warning");
    expect(ev(10)).toBe("warning");
    expect(ev(40)).toBe("critical");
    expect(ev(5)).toBe("critical");
    expect(ev(4)).toBe("critical");
    expect(classifyAgainstThresholds(35, thresholds)).toEqual({ level: "warning", side: "high" });
    expect(classifyAgainstThresholds(1, thresholds)).toEqual({ level: "critical", side: "low" });
  });
  it("is unavailable for no usable value, never a number", () => {
    for (const v of [null, undefined, NaN, Infinity]) expect(ev(v)).toBe("unavailable");
    expect(ev(20, { quality: "missing" })).toBe("unavailable");
    expect(ev(20, { quality: "error" })).toBe("unavailable");
    expect(evaluateReading({ value: NaN }).level).toBeNull();
  });
  it("stale beats in-range, but reports what the value would have been", () => {
    const now = new Date(T0).toISOString();
    const old = new Date(T0 - 3 * 3_600_000).toISOString();
    const r = evaluateReading({ value: 45, thresholds, timestamp: old, staleAfterMs: 3_600_000, now });
    expect(r).toMatchObject({ state: "stale", level: "critical", side: "high", word: "Stale", glyph: "clock" });
    expect(evaluateReading({ value: 20, thresholds, timestamp: now, staleAfterMs: 3_600_000, now }).state).toBe("normal");
    // an undated reading cannot claim freshness
    expect(evaluateReading({ value: 20, thresholds, staleAfterMs: 3_600_000, now }).state).toBe("stale");
    // no staleAfterMs: age is not checked
    expect(evaluateReading({ value: 20, thresholds, timestamp: old, now }).state).toBe("normal");
  });
  it("uses registry defaults and lets the product override", () => {
    expect(evaluateReading({ value: 8, metric: "battery" }).state).toBe("critical");
    expect(evaluateReading({ value: 8, metric: "battery", thresholds: { criticalLow: 5 } }).state).toBe("warning");
    expect(evaluateReading({ value: 8, metric: "temperature" }).state).toBe("normal");
    expect(evaluateReading({ value: 250, metric: "air-quality" }).state).toBe("critical");
  });
});

describe("summarizeSeries", () => {
  it("handles an empty series and non-series", () => {
    const empty = { count: 0, measured: 0, missingCount: 0, min: null, max: null, avg: null, range: null, latest: null, latestAt: null, trend: "unknown" };
    expect(summarizeSeries(series([]))).toEqual(empty);
    expect(summarizeSeries(null)).toEqual(empty);
    expect(summarizeSeries({ points: "x" } as never)).toEqual(empty);
  });
  it("handles an all-missing series", () => {
    const s = summarizeSeries(series([pt(0, 0, { quality: "missing" }), pt(1, NaN), pt(2, 5, { quality: "error" })]));
    expect(s).toMatchObject({ count: 3, measured: 0, missingCount: 3, min: null, avg: null, trend: "unknown" });
  });
  it("handles a single point", () => {
    const s = summarizeSeries(series([pt(0, 21.5)]));
    expect(s).toMatchObject({ measured: 1, min: 21.5, max: 21.5, avg: 21.5, range: 0, trend: "unknown", latestAt: T0 });
  });
  it("orders out-of-order points and finds the latest measured point", () => {
    const s = summarizeSeries(series([pt(20, 30), pt(0, 10), pt(10, 20), pt(30, 0, { quality: "missing" })]));
    expect(s).toMatchObject({ count: 4, measured: 3, missingCount: 1, min: 10, max: 30, avg: 20, range: 20, trend: "rising" });
    expect(s.latest?.value).toBe(30);
  });
  it("ignores NaN and undated points but counts them as missing", () => {
    const s = summarizeSeries(series([pt(0, 1), pt(1, NaN), { ...pt(2, 9), timestamp: "garbage" }]));
    expect(s).toMatchObject({ measured: 1, missingCount: 2, max: 1 });
  });
  it("classifies trend with tolerance", () => {
    const flat = series([pt(0, 10), pt(1, 10.1), pt(2, 10)]);
    expect(summarizeSeries(flat).trend).toBe("steady");
    expect(summarizeSeries(series([pt(0, 10), pt(1, 5), pt(2, 4)])).trend).toBe("falling");
    expect(summarizeSeries(series([pt(0, 10), pt(1, 11)]), { tolerance: 2 }).trend).toBe("steady");
    expect(summarizeSeries(series([pt(0, 10), pt(1, 11)]), { tolerance: 0.5 }).trend).toBe("rising");
    expect(summarizeSeries(series([pt(0, 10), pt(1, 11)]), { tolerance: NaN }).trend).toBe("rising");
    // climbs then returns: coarse by design
    expect(summarizeSeries(series([pt(0, 10), pt(1, 30), pt(2, 10)])).trend).toBe("steady");
  });
  it("is deterministic and does not mutate", () => {
    const input = series([pt(5, 1), pt(0, 2)]);
    const copy = JSON.stringify(input);
    expect(summarizeSeries(input)).toEqual(summarizeSeries(input));
    expect(JSON.stringify(input)).toBe(copy);
  });
});

describe("detectSeriesGaps", () => {
  const s = series([pt(0, 1), pt(5, 1), pt(6, 1, { quality: "missing" }), pt(40, 1), pt(45, 1)]);
  it("finds silences between measured points, missing points not bridging", () => {
    expect(detectSeriesGaps(s, { maxGapMs: 10 * MIN })).toEqual([{ fromAt: T0 + 5 * MIN, toAt: T0 + 40 * MIN, durationMs: 35 * MIN }]);
  });
  it("derives the limit from an expected interval and tolerance", () => {
    expect(detectSeriesGaps(s, { expectedIntervalMs: 5 * MIN })).toHaveLength(1);
    expect(detectSeriesGaps(s, { expectedIntervalMs: 5 * MIN, toleranceFactor: 8 })).toHaveLength(0);
    expect(detectSeriesGaps(s, { expectedIntervalMs: MIN, maxGapMs: 60 * MIN })).toHaveLength(0);
  });
  it("claims no gaps without a usable limit, and on empty or single-point series", () => {
    for (const bad of [{}, { maxGapMs: 0 }, { maxGapMs: NaN }, { expectedIntervalMs: -1 }]) expect(detectSeriesGaps(s, bad)).toEqual([]);
    expect(detectSeriesGaps(series([]), { maxGapMs: 1 })).toEqual([]);
    expect(detectSeriesGaps(series([pt(0, 1)]), { maxGapMs: 1 })).toEqual([]);
    expect(detectSeriesGaps(null, { maxGapMs: 1 })).toEqual([]);
  });
  it("sorts out-of-order input first", () => {
    expect(detectSeriesGaps(series([pt(30, 1), pt(0, 1)]), { maxGapMs: MIN })).toHaveLength(1);
  });
});

describe("thresholdCrossings", () => {
  const t = { warningHigh: 30, criticalHigh: 40 };
  it("reports every level change, including recovery, never the first point", () => {
    const s = series([pt(0, 50), pt(1, 20), pt(2, 35), pt(3, 45), pt(4, 44), pt(5, 10)]);
    expect(thresholdCrossings(s, t).map((c) => [c.from, c.to, c.side])).toEqual([
      ["critical", "normal", undefined],
      ["normal", "warning", "high"],
      ["warning", "critical", "high"],
      ["critical", "normal", undefined],
    ]);
  });
  it("uses registry defaults for the series' metric and skips missing points", () => {
    const s = series([pt(0, 50, { metric: "battery" }), pt(1, 0, { quality: "missing" }), pt(2, 20, { metric: "battery" }), pt(3, 5, { metric: "battery" })], "battery");
    expect(thresholdCrossings(s).map((c) => c.to)).toEqual(["warning", "critical"]);
  });
  it("is empty for empty, single, all-normal and no-threshold series", () => {
    expect(thresholdCrossings(series([]), t)).toEqual([]);
    expect(thresholdCrossings(series([pt(0, 99)]), t)).toEqual([]);
    expect(thresholdCrossings(series([pt(0, 1), pt(1, 2)]), t)).toEqual([]);
    expect(thresholdCrossings(series([pt(0, 1), pt(1, 99)]))).toEqual([]);
    expect(thresholdCrossings(null, t)).toEqual([]);
  });
});

describe("describeSeriesForAssistiveTech", () => {
  it("describes empty, all-missing and single-point series plainly", () => {
    expect(describeSeriesForAssistiveTech(series([]))).toBe("Temperature: no readings.");
    expect(describeSeriesForAssistiveTech(series([pt(0, 0, { quality: "missing" })]))).toBe("Temperature: 1 point, none with a usable reading.");
    expect(describeSeriesForAssistiveTech(series([pt(0, 21.34)]))).toBe("Temperature: one reading, 21.3 °C at 2026-09-27 12:00 UTC.");
    expect(describeSeriesForAssistiveTech(null)).toBe("Reading: no readings.");
  });
  it("covers range, latest, min/max/avg, trend, missing, gaps, breaches and staleness in one paragraph", () => {
    const s = series([pt(0, 20), pt(10, 35), pt(20, 45), pt(25, 0, { quality: "missing" }), pt(90, 25)]);
    const text = describeSeriesForAssistiveTech(s, {
      thresholds: { warningHigh: 30, criticalHigh: 40 },
      maxGapMs: 30 * MIN,
      staleAfterMs: MIN,
      now: new Date(T0 + 200 * MIN).toISOString(),
    });
    expect(text).toBe(
      "Temperature: 4 readings from 2026-09-27 12:00 UTC to 2026-09-27 13:30 UTC. " +
        "Latest 25.0 °C. Lowest 20.0 °C, highest 45.0 °C, average 31.3 °C. Overall rising. " +
        "1 point has no usable reading. 1 gap in the data, the longest 1 hour. " +
        "It entered warning 1 time and entered critical 1 time. The latest reading is out of date.",
    );
    expect(text).not.toContain("\n");
  });
  it("reports a latest reading that is currently in breach", () => {
    const text = describeSeriesForAssistiveTech(series([pt(0, 20), pt(1, 45)]), { thresholds: { criticalHigh: 40 } });
    expect(text).toContain("The latest reading is critical, high.");
  });
  it("uses the registry label, unit and decimals, with overrides and a custom time format", () => {
    const s = series([pt(0, 40.2, { metric: "soil-moisture" })], "soil-moisture");
    expect(describeSeriesForAssistiveTech(s, { formatTime: () => "noon" })).toBe("Soil moisture: one reading, 40 % at noon.");
    expect(describeSeriesForAssistiveTech(s, { label: "Bed 3", unit: "vol%", decimals: 1, formatTime: () => "noon" })).toBe("Bed 3: one reading, 40.2 vol% at noon.");
  });
  it("is deterministic with out-of-order input", () => {
    const a = describeSeriesForAssistiveTech(series([pt(10, 2), pt(0, 1)]));
    expect(a).toBe(describeSeriesForAssistiveTech(series([pt(0, 1), pt(10, 2)])));
  });
});
