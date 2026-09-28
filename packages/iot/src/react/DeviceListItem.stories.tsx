import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DeviceListItem } from "./device-list-item";
import { compareDeviceAttention } from "../functions/group";
import type { KinetixDevice } from "../types/device";

/**
 * The list form, which is what a fleet of four hundred devices actually looks like.
 *
 * `Fleet` is sorted with `compareDeviceAttention`, so the worst states are at the top — the ordering
 * comes from the same constant the badge colours do, rather than from a second opinion held here.
 */
const NOW = "2026-01-01T12:00:00.000Z";
const ago = (ms: number) => new Date(Date.parse(NOW) - ms).toISOString();

const fleet: KinetixDevice[] = [
  { id: "1", name: "Cold store probe", type: "sensor", status: "online", battery: 64, signal: 71, lastSeenAt: ago(90_000), locationName: "Cold store A" },
  { id: "2", name: "Loading bay probe", type: "sensor", status: "stale", battery: 41, signal: 28, lastSeenAt: ago(5 * 3_600_000), locationName: "Bay 2" },
  { id: "3", name: "Dock gateway", type: "gateway", status: "error", signal: 4, lastSeenAt: ago(20 * 60_000), locationName: "Dock" },
  { id: "4", name: "Yard sensor", type: "sensor", status: "updating", battery: 88, signal: 62, lastSeenAt: ago(30_000), locationName: "Yard" },
  { id: "5", name: "Office monitor", type: "sensor", status: "offline", battery: 3, signal: 0, lastSeenAt: ago(3 * 86_400_000), locationName: "Office" },
  { id: "6", name: "Chiller probe", type: "sensor", status: "online", battery: 77, signal: 90, lastSeenAt: ago(45_000), locationName: "Chiller" },
];

const readings: Record<string, number | null> = { "1": 4.2, "2": 6.8, "3": null, "4": 3.9, "5": null, "6": 2.1 };

/**
 * The one list wrapper. It is a `render` helper rather than a decorator because Storybook composes a
 * story's decorators INSIDE the meta's, so a story that needed a different width used to end up with
 * `<ul><ul><li>` — which the real-browser axe pass caught and the jsdom tests did not.
 */
const List = ({ width = "w-[40rem]", dir, children }: { width?: string; dir?: "rtl"; children: React.ReactNode }) => (
  <ul dir={dir} className={`${width} max-w-full overflow-hidden rounded-xl border border-border bg-card`}>
    {children}
  </ul>
);

const meta = {
  title: "IoT/DeviceListItem",
  component: DeviceListItem,
  args: { device: fleet[0]!, reading: { value: 4.2, unit: "°C", precision: 1 }, now: NOW },
} satisfies Meta<typeof DeviceListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

const one = (args: React.ComponentProps<typeof DeviceListItem>, width?: string, dir?: "rtl") => (
  <List width={width} dir={dir}>
    <DeviceListItem {...args} />
  </List>
);

const many = (args: React.ComponentProps<typeof DeviceListItem>, dir?: "rtl") => (
  <List dir={dir}>
    {[...fleet].sort(compareDeviceAttention).map((device) => (
      <DeviceListItem
        {...args}
        key={device.id}
        device={device}
        reading={{ value: readings[device.id] ?? null, unit: "°C", precision: 1 }}
      />
    ))}
  </List>
);

export const Default: Story = { render: (args) => one(args) };

/** Worst first, mixed states, some without a reading at all. */
export const Fleet: Story = { render: (args) => many(args) };

/** In a scanned column, a stale number among live ones reads as live — so it is withheld. */
export const InTransition: Story = { args: { device: fleet[3]! }, render: (args) => one(args) };

/** A stale device keeps its last known reading; the badge is what says not to trust it as current. */
export const Stale: Story = {
  args: { device: fleet[1]!, reading: { value: 6.8, unit: "°C", precision: 1 } },
  render: (args) => one(args),
};

export const WithAction: Story = {
  args: {
    action: (
      <button type="button" className="rounded-md border border-input px-2 py-1 text-label-sm text-foreground hover:bg-muted">
        Reboot
      </button>
    ),
  },
  render: (args) => one(args),
};

export const RightToLeft: Story = { render: (args) => many(args, "rtl") };

/** Narrow: the last-seen column drops out below `sm`, leaving identity, value and state. */
export const Narrow: Story = { render: (args) => one(args, "w-[18rem]") };
