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

/**
 * How long the interactive stories below hold a request before the "device" agrees.
 *
 * Shorter than `RequestThenConfirm`'s 1.2s, which is deliberately slow so the gap can be studied. These
 * stories are about what *using* a control feels like, so the round trip is a beat rather than a pause —
 * long enough to see the requested treatment, short enough that the control does not feel broken.
 */
const CONFIRM_MS = 600;

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

/**
 * Drag the brightness and watch the fill, not the number.
 *
 * `Level` above is a column of fixed states, which proves they are distinguishable and proves nothing about
 * what using one feels like. Here the request is held for {@link CONFIRM_MS} before the device agrees, so the
 * two halves of the control are visibly doing different jobs: the dashed requested chip appears the instant
 * you let go, and the solid fill slides to the new value only once the device has confirmed it.
 *
 * The fill's travel is the component's own `transition-[width] duration-base`; under
 * `prefers-reduced-motion: reduce` it is removed and the fill simply arrives at the new width.
 *
 * The control stays interactive while the request is open, which is the opposite of what `Mode` below does
 * and deliberate. `resolveControlState` makes a pending control non-interactive so a user cannot send a
 * device two commands — right for a discrete one, wrong for a continuous one, where the second change is not
 * a duplicate but a correction. Keyboard users feel this most: five presses of ArrowRight against a locked
 * slider move it once. The request is still drawn honestly — the solid fill is the confirmed level, the
 * hatched extension is the one that has only been asked for.
 */
export const LevelInteractive: Story = {
  render: function Interactive() {
    const [confirmed, setConfirmed] = React.useState(40);
    const [requested, setRequested] = React.useState<number | null>(null);

    React.useEffect(() => {
      if (requested === null) return;
      const t = setTimeout(() => {
        setConfirmed(requested);
        setRequested(null);
      }, CONFIRM_MS);
      return () => clearTimeout(t);
    }, [requested]);

    return (
      <Row label={requested === null ? "Settled" : "Waiting for the device"}>
        <DeviceLevelControl
          value={confirmed}
          target={requested ?? undefined}
          min={0}
          max={100}
          step={5}
          unit="%"
          label="Brightness"
          control={READY}
          onCommit={(next) => setRequested(next)}
        />
      </Row>
    );
  },
};

/**
 * Pick a mode and watch the selection move.
 *
 * The selected option's background and text are a `transition-colors duration-fast`, so the selection travels
 * rather than teleporting — which is what tells a reader the two buttons are one control. While the request is
 * open the chosen mode is outlined and dashed, never filled: filled means the device agreed.
 *
 * Unlike `LevelInteractive` above, this one does take itself out of reach while the request is in flight, which
 * is `resolveControlState`'s default and the right one here: a mode is a discrete command, and pressing Cool
 * twice in 600ms sends a device two of them.
 */
export const ModeInteractive: Story = {
  render: function Interactive() {
    const [confirmed, setConfirmed] = React.useState("heat");
    const [requested, setRequested] = React.useState<string | null>(null);

    React.useEffect(() => {
      if (requested === null) return;
      const t = setTimeout(() => {
        setConfirmed(requested);
        setRequested(null);
      }, CONFIRM_MS);
      return () => clearTimeout(t);
    }, [requested]);

    return (
      <Row label={requested === null ? "Settled" : "Waiting for the device"}>
        <DeviceModeControl
          modes={[
            { id: "heat", label: "Heat" },
            { id: "cool", label: "Cool" },
            { id: "fan", label: "Fan only" },
          ]}
          value={confirmed}
          requested={requested ?? undefined}
          label="Climate mode"
          control={resolveControlState({ deviceStatus: "online", commandStatus: requested === null ? undefined : "sent" })}
          onSelect={(id) => setRequested(id)}
        />
      </Row>
    );
  },
};

/**
 * Nudge the target. Nothing waits for you.
 *
 * A setpoint is pressed repeatedly — up, up, up — so a control that blocks the second press while the first is
 * in flight is a control nobody can use. Every press moves the *requested* target immediately and restarts the
 * confirmation window, so the feedback is instant and only the device's agreement is deferred. The ring's filled
 * arc then travels to the confirmed value over `duration-base`; under reduced motion it arrives without the
 * travel, and the number, the chip and the sentence all say the same thing either way.
 */
export const SetpointInteractive: Story = {
  render: function Interactive() {
    const [confirmed, setConfirmed] = React.useState(20.5);
    const [requested, setRequested] = React.useState<number | null>(null);

    React.useEffect(() => {
      if (requested === null) return;
      const t = setTimeout(() => {
        setConfirmed(requested);
        setRequested(null);
      }, CONFIRM_MS);
      return () => clearTimeout(t);
    }, [requested]);

    return (
      <Row label={requested === null ? "Settled" : "Waiting for the device"}>
        <DeviceSetpointControl
          current={19}
          target={confirmed}
          requestedTarget={requested ?? undefined}
          min={15}
          max={28}
          step={0.5}
          unit="°C"
          label="Studio 2 temperature"
          presentation="ring"
          activity={confirmed > 19 ? "Heating" : "Idle"}
          // Deliberately NOT resolved as pending: a setpoint the user cannot press again until the last press
          // has landed is unusable. The request is honest in the picture — dashed arc, dashed chip — without
          // taking the control away.
          control={READY}
          onCommit={(next) => setRequested(next)}
        />
      </Row>
    );
  },
};
