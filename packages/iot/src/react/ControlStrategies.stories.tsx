import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DeviceColorControl } from "./device-color-control";
import { DeviceControlCard } from "./device-control-card";
import { DeviceLevelControl } from "./device-level-control";
import { DeviceLockControl } from "./device-lock-control";
import { DeviceMediaControl } from "./device-media-control";
import { DeviceModeControl } from "./device-mode-control";
import { DevicePowerControl } from "./device-power-control";
import { DeviceSetpointControl } from "./device-setpoint-control";
import {
  KINETIX_CONNECTIVITY_STATES,
  describeConnectivity,
  resolveControlState,
  startCommandLifecycle,
  summarizeDeviceState,
  supersedeCommandLifecycle,
  transitionCommandLifecycle,
  type KinetixCommandLifecycle,
  type KinetixCommandLifecycleEvent,
  type KinetixCommandStrategy,
  type KinetixDeviceColor,
  type KinetixDeviceState,
} from "../functions";

/**
 * M2A and M2B: the controls driven by a command lifecycle and a strategy, as deterministic scripts.
 *
 * Nothing here talks to hardware and nothing runs on a timer. Each story holds one lifecycle and a
 * row of buttons that play the device's side — confirm, fail, a late reply, a report from the
 * physical switch — so every state can be reached on purpose, by a person or by
 * `scripts/iot-control-strategies.mjs`, and looked at for as long as it takes.
 *
 * The strategy never changes the lifecycle. It changes what is drawn while a request is open.
 */
const meta = {
  title: "IoT/Control strategies",
  // Padded, not centered: Storybook's centring wrapper sizes itself to its content, so a 26rem column
  // at 200% text pushed a 390px viewport 500px sideways. This column shrinks to the viewport instead.
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="mx-auto flex w-full max-w-[26rem] flex-col gap-5">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A deterministic clock: every event is 100ms after the previous one. */
function useScript<T>(initial: () => KinetixCommandLifecycle<T>) {
  const [state, setState] = React.useState(() => ({ lifecycle: initial(), at: 0, refused: "" }));
  const apply = (event: KinetixCommandLifecycleEvent) =>
    setState((s) => {
      const at = s.at + 100;
      const result = transitionCommandLifecycle(s.lifecycle, event, at);
      return { lifecycle: result.state, at, refused: result.ok ? "" : result.rejection.code };
    });
  const replace = (next: (l: KinetixCommandLifecycle<T>) => KinetixCommandLifecycle<T>) =>
    setState((s) => ({ ...s, lifecycle: next(s.lifecycle), refused: "" }));
  const reset = () => setState({ lifecycle: initial(), at: 0, refused: "" });
  /** `observedAt` on the same clock, so report ordering is part of the script. */
  const observed = (offset = 0) => new Date(state.at + 100 + offset).toISOString();
  return { ...state, apply, replace, reset, observed };
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="text-label-sm uppercase tracking-[0.12em] text-muted-foreground">{children}</p>
);

/** The device's side of the conversation. Real buttons, so the script is keyboard-operable too. */
function Script({ children, stage, refused }: { children: React.ReactNode; stage: string; refused?: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-muted/60 p-3">
      <Label>Device script</Label>
      <div className="flex flex-wrap gap-2">{children}</div>
      <p className="text-label-md text-muted-foreground" data-script-stage={stage}>
        Lifecycle: {stage}
        {refused ? ` · last event refused (${refused})` : ""}
      </p>
    </div>
  );
}

function Step({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-11 rounded-lg border border-input bg-background px-3 text-label-lg text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background forced-colors:focus-visible:outline forced-colors:focus-visible:outline-2 md:min-h-9"
    >
      {children}
    </button>
  );
}

function PowerScript({ strategy, ending }: { strategy: KinetixCommandStrategy; ending: "confirm" | "fail" }) {
  const s = useScript(() => startCommandLifecycle<string>({ confirmed: "off" }));
  return (
    <>
      <Label>{`Power · ${strategy}`}</Label>
      <DevicePowerControl
        lifecycle={s.lifecycle}
        strategy={strategy}
        label="Workshop lamp"
        size="lg"
        onToggle={(next) => s.replace((l) => run(supersedeCommandLifecycle(l, next, { commandId: "c1" }), { type: "sent" }, s.at + 100))}
      />
      <Script stage={s.lifecycle.stage} refused={s.refused}>
        {ending === "confirm" ? (
          <Step onClick={() => s.apply({ type: "confirm", commandId: "c1" })}>Device confirms</Step>
        ) : (
          <Step onClick={() => s.apply({ type: "fail", commandId: "c1", reason: "Relay did not close." })}>Device fails</Step>
        )}
        <Step onClick={s.reset}>Reset</Step>
      </Script>
    </>
  );
}

function run<T>(state: KinetixCommandLifecycle<T>, event: KinetixCommandLifecycleEvent, at: number) {
  return transitionCommandLifecycle(state, event, at).state;
}

export const PowerConfirmedSuccess: Story = { name: "Power: confirmed, success", render: () => <PowerScript strategy="confirmed" ending="confirm" /> };
export const PowerOptimisticFailure: Story = { name: "Power: optimistic, failure and rollback", render: () => <PowerScript strategy="optimistic" ending="fail" /> };
export const PowerHybridSuccess: Story = { name: "Power: hybrid, success", render: () => <PowerScript strategy="hybrid" ending="confirm" /> };

export const PowerUnreachableReconnect: Story = {
  name: "Power: unreachable, then a reconnect report",
  render: function Render() {
    const s = useScript(() => run(startCommandLifecycle<string>({ confirmed: "off", requested: "on", commandId: "c1" }), { type: "sent" }, 0));
    return (
      <>
        <Label>Power · confirmed · the device drops off and comes back</Label>
        <DevicePowerControl lifecycle={s.lifecycle} label="Workshop lamp" size="lg" />
        <Script stage={s.lifecycle.stage} refused={s.refused}>
          <Step onClick={() => s.apply({ type: "deviceUnreachable", reason: "No route to the hub." })}>Connection lost</Step>
          <Step onClick={() => s.apply({ type: "report", value: "on", observedAt: s.observed() })}>Device returns: on</Step>
          <Step onClick={() => s.apply({ type: "report", value: "off", observedAt: s.observed() })}>Device returns: off</Step>
          <Step onClick={s.reset}>Reset</Step>
        </Script>
      </>
    );
  },
};

export const PowerPhysicalSwitch: Story = {
  name: "Power: a report from the physical switch",
  render: function Render() {
    const s = useScript(() => startCommandLifecycle<string>({ confirmed: "off" }));
    return (
      <>
        <Label>Power · nobody pressed the screen</Label>
        <DevicePowerControl lifecycle={s.lifecycle} label="Workshop lamp" size="lg" />
        <Script stage={s.lifecycle.stage} refused={s.refused}>
          <Step onClick={() => s.apply({ type: "report", value: "on", observedAt: s.observed() })}>Wall switch: on</Step>
          <Step onClick={() => s.apply({ type: "report", value: "off", observedAt: s.observed(-1000) })}>Delayed older report: off</Step>
          <Step onClick={s.reset}>Reset</Step>
        </Script>
      </>
    );
  },
};

export const LevelRapidCommands: Story = {
  name: "Level: rapid 20, 40, 80 with a late reply",
  render: function Render() {
    const s = useScript(() => startCommandLifecycle<number>({ confirmed: 20 }));
    const request = (value: number) => s.replace((l) => run(supersedeCommandLifecycle(l, value, { commandId: `c${value}` }), { type: "sent" }, s.at + 100));
    return (
      <>
        <Label>Level · confirmed · each request supersedes the last</Label>
        {/* A dimmer product that lets a newer request replace an open one, so the control stays operable. */}
        <DeviceLevelControl lifecycle={s.lifecycle} control={resolveControlState({ deviceStatus: "online" })} label="Bench light" onCommit={request} />
        <Script stage={s.lifecycle.stage} refused={s.refused}>
          <Step onClick={() => request(40)}>Request 40</Step>
          <Step onClick={() => request(80)}>Request 80</Step>
          <Step onClick={() => s.apply({ type: "confirm", value: 40, commandId: "c40" })}>Late reply for 40</Step>
          <Step onClick={() => s.apply({ type: "report", value: 40, observedAt: s.observed() })}>Device reports 40</Step>
          <Step onClick={() => s.apply({ type: "confirm", value: 80, commandId: "c80" })}>Device confirms 80</Step>
          <Step onClick={s.reset}>Reset</Step>
        </Script>
      </>
    );
  },
};

export const LevelPendingLinkLost: Story = {
  name: "Level: request open, the device's link drops",
  render: function Render() {
    const s = useScript(() => run(startCommandLifecycle<number>({ confirmed: 20, requested: 60, commandId: "c60" }), { type: "sent" }, 0));
    const [status, setStatus] = React.useState<"online" | "offline" | "unreachable">("online");
    return (
      <>
        <Label>Level · confirmed · the request is still open when the device drops off</Label>
        {/* The lifecycle has not timed out yet, so the request is honestly still open. What changes is
            whether anything is progressing: online, the chip pulses; offline or unreachable, it holds still
            and keeps its dashed outline and words, as it always does under reduced motion. */}
        <DeviceLevelControl lifecycle={s.lifecycle} control={resolveControlState({ deviceStatus: status, lifecycle: s.lifecycle })} label="Bench light" />
        <Script stage={s.lifecycle.stage} refused={s.refused}>
          <Step onClick={() => setStatus("offline")}>Device goes offline</Step>
          <Step onClick={() => setStatus("unreachable")}>Hub unreachable</Step>
          <Step onClick={() => setStatus("online")}>Device back online</Step>
        </Script>
      </>
    );
  },
};

export const SetpointHybrid: Story = {
  name: "Setpoint: hybrid, target differs from reported",
  render: function Render() {
    const s = useScript(() => run(startCommandLifecycle<number>({ confirmed: 20, requested: 22, commandId: "t1" }), { type: "sent" }, 0));
    return (
      <>
        <Label>Setpoint · hybrid · ring</Label>
        <DeviceSetpointControl lifecycle={s.lifecycle} strategy="hybrid" current={18.5} min={10} max={30} unit="°C" label="Chamber target" presentation="ring" activity="Heating" />
        <Script stage={s.lifecycle.stage} refused={s.refused}>
          <Step onClick={() => s.apply({ type: "confirm", commandId: "t1" })}>Device confirms</Step>
          <Step onClick={() => s.apply({ type: "fail", commandId: "t1" })}>Device fails</Step>
          <Step onClick={s.reset}>Reset</Step>
        </Script>
      </>
    );
  },
};

const MODES = [
  { id: "a", label: "Program A" },
  { id: "b", label: "Program B" },
  { id: "c", label: "Program C", unavailable: true },
];

export const ModePendingFailure: Story = {
  name: "Mode: pending, then failure back to reported",
  render: function Render() {
    const s = useScript(() => startCommandLifecycle<string>({ confirmed: "a" }));
    return (
      <>
        <Label>Mode · confirmed · Program C is not supported by this device</Label>
        <DeviceModeControl
          modes={MODES}
          lifecycle={s.lifecycle}
          label="Program"
          onSelect={(id) => s.replace((l) => run(supersedeCommandLifecycle(l, id, { commandId: "m1" }), { type: "sent" }, s.at + 100))}
        />
        <Script stage={s.lifecycle.stage} refused={s.refused}>
          <Step onClick={() => s.apply({ type: "fail", commandId: "m1" })}>Device fails</Step>
          <Step onClick={() => s.apply({ type: "confirm", commandId: "m1" })}>Device confirms</Step>
          <Step onClick={s.reset}>Reset</Step>
        </Script>
      </>
    );
  },
};

const stateFor = (connectivity: (typeof KINETIX_CONNECTIVITY_STATES)[number]) =>
  ({
    device: { id: "g1", name: "Gateway", type: "gateway", status: "online" },
    connectivity: { state: connectivity },
    capabilities: [],
    confirmedValues: {},
    requestedValues: {},
    pendingCommands: [],
    faults: [],
    alerts: [],
  }) as unknown as KinetixDeviceState;

export const ConnectivityStates: Story = {
  name: "Connectivity: all six states",
  render: () => (
    <>
      <Label>Connectivity · each state is its own claim</Label>
      <dl className="m-0 grid gap-3">
        {KINETIX_CONNECTIVITY_STATES.map((state) => (
          <div key={state} data-connectivity={state} className="flex flex-col gap-0.5 rounded-xl bg-card p-3 shadow-sm">
            <dt className="text-title-md text-foreground">{describeConnectivity(state)}</dt>
            <dd className="m-0 text-body-md text-muted-foreground">{summarizeDeviceState(stateFor(state)).description}</dd>
          </div>
        ))}
        <div data-connectivity="missing" className="flex flex-col gap-0.5 rounded-xl bg-card p-3 shadow-sm">
          <dt className="text-title-md text-foreground">No connectivity reported</dt>
          <dd className="m-0 text-body-md text-muted-foreground">
            {summarizeDeviceState({ ...stateFor("online"), connectivity: undefined } as unknown as KinetixDeviceState).description}
          </dd>
        </div>
      </dl>
    </>
  ),
};

// ---------------------------------------------------------------------------------------------
// M2B: G12, colour, lock and media.
// ---------------------------------------------------------------------------------------------

export const UnknownStatus: Story = {
  name: "G12: no device status reads as unknown",
  render: () => (
    <>
      <Label>No status was reported for either device</Label>
      <DevicePowerControl state="off" control={resolveControlState()} label="Workshop lamp" size="lg" />
      <DeviceControlCard device={{ id: "p1", name: "Feed pump", type: "pump", status: "online" }} control={resolveControlState()} value={40} unit="%" />
      <DeviceLockControl state={null} control={resolveControlState()} label="Back gate" />
    </>
  ),
};

const WARM: KinetixDeviceColor = { mode: "temperature", kelvin: 2700 };
const COLOURS = [
  { id: "warm", label: "Warm white", value: WARM },
  { id: "ocean", label: "Ocean", value: { mode: "rgb", r: 37, g: 99, b: 235 } as KinetixDeviceColor },
  { id: "daylight", label: "Daylight", value: { mode: "temperature", kelvin: 6500 } as KinetixDeviceColor },
  { id: "amber", label: "Amber", value: { mode: "rgb", r: 245, g: 158, b: 11 } as KinetixDeviceColor },
];

function ColourScript({ strategy, ending }: { strategy: KinetixCommandStrategy; ending: "confirm" | "fail" }) {
  const s = useScript(() => startCommandLifecycle<KinetixDeviceColor>({ confirmed: WARM }));
  return (
    <>
      <Label>{`Colour · ${strategy}`}</Label>
      <DeviceColorControl
        options={COLOURS}
        lifecycle={s.lifecycle}
        strategy={strategy}
        label="Desk lamp colour"
        // A structurally equal copy, never the option object itself: equality must be by value.
        onChange={(next) => s.replace((l) => run(supersedeCommandLifecycle(l, JSON.parse(JSON.stringify(next)) as KinetixDeviceColor, { commandId: "k1" }), { type: "sent" }, s.at + 100))}
      />
      <Script stage={s.lifecycle.stage} refused={s.refused}>
        {ending === "confirm" ? (
          <Step onClick={() => s.apply({ type: "report", value: { mode: "rgb", b: 235, g: 99, r: 37 }, observedAt: s.observed() })}>Device reports Ocean</Step>
        ) : (
          <Step onClick={() => s.apply({ type: "fail", commandId: "k1", reason: "Bulb rejected the colour." })}>Device fails</Step>
        )}
        <Step onClick={s.reset}>Reset</Step>
      </Script>
    </>
  );
}

export const ColourConfirmed: Story = { name: "Colour: confirmed, success", render: () => <ColourScript strategy="confirmed" ending="confirm" /> };
export const ColourOptimisticFailure: Story = { name: "Colour: optimistic, failure and rollback", render: () => <ColourScript strategy="optimistic" ending="fail" /> };
export const ColourHybrid: Story = { name: "Colour: hybrid, target vs reported", render: () => <ColourScript strategy="hybrid" ending="confirm" /> };

function LockScript({ ending }: { ending: "confirm" | "fail" }) {
  const s = useScript(() => startCommandLifecycle<"locked" | "unlocked">({ confirmed: "unlocked" }));
  return (
    <>
      <Label>Lock · confirmed</Label>
      <DeviceLockControl
        lifecycle={s.lifecycle}
        label="Front door"
        onRequest={(next) => s.replace((l) => run(supersedeCommandLifecycle(l, next, { commandId: "l1" }), { type: "sent" }, s.at + 100))}
      />
      <Script stage={s.lifecycle.stage} refused={s.refused}>
        {ending === "confirm" ? (
          <Step onClick={() => s.apply({ type: "confirm", commandId: "l1" })}>Device confirms</Step>
        ) : (
          <Step onClick={() => s.apply({ type: "fail", commandId: "l1", code: "jammed", reason: "The bolt did not travel." })}>Device fails</Step>
        )}
        <Step onClick={s.reset}>Reset</Step>
      </Script>
    </>
  );
}

export const LockConfirmed: Story = { name: "Lock: lock pending, then locked", render: () => <LockScript ending="confirm" /> };
export const LockFailure: Story = { name: "Lock: lock pending, then failure", render: () => <LockScript ending="fail" /> };

export const LockUnreachableStale: Story = {
  name: "Lock: unreachable, a stale reply, a reconnect",
  render: function Render() {
    // An earlier request (l0) was replaced by this one (l1) before l0 was answered.
    const s = useScript(() =>
      run(
        supersedeCommandLifecycle(run(startCommandLifecycle<"locked" | "unlocked">({ confirmed: "unlocked", requested: "locked", commandId: "l0" }), { type: "sent" }, 0), "locked", { commandId: "l1" }),
        { type: "sent" },
        0,
      ),
    );
    return (
      <>
        <Label>Lock · hybrid · the hub drops off</Label>
        <DeviceLockControl lifecycle={s.lifecycle} strategy="hybrid" label="Front door" />
        <Script stage={s.lifecycle.stage} refused={s.refused}>
          <Step onClick={() => s.apply({ type: "confirm", value: "locked", commandId: "l0" })}>Late reply for an earlier request</Step>
          <Step onClick={() => s.apply({ type: "deviceUnreachable", reason: "No route to the hub." })}>Connection lost</Step>
          <Step onClick={() => s.apply({ type: "report", value: "locked", observedAt: s.observed() })}>Device returns: locked</Step>
          <Step onClick={s.reset}>Reset</Step>
        </Script>
      </>
    );
  },
};

const ARTWORK = (
  <span aria-hidden="true" className="grid size-full place-items-center bg-primary/15 text-title-md text-foreground">
    MN
  </span>
);

function MediaScript({ ending }: { ending: "confirm" | "fail" }) {
  const s = useScript(() => startCommandLifecycle<"playing" | "paused">({ confirmed: "paused" }));
  return (
    <>
      <Label>Media · confirmed · play</Label>
      <DeviceMediaControl
        label="Kitchen speaker"
        title="Morning news"
        subtitle="Episode 112"
        artwork={ARTWORK}
        playbackLifecycle={s.lifecycle}
        duration={1_800}
        position={65}
        onPlaybackRequest={(next) => s.replace((l) => run(supersedeCommandLifecycle(l, next, { commandId: "p1" }), { type: "sent" }, s.at + 100))}
        onPrevious={() => {}}
        onNext={() => {}}
        onSeek={() => {}}
      />
      <Script stage={s.lifecycle.stage} refused={s.refused}>
        {ending === "confirm" ? (
          <Step onClick={() => s.apply({ type: "confirm", commandId: "p1" })}>Device confirms</Step>
        ) : (
          <Step onClick={() => s.apply({ type: "fail", commandId: "p1", reason: "Nothing queued." })}>Device fails</Step>
        )}
        <Step onClick={s.reset}>Reset</Step>
      </Script>
    </>
  );
}

export const MediaPlayConfirmed: Story = { name: "Media: paused, play requested, confirmed", render: () => <MediaScript ending="confirm" /> };
export const MediaPlayFailure: Story = { name: "Media: play failure", render: () => <MediaScript ending="fail" /> };

export const MediaSeekVolume: Story = {
  name: "Media: seek and volume requested vs reported",
  render: function Render() {
    const seek = useScript(() => startCommandLifecycle<number>({ confirmed: 65 }));
    const volume = useScript(() => startCommandLifecycle<number>({ confirmed: 40 }));
    return (
      <>
        <Label>Media · confirmed · seek and volume</Label>
        <DeviceMediaControl
          label="Living room display"
          title="Field trial walkthrough"
          playback="playing"
          duration={1_800}
          seekLifecycle={seek.lifecycle}
          volumeLifecycle={volume.lifecycle}
          muted={false}
          control={resolveControlState({ deviceStatus: "online" })}
          onPlaybackRequest={() => {}}
          onSeek={(to) => seek.replace((l) => run(supersedeCommandLifecycle(l, to, { commandId: "s1" }), { type: "sent" }, seek.at + 100))}
          onVolumeChange={(to) => volume.replace((l) => run(supersedeCommandLifecycle(l, to, { commandId: "v1" }), { type: "sent" }, volume.at + 100))}
          onMuteChange={() => {}}
        />
        <Script stage={`${seek.lifecycle.stage} / ${volume.lifecycle.stage}`} refused={seek.refused || volume.refused}>
          <Step onClick={() => seek.replace((l) => run(supersedeCommandLifecycle(l, 120, { commandId: "s1" }), { type: "sent" }, seek.at + 100))}>Seek to 2:00</Step>
          <Step onClick={() => seek.apply({ type: "report", value: 66, observedAt: seek.observed() })}>Device reports 1:06</Step>
          <Step onClick={() => seek.apply({ type: "confirm", value: 120, commandId: "s1" })}>Device confirms the seek</Step>
          <Step onClick={() => volume.replace((l) => run(supersedeCommandLifecycle(l, 60, { commandId: "v1" }), { type: "sent" }, volume.at + 100))}>Volume to 60</Step>
          <Step onClick={() => volume.apply({ type: "confirm", commandId: "v1" })}>Device confirms the volume</Step>
        </Script>
      </>
    );
  },
};

export const MediaUnavailable: Story = {
  name: "Media: unknown and unsupported devices",
  render: () => (
    <>
      <Label>Media · no status reported</Label>
      <DeviceMediaControl label="Garage speaker" title="Unknown" playback={null} control={resolveControlState()} duration={240} position={0} onPlaybackRequest={() => {}} onNext={() => {}} onPrevious={() => {}} />
      <Label>Media · capability not offered</Label>
      <DeviceMediaControl label="Doorbell" support="unsupported" />
    </>
  ),
};
