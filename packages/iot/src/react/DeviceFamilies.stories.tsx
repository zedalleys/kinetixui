import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CameraDeviceCard } from "./camera-device-card";
import { EnergySummary } from "./energy-summary";
import type { KinetixDevice } from "../types/device";
import { summarizeEnergy } from "../functions/energy";

/**
 * Two device families, each with the thing it must not claim.
 *
 * The camera card never shows a live feed — there is no `<video>` in this package — and hides the
 * poster outright under privacy mode. The energy summary shows application-supplied numbers only:
 * no cost, no carbon, no forecast.
 */
const NOW = "2026-01-01T12:00:00.000Z";
const ago = (ms: number) => new Date(Date.parse(NOW) - ms).toISOString();

const meta = {
  title: "IoT/Device families",
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="flex w-[26rem] max-w-full flex-col gap-5">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const cam: KinetixDevice = { id: "cam", name: "Yard camera", type: "camera", status: "online", battery: 71, signal: 64, locationName: "Back yard" };

export const Camera: Story = {
  render: () => (
    <>
      <CameraDeviceCard device={cam} recording={false} privacy="off" lastEvent={{ label: "Motion detected", at: ago(4 * 60_000) }} now={NOW} controls={<button className="min-h-9 rounded-lg border border-input px-3 text-label-md">Turn privacy on</button>} />
      <CameraDeviceCard device={cam} recording privacy="on" now={NOW} />
      <CameraDeviceCard device={{ ...cam, status: "offline" }} recording={null} now={NOW} poster={<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="Snapshot from this morning" />} posterLabel="Snapshot from 07:12" />
    </>
  ),
};

export const Energy: Story = {
  render: () => (
    <>
      <EnergySummary
        summary={summarizeEnergy([{ id: "hp", label: "Heat pump", value: 12 }, { id: "cr", label: "Cold room", value: 6 }, { id: "li", label: "Lighting", value: 2 }], { limit: 15 })}
        current={{ value: 1.2, unit: "kW" }}
        today={14.5}
        days={[10, 12, null, 14, 20, 9, 11]}
        dayLabels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
      />
      <div dir="rtl">
        <EnergySummary summary={summarizeEnergy([{ id: "hp", label: "Heat pump", value: 12 }])} days={[1, 2, 3, 4, 5, 6, 7]} />
      </div>
    </>
  ),
};
