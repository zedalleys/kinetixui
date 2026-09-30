import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DeviceLevelControl } from "./device-level-control";
import { DeviceModeControl } from "./device-mode-control";
import { DevicePowerControl } from "./device-power-control";
import { DeviceSetpointControl } from "./device-setpoint-control";
import { resolveControlState } from "../functions/control";

/**
 * The control layer, shown as state sets rather than as single happy-path instances.
 *
 * What is worth looking at here is the **column** rather than any one control: ready, requested,
 * offline and stale side by side, because the whole design question is whether a user can tell them
 * apart at a glance and without colour. A story that showed only the ready state would look fine and
 * prove nothing.
 *
 * The interactive stories below hold their own state so the pending treatment can actually be seen:
 * a request is held for a beat before it "confirms", which is what a real device does and what a
 * mocked-instant one hides.
 */
const READY = resolveControlState({ deviceStatus: "online" });
const PENDING = resolveControlState({ deviceStatus: "online", commandStatus: "sent" });
const OFFLINE = resolveControlState({ deviceStatus: "offline" });
const STALE = resolveControlState({ deviceStatus: "stale" });

const meta = {
  title: "IoT/Controls",
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

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="text-label-sm uppercase tracking-[0.12em] text-muted-foreground">{children}</p>
);

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-2">
    <Label>{label}</Label>
    {children}
  </div>
);

export const Power: Story = {
  render: () => (
    <>
      <Row label="Confirmed off">
        <DevicePowerControl state="off" control={READY} label="Packing line lamp" />
      </Row>
      <Row label="Requested on, not yet confirmed">
        {/* The track moves because the user asked; the knob stays hollow because the device has not
            agreed. That gap is the entire point of the layer. */}
        <DevicePowerControl state="off" requested="on" control={PENDING} label="Packing line lamp" />
      </Row>
      <Row label="Confirmed on">
        <DevicePowerControl state="on" control={READY} label="Packing line lamp" />
      </Row>
      <Row label="Never reported — not the same as off">
        <DevicePowerControl state={null} control={READY} label="Packing line lamp" />
      </Row>
      <Row label="Offline">
        <DevicePowerControl state="on" control={OFFLINE} label="Packing line lamp" />
      </Row>
    </>
  ),
};

export const Level: Story = {
  render: () => (
    <>
      <Row label="Confirmed">
        <DeviceLevelControl value={40} control={READY} label="Brightness" />
      </Row>
      <Row label="Requested 85, device still reports 40">
        {/* Solid fill is confirmed, hatched fill is requested. Two fills, one track. */}
        <DeviceLevelControl value={40} target={85} control={PENDING} label="Brightness" />
      </Row>
      <Row label="Never reported">
        <DeviceLevelControl value={null} control={READY} label="Brightness" />
      </Row>
      <Row label="Stale — still operable, because sending is how you find out">
        <DeviceLevelControl value={40} control={STALE} label="Brightness" />
      </Row>
    </>
  ),
};

export const Setpoint: Story = {
  render: () => (
    <>
      <Row label="Target reached">
        <DeviceSetpointControl current={21} target={21} min={5} max={30} unit="°C" label="Target" control={READY} />
      </Row>
      <Row label="Target 23 requested, room at 18">
        <DeviceSetpointControl
          current={18}
          target={21}
          requestedTarget={23}
          min={5}
          max={30}
          unit="°C"
          label="Target"
          control={PENDING}
          activity="Heating"
        />
      </Row>
      <Row label="Not a thermostat — the same control, other units">
        {/* Nothing in this component knows about climate. */}
        <DeviceSetpointControl current={2.4} target={3.0} min={0} max={10} step={0.1} unit=" bar" label="Line pressure" control={READY} />
      </Row>
    </>
  ),
};

const MODES = [
  { id: "auto", label: "Auto" },
  { id: "heat", label: "Heat" },
  { id: "cool", label: "Cool" },
  { id: "eco", label: "Eco", description: "Unavailable while the compressor is in defrost", unavailable: true },
];

export const Mode: Story = {
  render: () => (
    <>
      <Row label="Confirmed">
        <DeviceModeControl modes={MODES} value="heat" control={READY} label="Heating mode" />
      </Row>
      <Row label="Cool requested — outlined, never filled">
        <DeviceModeControl modes={MODES} value="heat" requested="cool" control={PENDING} label="Heating mode" />
      </Row>
      <Row label="Unavailable modes stay visible and explain themselves">
        {/* A mode that disappears cannot tell you why it is gone. */}
        <DeviceModeControl modes={MODES} value="auto" control={READY} label="Heating mode" variant="list" />
      </Row>
      <Row label="The product owns the vocabulary — these are not built in">
        <DeviceModeControl
          modes={[
            { id: "idle", label: "Idle" },
            { id: "irrigate", label: "Irrigate" },
            { id: "flush", label: "Flush" },
          ]}
          value="irrigate"
          control={READY}
          label="Valve mode"
        />
      </Row>
    </>
  ),
};

/**
 * Press it and watch the gap.
 *
 * The request is held for 1.2s before it confirms, because that is what a device over a real network
 * does. Every instant-feedback mock hides exactly the state this layer exists to draw.
 */
export const RequestThenConfirm: Story = {
  render: function Interactive() {
    const [confirmed, setConfirmed] = React.useState<"on" | "off">("off");
    const [requested, setRequested] = React.useState<"on" | "off" | null>(null);

    React.useEffect(() => {
      if (requested === null) return;
      const t = setTimeout(() => {
        setConfirmed(requested);
        setRequested(null);
      }, 1200);
      return () => clearTimeout(t);
    }, [requested]);

    const control = resolveControlState({
      deviceStatus: "online",
      commandStatus: requested ? "sent" : undefined,
    });

    return (
      <Row label={requested ? "Waiting for the device" : "Settled"}>
        <DevicePowerControl
          state={confirmed}
          requested={requested ?? undefined}
          control={control}
          label="Packing line lamp"
          onToggle={(next) => setRequested(next)}
        />
      </Row>
    );
  },
};

/** The large, tactile forms: a hero power switch, and a large level readout with its requested marker. */
export const LargeControls: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <DevicePowerControl state="on" control={READY} label="Pendant lamp" size="lg" />
      <DevicePowerControl state="off" requested="on" control={PENDING} label="Pendant lamp" size="lg" />
      <DeviceLevelControl value={20} target={80} control={PENDING} label="Brightness" size="lg" />
    </div>
  ),
};
