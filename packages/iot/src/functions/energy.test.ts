import { describe, expect, it } from "vitest";
import { energyTrend, summarizeEnergy } from "./index";

const items = [
  { id: "hvac", label: "HVAC", value: 50, deviceId: "d1" },
  { id: "lights", value: 30 },
  { id: "pump", label: "Pump", value: 20 },
  { id: "tiny", value: 0 },
];

describe("summarizeEnergy", () => {
  it("totals, ranks, shares and picks top consumers", () => {
    const s = summarizeEnergy(items);
    expect(s.total).toBe(100);
    expect(s.unit).toBe("kWh");
    expect(s.items.map((i) => [i.id, i.rank, i.share])).toEqual([["hvac", 1, 0.5], ["lights", 2, 0.3], ["pump", 3, 0.2], ["tiny", 4, 0]]);
    expect(s.top.map((i) => i.id)).toEqual(["hvac", "lights", "pump"]);
    expect(s.items[0]).toMatchObject({ label: "HVAC", deviceId: "d1" });
    expect(s.items[1]!.label).toBe("lights");
    expect("deviceId" in s.items[1]!).toBe(false);
    expect(s.flags).toEqual([]);
    expect(s.items.reduce((n, i) => n + i.share, 0)).toBeCloseTo(1);
  });
  it("respects unit and topCount", () => {
    expect(summarizeEnergy(items, { unit: "MWh", topCount: 1 })).toMatchObject({ unit: "MWh", top: [{ id: "hvac" }] });
    expect(summarizeEnergy(items, { topCount: 0 }).top).toEqual([]);
    expect(summarizeEnergy(items, { topCount: NaN }).top).toHaveLength(3);
  });
  it("keeps ties in input order", () => {
    expect(summarizeEnergy([{ id: "a", value: 5 }, { id: "b", value: 5 }]).items.map((i) => i.id)).toEqual(["a", "b"]);
  });
  it("ignores negative and non-finite values and counts them", () => {
    const s = summarizeEnergy([{ id: "a", value: 10 }, { id: "b", value: NaN }, { id: "c", value: -4 }, { id: "d", value: Infinity }, null as never]);
    expect(s).toMatchObject({ total: 10, ignored: 4 });
    expect(s.items).toHaveLength(1);
  });
  it("is safe with nothing, or a zero total (no NaN shares)", () => {
    expect(summarizeEnergy([])).toMatchObject({ total: 0, items: [], top: [], flags: [] });
    expect(summarizeEnergy(null).total).toBe(0);
    expect(summarizeEnergy([{ id: "a", value: 0 }]).items[0]!.share).toBe(0);
  });
  it("flags high consumption above a limit (strictly)", () => {
    expect(summarizeEnergy(items, { limit: 99 })).toMatchObject({ flags: ["high-consumption"], limit: 99 });
    expect(summarizeEnergy(items, { limit: 100 }).flags).toEqual([]);
  });
  it("flags high consumption above baseline plus tolerance, and reports the comparison", () => {
    expect(summarizeEnergy(items, { baseline: 80 })).toMatchObject({ flags: ["high-consumption"], deltaFromBaseline: 20, ratioToBaseline: 1.25, baseline: 80 });
    expect(summarizeEnergy(items, { baseline: 95 }).flags).toEqual([]); // 100 <= 95 * 1.1
    expect(summarizeEnergy(items, { baseline: 95, baselineTolerance: 0 }).flags).toEqual(["high-consumption"]);
    expect(summarizeEnergy(items, { baseline: 80, baselineTolerance: -1 }).flags).toEqual(["high-consumption"]);
  });
  it("does not flag twice when both limit and baseline are exceeded, and ignores unusable ones", () => {
    expect(summarizeEnergy(items, { limit: 10, baseline: 10 }).flags).toEqual(["high-consumption"]);
    const s = summarizeEnergy(items, { limit: 0, baseline: -5 });
    expect(s.flags).toEqual([]);
    expect(s.baseline).toBeUndefined();
    expect(s.limit).toBeUndefined();
  });
  it("is deterministic and does not mutate", () => {
    const copy = JSON.stringify(items);
    expect(summarizeEnergy(items)).toEqual(summarizeEnergy(items));
    expect(JSON.stringify(items)).toBe(copy);
  });
});

describe("energyTrend", () => {
  it("compares the early and late halves of a week", () => {
    expect(energyTrend([10, 10, 10, 50, 20, 20, 20])).toMatchObject({ direction: "rising", changeRatio: 1, total: 140, days: 7, peakIndex: 3 });
    expect(energyTrend([20, 20, 20, 5, 10, 10, 10])).toMatchObject({ direction: "falling", changeRatio: -0.5 });
    expect(energyTrend([10, 10, 10, 10, 10, 10, 10.2]).direction).toBe("steady");
  });
  it("a single odd last day does not dominate", () => {
    expect(energyTrend([10, 10, 10, 10, 10, 10, 30]).direction).toBe("rising");
    expect(energyTrend([10, 10, 10, 10, 10, 30, 10]).direction).toBe("rising");
    expect(energyTrend([10, 30, 10, 10, 10, 30, 10]).direction).toBe("steady");
  });
  it("honours tolerance", () => {
    const week = [10, 10, 10, 0, 11, 11, 11];
    expect(energyTrend(week).direction).toBe("rising");
    expect(energyTrend(week, { tolerance: 0.2 }).direction).toBe("steady");
    expect(energyTrend(week, { tolerance: NaN }).direction).toBe("rising");
  });
  it("skips missing days", () => {
    const t = energyTrend([10, null, 10, 0, 20, NaN, 20]);
    expect(t).toMatchObject({ direction: "rising", days: 5, total: 60, average: 12 });
  });
  it("is unknown when it cannot tell", () => {
    for (const days of [[], [5], [null, null, null], [1, null, null, null, null, null, null], null, undefined]) {
      expect(energyTrend(days as never).direction, JSON.stringify(days)).toBe("unknown");
    }
    expect(energyTrend([]).average).toBeNull();
    expect(energyTrend([]).peakIndex).toBeNull();
  });
  it("handles a zero baseline without dividing by it", () => {
    expect(energyTrend([0, 0, 0, 0, 5, 5, 5])).toMatchObject({ direction: "rising", changeRatio: null });
    expect(energyTrend([0, 0, 0, 0, 0, 0, 0]).direction).toBe("steady");
  });
  it("works on two days and other lengths, ignoring negatives", () => {
    expect(energyTrend([10, 20]).direction).toBe("rising");
    expect(energyTrend([10, -5, 10, 10]).days).toBe(3);
  });
});
