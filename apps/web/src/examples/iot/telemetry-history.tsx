"use client";

import * as React from "react";
import { TelemetryGrid, TelemetryMetric, TelemetryTrend } from "@kinetixui/iot/react";
import type { KinetixTelemetrySeries } from "@kinetixui/iot/functions";
import { agritech, AGRITECH_START } from "./scenarios";
import { Panel, PillSelector } from "@/components/iot/showcase";
import { SimNotice } from "./harness";

// kx-iot:start
/**
 * Telemetry over time: twelve kinds of reading in the states a real fleet is actually in, then two
 * trends with a threshold band, a gap where the sensor did not answer, and the data table that backs
 * the chart for anyone who cannot read a line.
 *
 * SIMULATED, fabricated data measured from one fixed instant. Nothing is sampled from a device.
 */
const NOW = AGRITECH_START;
const ago = (ms: number) => new Date(Date.parse(NOW) - ms).toISOString();
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const RANGES = [
  { id: "6h", label: "6 hours", ms: 6 * HOUR },
  { id: "24h", label: "24 hours", ms: 24 * HOUR },
  { id: "7d", label: "7 days", ms: 7 * 24 * HOUR },
] as const;

/** Keep the points inside the window. A gap (`quality: "missing"`) survives the cut, so it still draws. */
function within(series: KinetixTelemetrySeries | undefined, windowMs: number): KinetixTelemetrySeries {
  const from = Date.parse(NOW) - windowMs;
  return { deviceId: series?.deviceId ?? "", metric: series?.metric ?? "", points: (series?.points ?? []).filter((p) => Date.parse(String(p.timestamp)) >= from) };
}

/** One series: its newest value as a large numeral, then the chart and the table that backs it. */
function ChartTile({ title, unit, note, series, thresholds, height }: { title: string; unit: string; note?: string; series: KinetixTelemetrySeries; thresholds?: { warningLow: number }; height: number }) {
  const latest = [...series.points].reverse().find((point) => point.quality !== "missing" && typeof point.value === "number");
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-2xl bg-muted/40 p-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h5 className="text-title-md text-foreground">{title}</h5>
        <p className="tabular-nums text-headline-lg text-foreground">
          {latest ? String(Math.round((latest.value as number) * 10) / 10) : "No reading"}
          {latest ? <bdi className="ms-1 text-title-md text-muted-foreground">{unit}</bdi> : null}
        </p>
        <p className="text-body-sm text-muted-foreground">{note ?? "Latest reading in this range."}</p>
      </div>
      <TelemetryTrend series={series} label={title} thresholds={thresholds} height={height} now={NOW} dataTable />
    </div>
  );
}

export function TelemetryHistoryExample() {
  const [range, setRange] = React.useState<(typeof RANGES)[number]["id"]>("7d");
  const windowMs = RANGES.find((r) => r.id === range)!.ms;
  const find = (deviceId: string, metric: string) => agritech.series.find((s) => s.deviceId === deviceId && s.metric === metric);

  return (
    <section aria-label="Telemetry history" className="flex flex-col gap-4 sm:gap-6">
      <SimNotice text="Simulated — fabricated readings measured from a fixed instant. Nothing is sampled from a device." />

      <Panel title="Readings now" description="Normal, warning, critical, stale and unavailable are different states, never one confident number.">
        <TelemetryGrid label="Readings by kind" className="grid grid-cols-2 gap-2 sm:flex sm:gap-4">
          <TelemetryMetric size="lg" metric="temperature" value={24.6} timestamp={ago(20_000)} now={NOW} />
          <TelemetryMetric size="lg" metric="humidity" value={88} thresholds={{ warningHigh: 80, criticalHigh: 95 }} timestamp={ago(20_000)} now={NOW} />
          <TelemetryMetric size="lg" metric="soil-moisture" value={34} thresholds={{ warningLow: 28 }} timestamp={ago(40_000)} now={NOW} />
          <TelemetryMetric size="lg" metric="pressure" value={null} quality="missing" timestamp={ago(20_000)} now={NOW} />
          <TelemetryMetric size="lg" metric="air-quality" value={212} timestamp={ago(10_000)} now={NOW} />
          <TelemetryMetric size="lg" metric="motion" value={2} unit="events" timestamp={ago(15_000)} now={NOW} />
          <TelemetryMetric size="lg" metric="light-level" value={420} timestamp={ago(30_000)} now={NOW} />
          <TelemetryMetric size="lg" metric="flow" value={18} thresholds={{ warningLow: 20 }} timestamp={ago(10_000)} now={NOW} />
          <TelemetryMetric size="lg" metric="water-level" value={6} thresholds={{ warningLow: 20, criticalLow: 10 }} timestamp={ago(45_000)} now={NOW} />
          <TelemetryMetric size="lg" metric="power" value={1820} timestamp={ago(5_000)} now={NOW} />
          <TelemetryMetric size="lg" metric="battery" value={18} timestamp={ago(60_000)} now={NOW} />
          <TelemetryMetric size="lg" metric="signal-strength" value={61} timestamp={ago(2 * HOUR)} staleAfterMs={15 * MINUTE} now={NOW} />
        </TelemetryGrid>
      </Panel>

      <Panel title="History" description="The band is the product-set threshold. A break in the line is a reading that was due and did not arrive.">
        <PillSelector label="Time range" options={RANGES} value={range} onChange={(id) => setRange(id as (typeof RANGES)[number]["id"])} className="self-start rounded-full bg-muted/60 p-1" />
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartTile title="Soil moisture, Zone 3" unit="%" series={within(find("soil-04", "soil-moisture"), windowMs)} thresholds={{ warningLow: 28 }} height={160} />
          <ChartTile title="Weather station temperature" unit="°C" note="With a gap where the sensor did not answer." series={within(find("weather-01", "temperature"), Math.min(windowMs, 24 * HOUR))} height={160} />
        </div>
      </Panel>
    </section>
  );
}
// kx-iot:end
