import * as React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  DeviceControlCard,
  DeviceLevelControl,
  DeviceListItem,
  DeviceSetpointControl,
  EnergySummary,
  SensorReading,
  TelemetryCard,
  TelemetryMetric,
  TelemetryTrend,
} from "./index";
import { summarizeEnergy } from "../functions";
import type { KinetixTelemetrySeries } from "../types/telemetry";

/**
 * A measurement and its unit are **one left-to-right run**.
 *
 * In an RTL page the unit's letters and neutral characters ("°C", "kWh", "L/min") are a separate bidi
 * run from the digits, so an unisolated `"18 °C"` is laid out as `"°C 18"` — the unit before the
 * number it belongs to. Measured in Chromium across the IoT stories: 124 value runs reordered, in 32
 * of 98 stories. The fix is `<bdi dir="ltr">` around the run, which `TelemetryMetric` and
 * `DeviceBattery` already had and these did not.
 *
 * **What these tests prove, and what they do not.** jsdom performs no bidi layout, so nothing here
 * can show a reordered run. They pin the *structure* that the browser evidence showed to be the
 * difference — the readout sits inside a `dir="ltr"` isolate — so the isolation cannot be dropped
 * again without a failure. The rendered proof is the browser sweep recorded in
 * `M5.6-PHASE-G-IOT-MONITORING.md`, and `pnpm check:iot-monitoring` asserts the rendered direction of
 * every value run in the `IoT/Monitoring` stories.
 *
 * The last test is the control: the same measurement over a readout with no isolation must report
 * `false`, so a green run here cannot mean "measured nothing".
 */

afterEach(cleanup);

const NOW = "2026-01-01T12:00:00.000Z";
const ago = (ms: number) => new Date(Date.parse(NOW) - ms).toISOString();
const HOUR = 3_600_000;

/** Is the text `want` rendered inside an LTR bidi isolate? */
function isolated(container: HTMLElement, want: string): boolean {
  const nodes = [...container.querySelectorAll<HTMLElement>("*")].filter((el) =>
    (el.textContent ?? "").replace(/\s+/g, " ").includes(want),
  );
  // The innermost element carrying the run; anything above it is a layout wrapper.
  const el = nodes[nodes.length - 1];
  if (!el) throw new Error(`"${want}" is not rendered at all`);
  const bdi = el.closest("bdi");
  return bdi !== null && bdi.getAttribute("dir") === "ltr";
}

const series: KinetixTelemetrySeries = {
  deviceId: "gh-a",
  metric: "temperature",
  points: [0, 1, 2].map((i) => ({ timestamp: ago((3 - i) * HOUR), metric: "temperature", value: 18 + i * 2, unit: "°C" })),
};

describe("a value and its unit are one LTR run", () => {
  it("SensorReading, as one line", () => {
    const { container } = render(<SensorReading metric="Temperature" value={23.4} unit="°C" precision={1} />);
    expect(isolated(container, "23.4 °C")).toBe(true);
  });

  it("SensorReading, as a hero numeral with the unit set apart", () => {
    const { container } = render(<SensorReading metric="Temperature" value={23.4} unit="°C" precision={1} size="xl" />);
    expect(isolated(container, "23.4")).toBe(true);
    expect(isolated(container, "°C")).toBe(true);
  });

  it("SensorReading isolates the unknown label too", () => {
    const { container } = render(<SensorReading metric="Weight" value={0} quality="missing" unit="kg" />);
    expect(isolated(container, "Unknown")).toBe(true);
  });

  it("TelemetryTrend's summary row", () => {
    const { container } = render(<TelemetryTrend series={series} showSummary precision={1} now={NOW} />);
    expect(isolated(container, "18.0 °C")).toBe(true);
    expect(isolated(container, "22.0 °C")).toBe(true);
  });

  it("TelemetryTrend's range and latest line", () => {
    const { container } = render(<TelemetryTrend series={series} precision={1} now={NOW} />);
    expect(isolated(container, "18.0 °C – 22.0 °C")).toBe(true);
    expect(isolated(container, "22.0 °C")).toBe(true);
  });

  it("TelemetryTrend's threshold legend", () => {
    const { container } = render(<TelemetryTrend series={series} thresholds={{ warningHigh: 30 }} precision={1} now={NOW} />);
    expect(isolated(container, "30.0 °C")).toBe(true);
  });

  it("TelemetryTrend's data table", () => {
    const { container } = render(<TelemetryTrend series={series} dataTable precision={1} now={NOW} />);
    const cells = [...container.querySelectorAll("td")].filter((td) => (td.textContent ?? "").includes("°C"));
    expect(cells.length).toBeGreaterThan(0);
    for (const td of cells) expect(td.querySelector('bdi[dir="ltr"]')).not.toBeNull();
  });

  it("TelemetryCard, through the SensorReading it composes", () => {
    const { container } = render(<TelemetryCard series={series} metric="Temperature" precision={1} now={NOW} />);
    expect(isolated(container, "22.0")).toBe(true);
  });

  it("DeviceListItem's key reading", () => {
    const { container } = render(
      <DeviceListItem device={{ id: "d1", name: "Probe", status: "online" }} reading={{ value: 4.2, unit: "°C", precision: 1 }} />,
    );
    expect(isolated(container, "4.2 °C")).toBe(true);
  });

  it("EnergySummary's Now and Today figures", () => {
    const summary = summarizeEnergy({ unit: "kWh", days: [10, 12, 14] });
    const { container } = render(<EnergySummary summary={summary} current={{ value: 1.2, unit: "kW" }} today={14.5} />);
    expect(isolated(container, "1.2")).toBe(true);
    expect(isolated(container, "kW")).toBe(true);
    expect(isolated(container, "14.5")).toBe(true);
  });

  it("EnergySummary's data table", () => {
    const summary = summarizeEnergy({ unit: "kWh", days: [10, 12, 14] });
    const { container } = render(<EnergySummary summary={summary} today={14} days={[10, 12, 14]} />);
    const cells = [...container.querySelectorAll("td")].filter((td) => (td.textContent ?? "").includes("kWh"));
    expect(cells.length).toBeGreaterThan(0);
    for (const td of cells) expect(td.querySelector('bdi[dir="ltr"]')).not.toBeNull();
  });

  it("DeviceControlCard's value", () => {
    const { container } = render(<DeviceControlCard title="Pump" value={40} unit="%" />);
    expect(isolated(container, "40")).toBe(true);
    expect(isolated(container, "%")).toBe(true);
  });

  it("DeviceLevelControl's numeral", () => {
    const { container } = render(<DeviceLevelControl label="Brightness" value={40} unit="%" onValueChange={() => {}} />);
    const numeral = container.querySelector("[data-value-source]");
    expect(numeral).not.toBeNull();
    expect(numeral!.textContent).toContain("40");
    expect(numeral!.querySelector('bdi[dir="ltr"]')).not.toBeNull();
  });

  it("DeviceSetpointControl's numeral", () => {
    const { container } = render(
      <DeviceSetpointControl label="Target" target={21} current={19} unit="°C" min={5} max={30} onCommit={() => {}} />,
    );
    // Scoped to the numeral itself: "21" also appears in the sr-only sentence, which is read rather
    // than laid out and so needs no isolation.
    const numeral = container.querySelector('[data-value-source="reported"]');
    expect(numeral).not.toBeNull();
    expect(numeral!.textContent).toContain("21");
    expect(numeral!.querySelector('bdi[dir="ltr"]')).not.toBeNull();
  });

  it("TelemetryMetric, which already had it (regression pin)", () => {
    const { container } = render(<TelemetryMetric metric="temperature" value={22.4} timestamp={NOW} now={NOW} />);
    expect(isolated(container, "22.4 °C")).toBe(true);
  });

  it("control: the same measurement reports false for a readout with no isolation", () => {
    const { container } = render(
      <div>
        <span>23.4 °C</span>
      </div>,
    );
    expect(isolated(container, "23.4 °C")).toBe(false);
  });
});
