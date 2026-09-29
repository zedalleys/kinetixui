"use client";

import * as React from "react";
import { TelemetryGrid, TelemetryMetric, TelemetryTrend } from "@kinetixui/iot/react";
import type { KinetixTelemetrySeries } from "@kinetixui/iot/functions";
import { agritech, AGRITECH_START } from "./scenarios";
import { SimNotice, Section } from "./harness";

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
  { id: "6h", label: "Last 6 hours", ms: 6 * HOUR },
  { id: "24h", label: "Last 24 hours", ms: 24 * HOUR },
  { id: "7d", label: "Last 7 days", ms: 7 * 24 * HOUR },
] as const;

/** Keep the points inside the window. A gap (`quality: "missing"`) survives the cut, so it still draws. */
function within(series: KinetixTelemetrySeries | undefined, windowMs: number): KinetixTelemetrySeries {
  const from = Date.parse(NOW) - windowMs;
  return { deviceId: series?.deviceId ?? "", metric: series?.metric ?? "", points: (series?.points ?? []).filter((p) => Date.parse(String(p.timestamp)) >= from) };
}

export function TelemetryHistoryExample() {
  const [range, setRange] = React.useState<(typeof RANGES)[number]["id"]>("7d");
  const windowMs = RANGES.find((r) => r.id === range)!.ms;
  const find = (deviceId: string, metric: string) => agritech.series.find((s) => s.deviceId === deviceId && s.metric === metric);

  return (
    <section aria-label="Telemetry history" className="flex flex-col gap-6">
      <SimNotice text="Simulated — fabricated readings measured from a fixed instant. Nothing is sampled from a device." />

      <Section title="Readings now" hint="Normal, warning, critical, stale and unavailable are different states, never one confident number.">
        <TelemetryGrid label="Readings by kind">
          <TelemetryMetric metric="temperature" value={24.6} timestamp={ago(20_000)} now={NOW} />
          <TelemetryMetric metric="humidity" value={88} thresholds={{ warningHigh: 80, criticalHigh: 95 }} timestamp={ago(20_000)} now={NOW} />
          <TelemetryMetric metric="soil-moisture" value={34} thresholds={{ warningLow: 28 }} timestamp={ago(40_000)} now={NOW} />
          <TelemetryMetric metric="pressure" value={null} quality="missing" timestamp={ago(20_000)} now={NOW} />
          <TelemetryMetric metric="air-quality" value={212} timestamp={ago(10_000)} now={NOW} />
          <TelemetryMetric metric="motion" value={2} unit="events" timestamp={ago(15_000)} now={NOW} />
          <TelemetryMetric metric="light-level" value={420} timestamp={ago(30_000)} now={NOW} />
          <TelemetryMetric metric="flow" value={18} thresholds={{ warningLow: 20 }} timestamp={ago(10_000)} now={NOW} />
          <TelemetryMetric metric="water-level" value={6} thresholds={{ warningLow: 20, criticalLow: 10 }} timestamp={ago(45_000)} now={NOW} />
          <TelemetryMetric metric="power" value={1820} timestamp={ago(5_000)} now={NOW} />
          <TelemetryMetric metric="battery" value={18} timestamp={ago(60_000)} now={NOW} />
          <TelemetryMetric metric="signal-strength" value={61} timestamp={ago(2 * HOUR)} staleAfterMs={15 * MINUTE} now={NOW} />
        </TelemetryGrid>
      </Section>

      <Section title="History" hint="The band is the product-set threshold. A break in the line is a reading that was due and did not arrive.">
        <div role="radiogroup" aria-label="Time range" className="flex flex-wrap gap-2">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={range === r.id}
              onClick={() => setRange(r.id)}
              className="inline-flex min-h-9 items-center rounded-md border border-input px-3 text-label-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-checked:border-primary aria-checked:bg-primary aria-checked:text-primary-foreground"
            >
              {r.label}
            </button>
          ))}
        </div>
        <TelemetryTrend
          series={within(find("soil-04", "soil-moisture"), windowMs)}
          label="Soil moisture, Zone 3"
          thresholds={{ warningLow: 28 }}
          height={140}
          now={NOW}
          dataTable
        />
        <TelemetryTrend
          series={within(find("weather-01", "temperature"), Math.min(windowMs, 24 * HOUR))}
          label="Weather station temperature, with a gap"
          height={120}
          now={NOW}
          dataTable
        />
      </Section>
    </section>
  );
}
// kx-iot:end
