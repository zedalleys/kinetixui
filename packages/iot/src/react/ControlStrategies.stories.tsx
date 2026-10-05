import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DeviceLevelControl } from "./device-level-control";
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
  type KinetixDeviceState,
} from "../functions";

/**
 * M2A: the four controls driven by a command lifecycle and a strategy, as deterministic scripts.
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
