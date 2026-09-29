import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DeviceControlCard } from "./device-control-card";
import { DeviceGroupCard } from "./device-group-card";
import { DeviceLevelControl } from "./device-level-control";
import { DevicePowerControl } from "./device-power-control";
import { RoutineCard } from "./routine-card";
import { resolveControlState } from "../functions/control";
import type { KinetixDevice } from "../types/device";

/**
 * Composition: what the controls look like once they are in the thing a product actually ships.
 *
 * The card stories exist to check one claim — that a grid of these is **scannable**. A device grid
 * fails when every card looks the same until you read it, so what matters below is whether the
 * active ones, the pending one and the unreachable one separate at a glance, and whether they still
 * separate with the colour turned off.
 *
 * All data here is fabricated.
 */
const NOW = "2026-01-01T12:00:00.000Z";
const ago = (ms: number) => new Date(Date.parse(NOW) - ms).toISOString();
const ahead = (ms: number) => new Date(Date.parse(NOW) + ms).toISOString();

const READY = resolveControlState({ deviceStatus: "online" });
const PENDING = resolveControlState({ deviceStatus: "online", commandStatus: "sent" });
const OFFLINE = resolveControlState({ deviceStatus: "offline" });

const device = (over: Partial<KinetixDevice>): KinetixDevice => ({
  id: "d",
  name: "Device",
  type: "light",
  status: "online",
  lastSeenAt: ago(60_000),
  ...over,
});

const meta = {
  title: "IoT/Composition",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const DeviceGrid: Story = {
  render: () => (
    <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <DeviceControlCard
        device={device({ id: "1", name: "Bench lamp", type: "light" })}
        active
        control={READY}
        statusLine="Full brightness"
        primaryControl={<DevicePowerControl state="on" control={READY} label="Bench lamp" showLabel={false} />}
        expanded={<DeviceLevelControl value={100} control={READY} label="Brightness" />}
      />
      <DeviceControlCard
        device={device({ id: "2", name: "Store room", type: "light" })}
        control={READY}
        statusLine="Off since 21:40"
        primaryControl={<DevicePowerControl state="off" control={READY} label="Store room" showLabel={false} />}
      />
      <DeviceControlCard
        device={device({ id: "3", name: "Loading bay", type: "light" })}
        control={PENDING}
        statusLine="Turning on"
        primaryControl={<DevicePowerControl state="off" requested="on" control={PENDING} label="Loading bay" showLabel={false} />}
      />
      <DeviceControlCard
        device={device({ id: "4", name: "Yard flood", type: "light", status: "offline", lastSeenAt: ago(3 * 3_600_000) })}
        control={OFFLINE}
        statusLine="Last reachable 3h ago"
        primaryControl={<DevicePowerControl state="on" control={OFFLINE} label="Yard flood" showLabel={false} />}
      />
      <DeviceControlCard
        device={device({ id: "5", name: "Irrigation valve 2", type: "valve" })}
        active
        control={READY}
        statusLine="Open — cycle 2 of 4"
        primaryControl={<DevicePowerControl state="on" control={READY} label="Irrigation valve 2" showLabel={false} />}
      />
      <DeviceControlCard
        device={device({ id: "6", name: "Cold store probe", type: "sensor", status: "stale", lastSeenAt: ago(40 * 60_000) })}
        control={resolveControlState({ deviceStatus: "stale" })}
        statusLine="−18.2 °C, last known"
      />
    </div>
  ),
};

export const Groups: Story = {
  render: () => (
    <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <DeviceGroupCard name="Packing hall" kind="Zone" deviceCount={12} activeCount={7} category="light" summary="21°C · 48% RH" />
      {/* One fault outranks four running pumps: a group reads as the thing that needs you. */}
      <DeviceGroupCard name="North field" kind="Zone" deviceCount={8} activeCount={4} attentionCount={1} category="pump" summary="3 of 8 valves open" />
      <DeviceGroupCard name="Cold store" kind="Site" deviceCount={5} activeCount={0} category="sensor" summary="All within range" />
    </div>
  ),
};

export const Automations: Story = {
  render: () => (
    <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
      <RoutineCard
        now={NOW}
        automation={{
          id: "r1",
          name: "Evening irrigation",
          kind: "schedule",
          status: "idle",
          enabled: true,
          trigger: "Weekdays 18:30",
          actions: "2 valves, 40 min",
          lastRunAt: ago(20 * 3_600_000),
          nextRunAt: ahead(6 * 3_600_000),
        }}
      />
      <RoutineCard
        now={NOW}
        automation={{
          id: "r2",
          name: "Shutdown",
          kind: "scene",
          status: "running",
          enabled: true,
          actions: "9 lights, 2 doors",
        }}
      />
      <RoutineCard
        now={NOW}
        automation={{
          id: "r3",
          name: "Frost protection",
          kind: "routine",
          status: "failed",
          enabled: true,
          trigger: "Outside below 2°C",
          actions: "Circulation pump",
          lastRunAt: ago(90 * 60_000),
          errorMessage: "Pump did not acknowledge",
        }}
      />
      <RoutineCard
        now={NOW}
        automation={{
          id: "r4",
          name: "Holiday mode",
          kind: "routine",
          status: "idle",
          enabled: false,
          trigger: "Manual",
          actions: "Setback 4°C",
        }}
      />
    </div>
  ),
};
