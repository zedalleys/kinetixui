import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MetricStatus } from "./metric-status";
import { TelemetryCard } from "./telemetry-card";
import { TelemetryGrid } from "./telemetry-grid";
import { TelemetryMetric } from "./telemetry-metric";
import { TelemetryTrend } from "./telemetry-trend";
import type { KinetixTelemetrySeries } from "../types/telemetry";

/**
 * Telemetry, judged.
 *
 * The rows to compare are **Stale** and **Unavailable** against **Normal**: a stale reading keeps its
 * number but says "Last known value"; an unavailable one shows a dash and never a zero. The trend
 * stories add what a plain sparkline leaves out — bounds drawn as dash-patterned lines, real gaps,
 * a stale marker, a summary row, and a "View data" table.
 */
const NOW = "2026-01-01T12:00:00.000Z";
const ago = (ms: number) => new Date(Date.parse(NOW) - ms).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;

const meta = {
  title: "IoT/Telemetry",
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="flex w-[32rem] max-w-full flex-col gap-5">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="text-label-sm uppercase tracking-[0.12em] text-muted-foreground">{children}</p>
);

export const StatusStates: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      {(["normal", "warning", "critical", "stale", "unavailable"] as const).map((s) => (
        <MetricStatus key={s} state={s} />
      ))}
    </div>
  ),
};

export const Metrics: Story = {
  render: () => (
    <TelemetryGrid label="Greenhouse A">
      <TelemetryMetric metric="temperature" value={22.4} timestamp={ago(2 * MIN)} staleAfterMs={10 * MIN} now={NOW} trend="rising" thresholds={{ warningHigh: 30, criticalHigh: 35 }} />
      <TelemetryMetric metric="humidity" value={71} timestamp={ago(MIN)} staleAfterMs={10 * MIN} now={NOW} trend="steady" />
      <TelemetryMetric metric="temperature" label="Soil temperature" value={36.1} timestamp={ago(MIN)} now={NOW} thresholds={{ warningHigh: 30, criticalHigh: 35 }} />
      <TelemetryMetric metric="soil-moisture" value={31} timestamp={ago(3 * HOUR)} staleAfterMs={10 * MIN} now={NOW} trend="falling" />
      <TelemetryMetric metric="battery-level" value={0} quality="missing" timestamp={ago(MIN)} now={NOW} />
    </TelemetryGrid>
  ),
};

const temps: KinetixTelemetrySeries = {
  deviceId: "gh-a",
  metric: "temperature",
  points: [
    ...[0, 1, 2, 3, 4].map((i) => ({ timestamp: ago((12 - i) * HOUR), metric: "temperature", value: 18 + i * 2.5, unit: "°C" })),
    { timestamp: ago(6 * HOUR), metric: "temperature", value: 0, unit: "°C", quality: "missing" as const },
    ...[0, 1, 2].map((i) => ({ timestamp: ago((2 - i) * HOUR), metric: "temperature", value: 31 + i * 3, unit: "°C" })),
  ],
};

export const TrendWithThresholds: Story = {
  render: () => (
    <>
      <Label>Thresholds, a gap, a summary row, the time range and the data table</Label>
      <TelemetryTrend series={temps} height={72} thresholds={{ warningHigh: 30, criticalHigh: 35 }} maxGapMs={4 * HOUR} showSummary showTimeRange dataTable now={NOW} />
      <Label>Stale: the newest reading is out of date</Label>
      <TelemetryTrend series={temps} height={56} staleAfterMs={30 * MIN} now={new Date(Date.parse(NOW) + 5 * HOUR)} showTimeRange />
    </>
  ),
};

export const Card: Story = {
  render: () => <TelemetryCard series={temps} metric="Temperature" thresholds={{ warningHigh: 30, criticalHigh: 35 }} staleAfterMs={30 * MIN} now={NOW} trendProps={{ showSummary: true, dataTable: true }} />,
};

export const RightToLeft: Story = {
  render: () => (
    <div dir="rtl">
      <TelemetryTrend series={temps} thresholds={{ warningHigh: 30 }} showSummary showTimeRange dataTable now={NOW} />
    </div>
  ),
};
