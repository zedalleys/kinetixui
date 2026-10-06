import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CommandFeedback } from "./command-feedback";
import { DeviceActivity } from "./device-activity";
import { DeviceBattery } from "./device-battery";
import { DeviceConnection } from "./device-connection";
import { EnergySummary } from "./energy-summary";
import { TelemetryMetric } from "./telemetry-metric";
import {
  KINETIX_CONNECTIVITY_STATES,
  startCommandLifecycle,
  transitionCommandLifecycle,
  type KinetixActivityEvent,
  type KinetixCommandLifecycle,
  type KinetixCommandLifecycleEvent,
} from "../functions";

/**
 * M3: monitoring and feedback, every state on one page per component.
 *
 * Each scenario is a `[data-scenario]` block with a fixed clock (`NOW`), so what it shows never depends
 * on when the story is opened. `scripts/iot-monitoring.mjs` reads every block in seven browser
 * conditions; the command-feedback script is driven by real buttons, so it is keyboard-operable too.
 *
 * Domains are mixed on purpose — a soil probe, an infusion pump, a press line, a wearable — because
 * none of these components may assume one.
 */
const meta = {
  title: "IoT/Monitoring",
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="mx-auto flex w-full max-w-[34rem] flex-col gap-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const NOW = "2026-10-06T12:00:00.000Z";
const MIN = 60_000;
const ago = (ms: number) => new Date(Date.parse(NOW) - ms).toISOString();

function Scenario({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div data-scenario={id} className="flex min-w-0 flex-col gap-2 rounded-xl bg-muted/40 p-3">
      <p className="m-0 text-label-sm uppercase tracking-[0.12em] text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

export const Battery: Story = {
  render: () => (
    <>
      <Scenario id="battery-normal" title="Normal">
        <DeviceBattery value={72} updatedAt={ago(2 * MIN)} staleAfterMs={60 * MIN} now={NOW} />
      </Scenario>
      <Scenario id="battery-low" title="Low">
        <DeviceBattery value={21} now={NOW} />
      </Scenario>
      <Scenario id="battery-critical" title="Critical">
        <DeviceBattery value={6} charging={false} now={NOW} />
      </Scenario>
      <Scenario id="battery-charging" title="Charging (wearable)">
        <DeviceBattery value={42} charging now={NOW} />
      </Scenario>
      <Scenario id="battery-unknown" title="Unknown level">
        <DeviceBattery value={null} charging={null} now={NOW} />
      </Scenario>
      <Scenario id="battery-stale" title="Stale reading (soil probe)">
        <DeviceBattery value={18} updatedAt={ago(9 * 60 * MIN)} staleAfterMs={6 * 60 * MIN} showAge now={NOW} />
      </Scenario>
      <Scenario id="battery-unsupported" title="Mains powered: unsupported">
        <DeviceBattery value={null} support="unsupported" now={NOW} />
      </Scenario>
    </>
  ),
};

export const Connection: Story = {
  render: () => (
    <>
      {KINETIX_CONNECTIVITY_STATES.map((state) => (
        <Scenario key={state} id={`connection-${state}`} title={state}>
          <DeviceConnection
            // "unknown" passes no state at all: the product has not heard from the link yet.
            state={state === "unknown" ? undefined : state}
            lastSeenAt={state === "unknown" ? undefined : ago(state === "stale" ? 3 * 60 * MIN : 7 * MIN)}
            transportLabel={state === "online" ? "Wi-Fi via Barn gateway" : undefined}
            signal={state === "online" ? 78 : undefined}
            now={NOW}
          />
        </Scenario>
      ))}
    </>
  ),
};

export const Telemetry: Story = {
  render: () => (
    <>
      <Scenario id="telemetry-live" title="Live numeric">
        <TelemetryMetric label="Line pressure" value={2.4} unit="bar" timestamp={ago(MIN)} staleAfterMs={10 * MIN} now={NOW} />
      </Scenario>
      <Scenario id="telemetry-formatted" title="Formatted value">
        <TelemetryMetric label="Spindle speed" value={12480} unit="RPM" formatValue={(v) => v.toLocaleString("en-US")} timestamp={ago(MIN)} now={NOW} />
      </Scenario>
      <Scenario id="telemetry-delta" title="Delta from a real previous reading">
        <TelemetryMetric label="Heart rate" value={72} unit="bpm" unitLabel="beats per minute" previous={68} timestamp={ago(MIN)} now={NOW} />
      </Scenario>
      <Scenario id="telemetry-stale" title="Stale">
        <TelemetryMetric label="Soil moisture" value={31} unit="%" timestamp={ago(3 * 60 * MIN)} staleAfterMs={30 * MIN} previous={34} now={NOW} />
      </Scenario>
      <Scenario id="telemetry-unknown" title="Unknown">
        <TelemetryMetric label="Weight" value={null} unit="kg" now={NOW} />
      </Scenario>
      <Scenario id="telemetry-unavailable" title="Unavailable">
        <TelemetryMetric label="Air quality" value={41} unit="AQI" quality="error" now={NOW} />
      </Scenario>
      <Scenario id="telemetry-range" title="Reference range">
        <TelemetryMetric
          label="Glucose"
          value={5.8}
          unit="mmol/L"
          unitLabel="millimoles per litre"
          formatValue={(v) => v.toFixed(1)}
          range={{ min: 4, max: 7 }}
          timestamp={ago(2 * MIN)}
          now={NOW}
          quietWhenNormal
        />
      </Scenario>
    </>
  ),
};

const lifecycleAt = (...events: KinetixCommandLifecycleEvent[]) => {
  let s: KinetixCommandLifecycle<number> = startCommandLifecycle({ confirmed: 20, requested: 40 });
  let at = Date.parse(NOW) - 5 * MIN;
  for (const event of events) s = transitionCommandLifecycle(s, event, (at += 1000)).state;
  return s;
};
const pct = (v: unknown) => `${v}%`;

const FEEDBACK: [string, string, KinetixCommandLifecycle<number>][] = [
  ["feedback-requested", "Requested", lifecycleAt({ type: "sent" })],
  ["feedback-acknowledged", "Acknowledged", lifecycleAt({ type: "sent" }, { type: "acknowledge" })],
  ["feedback-retrying", "Retrying", lifecycleAt({ type: "sent" }, { type: "timeout" }, { type: "retry" })],
  ["feedback-confirmed", "Confirmed", lifecycleAt({ type: "sent" }, { type: "acknowledge" }, { type: "confirm", value: 40 })],
  ["feedback-failed", "Failed", lifecycleAt({ type: "sent" }, { type: "fail", reason: "Occlusion detected.", code: "occlusion" })],
  ["feedback-timed-out", "Timed out", lifecycleAt({ type: "sent" }, { type: "timeout" })],
  ["feedback-unreachable", "Unreachable", lifecycleAt({ type: "sent" }, { type: "deviceUnreachable" })],
  ["feedback-cancelled", "Cancelled", lifecycleAt({ type: "sent" }, { type: "cancel" })],
];

export const Feedback: Story = {
  render: function Render() {
    const [retries, setRetries] = React.useState(0);
    return (
      <>
        {FEEDBACK.map(([id, title, lifecycle]) => (
          <Scenario key={id} id={id} title={title}>
            <CommandFeedback lifecycle={lifecycle} label="Infusion rate" formatValue={pct} density="full" onRetry={() => setRetries((n) => n + 1)} />
          </Scenario>
        ))}
        <p className="m-0 text-label-md text-muted-foreground" data-retries={retries}>
          Retries requested: {retries}
        </p>
      </>
    );
  },
};

/** One lifecycle, the device's side played by buttons, feedback announcing. */
export const FeedbackScript: Story = {
  render: function Render() {
    const [state, setState] = React.useState(() => ({ lifecycle: startCommandLifecycle<boolean>({ confirmed: false }) as KinetixCommandLifecycle<boolean>, at: 0 }));
    const apply = (event: KinetixCommandLifecycleEvent) =>
      setState((s) => {
        const at = s.at + 1000;
        const result = transitionCommandLifecycle(s.lifecycle, event, Date.parse(NOW) + at);
        return { lifecycle: result.state, at };
      });
    const request = () =>
      setState((s) => ({ lifecycle: { ...startCommandLifecycle<boolean>({ confirmed: s.lifecycle.confirmedValue ?? false, requested: true }) }, at: s.at }));
    return (
      <Scenario id="feedback-script" title="Scripted, announcing">
        <CommandFeedback lifecycle={state.lifecycle} label="Zone 3 valve" formatValue={(v) => (v ? "open" : "closed")} announce onRetry={() => apply({ type: "retry" })} />
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["Request open", request],
              ["Send", () => apply({ type: "sent" })],
              ["Acknowledge", () => apply({ type: "acknowledge" })],
              ["Confirm", () => apply({ type: "confirm", value: true })],
              ["Time out", () => apply({ type: "timeout" })],
            ] as const
          ).map(([name, onClick]) => (
            <button
              key={name}
              type="button"
              onClick={onClick}
              className="inline-flex min-h-11 items-center rounded-lg bg-background px-3 text-label-lg text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {name}
            </button>
          ))}
        </div>
        <p className="m-0 text-label-md text-muted-foreground" data-script-stage={state.lifecycle.stage}>
          Stage: {state.lifecycle.stage}
        </p>
      </Scenario>
    );
  },
};

const EVENTS: KinetixActivityEvent[] = [
  { id: "e1", timestamp: ago(42 * MIN), kind: "state-change", origin: "device", message: "Valve closed at the manual handle", detail: "Reported by the valve, not requested." },
  { id: "e2", timestamp: ago(30 * MIN), kind: "command", origin: "user", actor: "Amira", status: "confirmed", commandId: "cmd-17", message: "Open zone 3" },
  { id: "e3", timestamp: ago(20 * MIN), kind: "automation", origin: "automation", source: "Dawn cycle", status: "confirmed", message: "Irrigation cycle started" },
  { id: "e4", timestamp: ago(12 * MIN), kind: "system", message: "Gateway restarted" },
  { id: "e5", timestamp: ago(4 * MIN), kind: "command", origin: "user", actor: "Amira", status: "failed", commandId: "cmd-18", message: "Open zone 4", detail: "Line pressure too low." },
];

export const Activity: Story = {
  render: function Render() {
    const [viewed, setViewed] = React.useState("");
    return (
      <Scenario id="activity" title="One device, newest first">
        <DeviceActivity
          events={EVENTS}
          order="newest"
          label="Zone valve activity"
          now={NOW}
          renderActions={(event) =>
            event.commandId ? (
              <button
                type="button"
                onClick={() => setViewed(event.commandId!)}
                className="inline-flex min-h-11 items-center rounded-lg bg-muted px-3 text-label-lg text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-9"
              >
                View command {event.commandId}
              </button>
            ) : null
          }
        />
        <p className="m-0 text-label-md text-muted-foreground" data-viewed={viewed}>
          {viewed ? `Viewing ${viewed}` : "Nothing selected"}
        </p>
      </Scenario>
    );
  },
};

export const ActivityOldestFirst: Story = {
  render: () => (
    <Scenario id="activity-oldest" title="Oldest first">
      <DeviceActivity events={EVENTS} order="oldest" now={NOW} />
    </Scenario>
  ),
};

export const Energy: Story = {
  render: () => (
    <>
      <Scenario id="energy-simple" title="Simple (irrigation pump)">
        <EnergySummary period="This week" energy={{ label: "Pump energy", value: 85, unit: "kWh", timestamp: ago(5 * MIN) }} power={{ value: 3.2, unit: "kW", timestamp: ago(MIN) }} now={NOW} />
      </Scenario>
      <Scenario id="energy-stale" title="Stale">
        <EnergySummary period="Today" power={{ label: "Kettle", value: 2.1, unit: "kW", timestamp: ago(90 * MIN), staleAfterMs: 15 * MIN }} now={NOW} />
      </Scenario>
      <Scenario id="energy-partial" title="Partial data">
        <EnergySummary
          period="Since midnight"
          energy={{ value: 14.2, unit: "kWh", timestamp: ago(2 * MIN) }}
          power={{ value: null, unit: "kW" }}
          cost={{ value: null, support: "unsupported" }}
          now={NOW}
        />
      </Scenario>
      <Scenario id="energy-unknown" title="Unknown metric">
        <EnergySummary period="Charging session" energy={{ label: "Energy delivered", value: undefined, unit: "Wh" }} now={NOW} />
      </Scenario>
      <Scenario id="energy-custom" title="Custom unit and cost formatter (press line)">
        <EnergySummary
          period="Shift B"
          energy={{ label: "Press line", value: 412.5, unit: "MJ", previous: 380, previousLabel: "Shift A", formatValue: (v) => v.toFixed(1), timestamp: ago(MIN) }}
          cost={{ label: "Cost", value: 31.2, formatValue: (v) => `€${v.toFixed(2)}`, timestamp: ago(MIN) }}
          metrics={[
            { key: "peak", label: "Peak demand", value: 184, unit: "kW", timestamp: ago(MIN) },
            { key: "pf", label: "Power factor", value: 0.92, timestamp: ago(MIN) },
          ]}
          now={NOW}
        />
      </Scenario>
    </>
  ),
};
