import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DeviceCard } from "./device-card";
import { KINETIX_DEVICE_STATUSES, type KinetixDevice } from "../types/device";

/**
 * Hand-written, unlike the `packages/ui` stories that `scripts/gen-stories.mjs` generates.
 *
 * Every story here shows a state a fleet actually reaches and a concept mockup never does — a device
 * mid-update, a sensor that stopped answering, a battery nobody reports. The default story is the
 * least interesting one on purpose: the rest are why this component is not a `<div>`.
 *
 * `now` is fixed in every story so the relative times do not drift between runs, which matters
 * because these are the subjects of the real-browser axe sweep as well as visual review.
 */
const NOW = "2026-01-01T12:00:00.000Z";
const ago = (ms: number) => new Date(Date.parse(NOW) - ms).toISOString();

const base: KinetixDevice = {
  id: "probe-1",
  name: "Cold store probe",
  type: "temperature-sensor",
  status: "online",
  battery: 64,
  signal: 71,
  lastSeenAt: ago(2 * 60_000),
  locationName: "Cold store A",
};

const meta = {
  title: "IoT/DeviceCard",
  component: DeviceCard,
  parameters: { layout: "centered" },
  args: { device: base, reading: { metric: "Temperature", value: 4.2, unit: "°C" }, now: NOW },
  decorators: [
    (Story) => (
      <div className="w-[22rem] max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DeviceCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every status the model has, so the emphasis can be judged as a set rather than one at a time. */
export const EveryStatus: Story = {
  decorators: [
    (Story) => (
      <div className="grid w-[46rem] max-w-full grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))] gap-3">
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <>
      {KINETIX_DEVICE_STATUSES.map((status) => (
        <DeviceCard {...args} key={status} device={{ ...base, id: status, name: `Probe · ${status}`, status }} />
      ))}
    </>
  ),
};

/**
 * The rule shipped products converge on: while a device is transitioning, the value it reported
 * before the transition is not its current value, so it is not shown as one.
 */
export const InTransition: Story = {
  args: { device: { ...base, status: "updating" } },
};

/** A sensor that did not answer. The card must not render a confident zero. */
export const MissingTelemetry: Story = {
  args: { reading: { metric: "Temperature", value: 0, unit: "°C", quality: "missing" } },
};

/** `unknown` is not `0`: this device reports neither a battery nor a signal, and says so by absence. */
export const NoBatteryOrSignal: Story = {
  args: { device: { ...base, battery: undefined, signal: undefined } },
};

export const LowBatteryWeakSignal: Story = {
  args: { device: { ...base, status: "warning", battery: 7, signal: 11 } },
};

/** The action slot. What the control does is the product's business; where it sits is the card's. */
export const WithAction: Story = {
  args: {
    action: (
      <button
        type="button"
        className="rounded-md border border-input px-2 py-1 text-label-sm text-foreground hover:bg-muted"
      >
        Restart
      </button>
    ),
  },
};

/** Logical properties throughout, so the status and action move to the start edge under RTL. */
export const RightToLeft: Story = {
  decorators: [
    (Story) => (
      <div dir="rtl" className="w-[22rem] max-w-full">
        <Story />
      </div>
    ),
  ],
};

/** The narrow case: long names truncate rather than forcing the card wider than its column. */
export const Narrow: Story = {
  args: { device: { ...base, name: "Cold store probe, loading bay, north elevation, unit 4" } },
  decorators: [
    (Story) => (
      <div className="w-[15rem]">
        <Story />
      </div>
    ),
  ],
};
