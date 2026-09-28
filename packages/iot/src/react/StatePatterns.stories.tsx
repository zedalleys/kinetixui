import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AlertCard } from "./alert-card";
import { CommandStatus } from "./command-status";
import { ConnectionHealth } from "./connection-health";
import { DeviceStateSummary } from "./device-state-summary";
import { FirmwareStatus } from "./firmware-status";
import { TelemetryCard } from "./telemetry-card";
import type { KinetixDevice } from "../types/device";
import type { KinetixTelemetrySeries } from "../types/telemetry";

/**
 * The smaller patterns, grouped into one file.
 *
 * Six components that each render one state as a word would be six near-empty story files; what is
 * worth seeing is each component's *set* of states side by side, which is how the emphasis gets
 * judged. So each export below is one component across its meaningful states.
 */
const NOW = "2026-01-01T12:00:00.000Z";
const ago = (ms: number) => new Date(Date.parse(NOW) - ms).toISOString();

const meta = {
  title: "IoT/State patterns",
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="flex w-[30rem] max-w-full flex-col gap-4">
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

const probe: KinetixDevice = {
  id: "probe-1",
  name: "Cold store probe",
  type: "sensor",
  status: "online",
  battery: 64,
  signal: 71,
  lastSeenAt: ago(90_000),
};

/**
 * The troubleshooting surface. The third row is the one a status field alone gets wrong: a device can
 * be "online" and have sent nothing for six hours, and only the data row says so.
 */
export const Connection: Story = {
  render: () => (
    <>
      <Label>Healthy</Label>
      <ConnectionHealth device={probe} freshnessMs={10 * 60_000} now={NOW} />
      <Label>Online, but silent for six hours</Label>
      <ConnectionHealth device={{ ...probe, lastSeenAt: ago(6 * 3_600_000) }} freshnessMs={10 * 60_000} now={NOW} />
      <Label>Weak signal</Label>
      <ConnectionHealth device={{ ...probe, signal: 8 }} freshnessMs={10 * 60_000} now={NOW} />
      <Label>Signal never reported — not the same as a signal of zero</Label>
      <ConnectionHealth device={{ ...probe, signal: undefined }} freshnessMs={10 * 60_000} now={NOW} />
      <Label>No freshness threshold supplied, so no freshness claim is made</Label>
      <ConnectionHealth device={probe} now={NOW} />
    </>
  ),
};

/** Only `critical` takes the destructive surface: a list where everything is red reads as nothing. */
export const Alerts: Story = {
  render: () => (
    <>
      {(["critical", "warning", "info"] as const).map((severity) => (
        <AlertCard
          key={severity}
          alert={{ id: severity, deviceId: "probe-1", severity, message: "Temperature above threshold for 12 minutes", raisedAt: ago(9 * 60_000) }}
          deviceName="Cold store probe"
          now={NOW}
          action={
            <button type="button" className="rounded-md border border-input px-2 py-1 text-label-sm text-foreground hover:bg-muted">
              Acknowledge
            </button>
          }
        />
      ))}
      <Label>Acknowledged — still critical, no longer new</Label>
      <AlertCard
        alert={{ id: "ack", deviceId: "probe-1", severity: "critical", message: "Door left open", raisedAt: ago(40 * 60_000), acknowledgedAt: ago(20 * 60_000) }}
        deviceName="Cold store probe"
        now={NOW}
      />
    </>
  ),
};

/** Queued, sent and acknowledged are three different things, and none of them is done. */
export const Commands: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      {(["queued", "sent", "acknowledged", "completed", "failed", "cancelled", "expired"] as const).map((status) => (
        <CommandStatus
          key={status}
          showName
          command={{
            id: status,
            deviceId: "probe-1",
            name: "reboot",
            status,
            createdAt: ago(2 * 60_000),
            updatedAt: ago(30_000),
            ...(status === "failed" ? { errorMessage: "Device refused: busy" } : {}),
          }}
          now={NOW}
        />
      ))}
    </div>
  ),
};

/** `unknown` is rendered, not defaulted to "up to date". */
export const Firmware: Story = {
  render: () => (
    <>
      <FirmwareStatus firmware={{ status: "up-to-date", currentVersion: "2.4.1" }} />
      <FirmwareStatus firmware={{ status: "update-available", currentVersion: "2.4.1", availableVersion: "2.6.0" }} />
      <FirmwareStatus firmware={{ status: "updating", currentVersion: "2.4.1", availableVersion: "2.6.0" }} />
      <FirmwareStatus firmware={{ status: "failed", currentVersion: "2.4.1", availableVersion: "2.6.0" }} />
      <Label>Never reported a version</Label>
      <FirmwareStatus firmware={{ status: "unknown" }} />
    </>
  ),
};

const fleet: KinetixDevice[] = [
  { ...probe, id: "a", status: "online" },
  { ...probe, id: "b", status: "online" },
  { ...probe, id: "c", status: "online" },
  { ...probe, id: "d", status: "stale" },
  { ...probe, id: "e", status: "offline" },
  { ...probe, id: "f", status: "error" },
];

export const GroupSummary: Story = {
  render: () => (
    <>
      <Label>Only the states present</Label>
      <DeviceStateSummary devices={fleet} />
      <Label>Every state, for a tile whose layout must not move</Label>
      <DeviceStateSummary devices={fleet} showEmpty />
      <Label>Empty group</Label>
      <DeviceStateSummary devices={[]} />
    </>
  ),
};

const temperature = (values: (number | null)[]): KinetixTelemetrySeries => ({
  deviceId: "probe-1",
  metric: "temperature",
  points: values.map((value, index) => ({
    timestamp: new Date(Date.parse(NOW) - (values.length - 1 - index) * 15 * 60_000).toISOString(),
    metric: "temperature",
    unit: "°C",
    ...(value === null ? { value: 0, quality: "missing" as const } : { value }),
  })),
});

/** The card every reference draws with a confident number in it, drawn honestly. */
export const Telemetry: Story = {
  render: () => (
    <>
      <TelemetryCard series={temperature([3.9, 4.1, 4.4, 4.2, 3.8, 4.0, 4.3])} metric="Temperature" precision={1} now={NOW} />
      <Label>Newest reading missing — the value slot says so</Label>
      <TelemetryCard series={temperature([3.9, 4.1, 4.4, 4.2, null])} metric="Temperature" precision={1} now={NOW} />
      <Label>Nothing measured at all</Label>
      <TelemetryCard series={temperature([null, null, null])} metric="Temperature" precision={1} now={NOW} />
    </>
  ),
};

export const RightToLeft: Story = {
  render: () => (
    <>
      <ConnectionHealth device={{ ...probe, signal: 8 }} freshnessMs={10 * 60_000} now={NOW} />
      <AlertCard
        alert={{ id: "rtl", deviceId: "probe-1", severity: "critical", message: "Temperature above threshold", raisedAt: ago(9 * 60_000) }}
        deviceName="Cold store probe"
        now={NOW}
      />
      <FirmwareStatus firmware={{ status: "update-available", currentVersion: "2.4.1", availableVersion: "2.6.0" }} />
      <DeviceStateSummary devices={fleet} />
      <TelemetryCard series={temperature([3.9, 4.1, null, 4.2, 3.8])} metric="Temperature" precision={1} now={NOW} />
    </>
  ),
  decorators: [
    (Story) => (
      <div dir="rtl" className="flex w-[30rem] max-w-full flex-col gap-4">
        <Story />
      </div>
    ),
  ],
};
