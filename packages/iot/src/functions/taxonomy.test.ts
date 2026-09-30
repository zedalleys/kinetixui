import { describe, expect, it } from "vitest";
import {
  KINETIX_DEVICE_CATEGORIES,
  KINETIX_DEVICE_DOMAINS,
  KINETIX_DEVICE_TAXONOMY,
  KINETIX_METRIC_REGISTRY,
  categoryAffordances,
  categoryDomain,
  describeDeviceCategory,
  describeDeviceDomain,
  filterDevicesByDomain,
  groupDevicesByDomain,
  resolveDeviceCategory,
  resolveDeviceDomain,
  type KinetixDevice,
} from "./index";
import { CATEGORY_AFFORDANCES } from "../types/identity";

const dev = (id: string, type: string): KinetixDevice => ({ id, name: id, type, status: "online" });

describe("device taxonomy registry", () => {
  it("has exactly one entry per category, each with a valid domain", () => {
    expect(Object.keys(KINETIX_DEVICE_TAXONOMY).sort()).toEqual([...KINETIX_DEVICE_CATEGORIES].sort());
    expect(KINETIX_DEVICE_CATEGORIES).toHaveLength(16);
    expect(new Set(KINETIX_DEVICE_CATEGORIES).size).toBe(16);
    for (const category of KINETIX_DEVICE_CATEGORIES) {
      const entry = KINETIX_DEVICE_TAXONOMY[category];
      expect(KINETIX_DEVICE_DOMAINS).toContain(entry.domain);
      expect(entry.label.length).toBeGreaterThan(0);
      expect(entry.groupKey).toMatch(/^[a-z-]+$/);
    }
    expect(KINETIX_DEVICE_CATEGORIES[KINETIX_DEVICE_CATEGORIES.length - 1]).toBe("unknown");
  });

  it("group keys are unique except the shared fallback", () => {
    const keys = KINETIX_DEVICE_CATEGORIES.map((c) => KINETIX_DEVICE_TAXONOMY[c].groupKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("derives CATEGORY_AFFORDANCES from the registry and preserves the original values", () => {
    for (const c of KINETIX_DEVICE_CATEGORIES) expect(CATEGORY_AFFORDANCES[c]).toBe(KINETIX_DEVICE_TAXONOMY[c].affordances);
    expect(categoryAffordances("light")).toEqual(["power", "level"]);
    expect(categoryAffordances("thermostat")).toEqual(["setpoint", "mode"]);
    expect(categoryAffordances("fan")).toEqual(["power", "level", "mode"]);
    expect(categoryAffordances("sensor")).toEqual([]);
    expect(categoryAffordances("motor")).toEqual(["power", "level"]);
  });

  it("default metrics refer to registered metrics", () => {
    for (const c of KINETIX_DEVICE_CATEGORIES) {
      for (const m of KINETIX_DEVICE_TAXONOMY[c].defaultMetrics) expect(KINETIX_METRIC_REGISTRY[m], `${c}:${m}`).toBeDefined();
    }
  });

  it("keeps the original labels", () => {
    expect(describeDeviceCategory("plug")).toBe("Smart plug");
    expect(describeDeviceCategory("unknown")).toBe("Device");
    expect(describeDeviceCategory("bogus" as never)).toBe("Device");
  });

  it("maps categories to domains", () => {
    expect(categoryDomain("lock")).toBe("access");
    expect(categoryDomain("soil-sensor")).toBe("agriculture");
    expect(categoryDomain("weather-station")).toBe("environment");
    expect(categoryDomain("bogus" as never)).toBe("other");
  });
});

describe("category inference", () => {
  it("keeps every existing inference", () => {
    const table: Record<string, string> = {
      "smart light": "light", "door lock": "lock", "smart-plug-meter": "meter", "heat-pump": "thermostat",
      "irrigation valve": "valve", "irrigation pump": "pump", "ceiling fan": "fan", "gateway": "gateway",
      "temperature sensor": "sensor", "flux capacitor": "unknown", doorbell: "camera",
    };
    for (const [type, category] of Object.entries(table)) expect(resolveDeviceCategory(type), type).toBe(category);
  });
  it("places the new categories", () => {
    const table: Record<string, string> = {
      "soil moisture sensor": "soil-sensor", "Soil-Probe": "soil-sensor",
      "weather station": "weather-station", anemometer: "weather-station", "rain gauge": "weather-station",
      "air-quality-monitor": "air-quality", "CO2 sensor": "air-quality", "aqi sensor": "air-quality",
      "conveyor motor": "motor", "vfd drive": "motor", motor: "motor",
      "pump motor": "pump", "fan motor": "fan",
    };
    for (const [type, category] of Object.entries(table)) expect(resolveDeviceCategory(type), type).toBe(category);
  });
  it("still returns exact category names unchanged", () => {
    for (const c of KINETIX_DEVICE_CATEGORIES) expect(resolveDeviceCategory(c)).toBe(c);
  });
});

describe("domains", () => {
  const fleet = [dev("l1", "light"), dev("s1", "soil sensor"), dev("l2", "lamp"), dev("k1", "lock"), dev("x", "mystery"), dev("t1", "thermostat"), dev("f1", "fan")];

  it("groups in fixed domain order, keeps input order within, omits empty", () => {
    const groups = groupDevicesByDomain(fleet);
    expect(groups.map((g) => g.domain)).toEqual(["lighting", "climate", "access", "agriculture", "other"]);
    expect(groups[0]!.devices.map((d) => d.id)).toEqual(["l1", "l2"]);
    expect(groups[1]!.devices.map((d) => d.id)).toEqual(["t1", "f1"]);
    expect(groups[0]!.label).toBe("Lighting");
    expect(groups.reduce((n, g) => n + g.devices.length, 0)).toBe(fleet.length);
  });
  it("filters by one domain or several", () => {
    expect(filterDevicesByDomain(fleet, "lighting").map((d) => d.id)).toEqual(["l1", "l2"]);
    expect(filterDevicesByDomain(fleet, ["access", "agriculture"]).map((d) => d.id)).toEqual(["s1", "k1"]);
    expect(filterDevicesByDomain(fleet, [])).toEqual([]);
  });
  it("is safe on junk input", () => {
    expect(groupDevicesByDomain(null)).toEqual([]);
    expect(groupDevicesByDomain([null as never, dev("a", "light")])).toHaveLength(1);
    expect(filterDevicesByDomain(undefined, "lighting")).toEqual([]);
    expect(resolveDeviceDomain(null)).toBe("other");
  });
  it("describes every domain", () => {
    for (const d of KINETIX_DEVICE_DOMAINS) expect(describeDeviceDomain(d).length).toBeGreaterThan(0);
    expect(describeDeviceDomain("bogus" as never)).toBe("Other");
  });
});
