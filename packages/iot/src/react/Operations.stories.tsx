import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ActivityTimeline } from "./activity-timeline";
import { AlertList } from "./alert-list";
import { DeviceGroupCard } from "./device-group-card";
import { DeviceHealthSummary } from "./device-health-summary";
import { SpaceBreadcrumb } from "./space-breadcrumb";
import { SpaceRollup } from "./space-rollup";
import type { KinetixActivityEvent } from "../types/activity";
import type { KinetixDeviceAlert } from "../types/alert";
import type { KinetixDevice } from "../types/device";
import { acknowledgeAlert } from "../functions/alerts";
import { buildSpaceTree, rollupSpaceHealth, spacePath } from "../functions/hierarchy";

/**
 * Operating a fleet: alerts, health, places and history.
 *
 * `DeviceHealthSummary` shows the one rule worth checking by eye — a device is in exactly one bucket,
 * so "22 healthy · 1 warning · 1 offline" adds to 24. The alert list acknowledges in place, so the
 * row visibly moves from New to Acknowledged and drops below the unacknowledged ones.
 */
const NOW = "2026-01-01T12:00:00.000Z";
const MIN = 60_000;
const ago = (ms: number) => new Date(Date.parse(NOW) - ms).toISOString();

const meta = {
  title: "IoT/Operations",
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="flex w-[34rem] max-w-full flex-col gap-5">
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

const dev = (i: number, over: Partial<KinetixDevice> = {}): KinetixDevice => ({ id: `d${i}`, name: `Device ${i}`, type: "sensor", status: "online", battery: 80, signal: 80, lastSeenAt: ago(MIN), ...over });
const site04 = [...Array.from({ length: 22 }, (_, i) => dev(i + 1)), dev(23, { status: "warning" }), dev(24, { status: "offline", lastSeenAt: ago(3 * 60 * MIN) })];

export const HealthSummary: Story = {
  render: () => (
    <>
      <DeviceHealthSummary devices={site04} assess={{ now: NOW }} />
      <Label>Compact</Label>
      <DeviceHealthSummary devices={site04} assess={{ now: NOW }} compact />
      <Label>Empty</Label>
      <DeviceHealthSummary devices={[]} />
    </>
  ),
};

const alerts: KinetixDeviceAlert[] = [
  { id: "1", deviceId: "pump-1", severity: "critical", kind: "pressure-high", message: "Discharge pressure above the safe limit", source: "Rule 12", raisedAt: ago(9 * MIN), action: { id: "stop", label: "Stop pump" } },
  { id: "2", deviceId: "valve-2", severity: "warning", kind: "flow-low", message: "Flow below the expected range", raisedAt: ago(40 * MIN) },
  { id: "3", deviceId: "probe-3", severity: "info", kind: "firmware-update-required", message: "Firmware update available", raisedAt: ago(5 * 60 * MIN), acknowledgedAt: ago(4 * 60 * MIN) },
  { id: "4", deviceId: "pump-1", severity: "warning", kind: "low-battery", message: "Backup battery low", raisedAt: ago(9 * 60 * MIN), resolvedAt: ago(8 * 60 * MIN) },
];
const names: Record<string, string> = { "pump-1": "Pump 1", "valve-2": "Valve 2", "probe-3": "Cold room probe" };

export const Alerts: Story = {
  render: function AlertsStory() {
    const [list, setList] = React.useState(alerts);
    return (
      <>
        <AlertList alerts={list} now={NOW} deviceName={(id) => names[id]} onAcknowledge={(a) => setList((l) => l.map((x) => (x.id === a.id ? acknowledgeAlert(x, NOW) : x)))} onAction={() => {}} />
        <Label>Grouped by device</Label>
        <AlertList alerts={list} now={NOW} deviceName={(id) => names[id]} groupByDevice hideSummary />
        <Label>Empty</Label>
        <AlertList alerts={[]} />
      </>
    );
  },
};

const tree = buildSpaceTree([
  { id: "farm", name: "North Farm", kind: "farm" },
  { id: "field", name: "Field 3", kind: "field", parentId: "farm" },
  { id: "zone", name: "Zone B", kind: "zone", parentId: "field", deviceIds: ["d1", "d23", "d24", "ghost"] },
]);
const rollups = rollupSpaceHealth(tree, site04, { now: NOW });

export const Places: Story = {
  render: () => (
    <>
      <SpaceBreadcrumb path={spacePath(tree, "zone")} onNavigate={() => {}} />
      <SpaceRollup rollup={rollups.get("zone")!} name="Zone B" />
      <DeviceGroupCard
        name="Zone B"
        kind="Zone"
        deviceCount={4}
        activeCount={1}
        attentionCount={2}
        category="valve"
        path={<SpaceBreadcrumb path={spacePath(tree, "zone")} onNavigate={() => {}} />}
        rollup={<SpaceRollup rollup={rollups.get("zone")!} compact />}
        onSelect={() => {}}
      />
      <div dir="rtl">
        <SpaceBreadcrumb path={spacePath(tree, "zone")} onNavigate={() => {}} />
      </div>
    </>
  ),
};

const events: KinetixActivityEvent[] = [
  { id: "1", timestamp: ago(4 * MIN), kind: "command", deviceId: "valve-2", message: "Open valve", actor: "Sam", source: "app", status: "requested" },
  { id: "2", timestamp: ago(30 * MIN), kind: "command", deviceId: "pump-1", message: "Stop pump", status: "confirmed" },
  { id: "3", timestamp: ago(90 * MIN), kind: "alert", deviceId: "pump-1", message: "Pressure above the safe limit" },
  { id: "4", timestamp: ago(26 * 60 * MIN), kind: "firmware", deviceId: "probe-3", message: "Update installed", status: "confirmed", detail: "Version 2.4.1" },
  { id: "5", timestamp: ago(27 * 60 * MIN), kind: "automation", message: "Night watering started", source: "schedule", status: "timed-out" },
];

export const Activity: Story = {
  render: () => <ActivityTimeline events={events} now={NOW} deviceName={(id) => names[id]} />,
};

/** `blocks` (time on the start side, a soft block per event) and `compact` (one line, for a rail). */
export const ActivityVariants: Story = {
  render: () => (
    <>
      <Label>blocks</Label>
      <ActivityTimeline variant="blocks" events={events} now={NOW} deviceName={(id) => names[id]} label="Activity blocks" />
      <Label>compact</Label>
      <ActivityTimeline variant="compact" events={events} now={NOW} deviceName={(id) => names[id]} label="Activity compact" />
    </>
  ),
};

/** Compact alert rows for a rail, and the large-numeral health summary. */
export const AlertsCompact: Story = {
  render: () => (
    <>
      <AlertList variant="compact" alerts={alerts} now={NOW} deviceName={(id) => names[id]} onAcknowledge={() => {}} />
      <Label>Health summary, size lg</Label>
      <DeviceHealthSummary devices={site04} assess={{ now: NOW }} size="lg" />
    </>
  ),
};
