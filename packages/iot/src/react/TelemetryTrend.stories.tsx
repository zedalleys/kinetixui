import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { TelemetryTrend } from "./telemetry-trend";
import type { KinetixTelemetryPoint, KinetixTelemetrySeries } from "../types/telemetry";

/**
 * The stories that justify this component existing rather than a sparkline from a chart library.
 *
 * `WithDropouts` is the one to look at: the line stops where the sensor stopped answering and starts
 * again when it resumed. Every charting default would have drawn straight through that gap, which
 * claims a reading that was never taken.
 */
const NOW = Date.parse("2026-01-01T12:00:00.000Z");
const every = (values: (number | null)[], stepMs = 15 * 60_000): KinetixTelemetrySeries => ({
  deviceId: "probe-1",
  metric: "temperature",
  points: values.map<KinetixTelemetryPoint>((value, index) => ({
    timestamp: new Date(NOW - (values.length - 1 - index) * stepMs).toISOString(),
    metric: "temperature",
    unit: "°C",
    ...(value === null ? { value: 0, quality: "missing" as const } : { value }),
  })),
});

const meta = {
  title: "IoT/TelemetryTrend",
  component: TelemetryTrend,
  parameters: { layout: "centered" },
  args: { series: every([3.9, 4.1, 4.4, 4.2, 3.8, 4.0, 4.3, 4.6, 4.4, 4.1]) },
  decorators: [
    (Story) => (
      <div className="w-[26rem] max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TelemetryTrend>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The gap is drawn as a gap and stated as a count. Nothing bridges it. */
export const WithDropouts: Story = {
  args: { series: every([3.9, 4.1, null, null, null, 4.0, 4.3, 4.6, null, 4.1]) },
};

/** One reading surrounded by silence is still a reading, so it is a dot rather than nothing. */
export const SingleSurvivingReading: Story = {
  args: { series: every([null, null, null, 4.2, null, null, null]) },
};

/** Nothing plottable: an empty state, not an axis drawn between two nulls. */
export const NothingMeasured: Story = {
  args: { series: every([null, null, null, null]) },
};

/** A value that did not move is a flat line through the middle, not a divide-by-zero. */
export const Flat: Story = {
  args: { series: every([7, 7, 7, 7, 7, 7]) },
};

/** A negative range must not be mistaken for missing data. */
export const BelowZero: Story = {
  args: { series: every([-18.2, -19.4, -18.8, -21.1, -20.3, -19.0]) },
};

/**
 * The plot stays left-to-right under RTL while its labels flip. Mirroring a time axis would make the
 * same series read as falling in one locale and rising in another.
 */
export const RightToLeft: Story = {
  args: { series: every([3.9, 4.1, null, 4.0, 4.3, 4.6, 4.1]) },
  decorators: [
    (Story) => (
      <div dir="rtl" className="w-[26rem] max-w-full">
        <Story />
      </div>
    ),
  ],
};

/** Narrow: the bounds line wraps rather than overflowing, and the plot keeps its stroke weight. */
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div className="w-[12rem]">
        <Story />
      </div>
    ),
  ],
};
