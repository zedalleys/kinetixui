"use client";

import * as React from "react";
import {
  CommandLifecycle,
  DeviceLevelControl,
  DeviceModeControl,
  DevicePowerControl,
  DeviceSetpointControl,
  DeviceStatusBadge,
} from "@kinetixui/iot/react";
import {
  advanceCommandLifecycle,
  canRetryLifecycle,
  resolveControlState,
  startCommandLifecycle,
  type KinetixCommandLifecycle,
  type KinetixControlState,
} from "@kinetixui/iot/functions";
import { SIMULATION_DISCLOSURE, SIMULATION_LABEL } from "@/lib/iot-sim/labels";
import { cn } from "@/lib/utils";

/**
 * One simulated room, and the four kinds of change a device UI actually has to make.
 *
 * `HeroCommandStrip` above answers *is a request a state?* with a single switch, deliberately slowly, because
 * that is the page's argument. This answers the question underneath it: **what does the whole control layer do
 * when you use it?** Power, level, mode and setpoint, on two devices, sharing one command queue and one
 * lifecycle readout — which is the arrangement a real room panel has, and the one that makes the pending
 * treatment worth drawing, because four controls cannot be allowed to disagree about what is in flight.
 *
 * **Why the other controls go unavailable during a request.** The simulated room accepts one command at a
 * time, so `resolveControlState` is given the open lifecycle for every control, not just the one that was
 * touched. That is honest for a single-radio device and it removes the queue nobody wants to reason about.
 *
 * With one exception, and it is the difference between a demo and a usable panel: **a control can always
 * retarget its own open request.** Nudging the temperature up three times, or correcting a brightness you
 * overshot, is one change being refined, not three commands — so for the control that owns the request the
 * state stays `ready` and the new value simply replaces the old one. Only a request for a *different* setting
 * has to wait. Without this a reader pressing + three times gets one degree and concludes the thing is broken.
 *
 * **Why the delays are short.** The hero holds a request for 800ms/1200ms so a reader can study the gap. Here
 * the point is the opposite — that using the panel feels like using a panel — so the scripted device answers in
 * {@link ACK_MS}/{@link CONFIRM_MS}. Feedback is still immediate: the requested value is drawn the instant the
 * press lands, and only the *confirmation* waits.
 *
 * **Motion.** Nothing in this file animates. Every transition belongs to the components and comes from the
 * semantic duration scale, and each carries its own `motion-reduce:` escape, so under
 * `prefers-reduced-motion: reduce` the state changes still happen and the movement does not. Timings are not
 * changed for reduced motion: slowing down an honest answer would be a worse trade than removing a slide.
 * Nothing loops, and no reading here is animated to look like a live measurement — the temperature the climate
 * unit reports is a fixed number that moves only when a command changes it.
 *
 * **Honesty about what it is.** The SIMULATED badge sits on the panel and the disclosure sentence closes it.
 * The lifecycle machine, the control-state resolver and all five components are the real published ones; the
 * room, its two devices and their delays are a `setTimeout` chain in this file. Nothing is contacted.
 */

/** The scripted device answers this long after a request leaves. Short enough that the panel feels responsive. */
const ACK_MS = 260;
/** And confirms this long after acknowledging. The whole round trip is under a second by design. */
const CONFIRM_MS = 520;

type RoomState = {
  /** Ceiling light. */
  power: "on" | "off";
  /** Ceiling light brightness, 0–100. Only meaningful while the light is on. */
  brightness: number;
  /** Climate unit mode. */
  mode: string;
  /** Climate unit target, °C. */
  target: number;
};

const INITIAL: RoomState = { power: "off", brightness: 35, mode: "heat", target: 20.5 };

/**
 * What the climate unit reports measuring, as a constant.
 *
 * It does not drift, and nothing here makes it drift. A number that wandered on its own would be the one
 * thing on this panel pretending to be a live measurement, which is exactly the claim KinetixUI cannot make:
 * there is no transport, so there is no reading.
 */
const REPORTED_TEMPERATURE = 19;

/** The climate unit's vocabulary. A product owns these words; nothing in the package supplies them. */
const MODES = [
  { id: "heat", label: "Heat" },
  { id: "cool", label: "Cool" },
  { id: "fan", label: "Fan only" },
] as const;

/** Which setting a request is for, and what it asked for. One at a time — the room has one radio. */
type Request =
  | { field: "power"; value: "on" | "off" }
  | { field: "brightness"; value: number }
  | { field: "mode"; value: string }
  | { field: "target"; value: number };

/**
 * What the lifecycle readout prints for one setting's value. The unit belongs to the sentence, not the number.
 *
 * Both halves of the readout — requested and confirmed — are phrased by this one function against the same
 * field, so "Brightness 60%" is never shown as having been confirmed from "Light on". A readout whose two
 * rows describe different settings is worse than no readout.
 */
function describeValue(field: Request["field"], value: string | number): string {
  switch (field) {
    case "power":
      return `Light ${value}`;
    case "brightness":
      return `Brightness ${value}%`;
    case "mode":
      return `Mode ${MODES.find((m) => m.id === value)?.label ?? value}`;
    case "target":
      return `Target ${value}°C`;
  }
}

/**
 * What the climate unit is doing to reach its target, in the product's words — the component supplies none.
 *
 * It has to agree with the mode, which is the whole reason it is a function: a unit set to Cool with a target
 * above the room cannot be "Heating", and a demo that said so would be the one piece of dishonest copy on a
 * page arguing for honest device state.
 */
function describeActivity({ mode, target }: RoomState): string {
  if (mode === "fan") return "Fan only";
  if (mode === "cool") return target < REPORTED_TEMPERATURE ? "Cooling" : "Idle";
  return target > REPORTED_TEMPERATURE ? "Heating" : "Idle";
}

/** The same sentence for what the room currently has, which is what a new request is measured against. */
const describeCurrent = (field: Request["field"], room: RoomState) => describeValue(field, room[field]);

export function LiveControlPanel() {
  const [room, setRoom] = React.useState<RoomState>(INITIAL);
  const [request, setRequest] = React.useState<Request | null>(null);
  const [lifecycle, setLifecycle] = React.useState<KinetixCommandLifecycle<string>>(() =>
    startCommandLifecycle<string>({ confirmed: describeValue("power", INITIAL.power) }),
  );

  // The room's current request, held in a ref so the scripted device can apply it on confirm without the
  // effect re-running every time `request` changes identity.
  const requestRef = React.useRef<Request | null>(null);
  requestRef.current = request;

  // The scripted device: acknowledge, then confirm and apply. Keyed on the stage, like the hero's.
  React.useEffect(() => {
    if (lifecycle.stage === "requested") {
      const id = window.setTimeout(() => setLifecycle((l) => advanceCommandLifecycle(l, { type: "acknowledge" })), ACK_MS);
      return () => window.clearTimeout(id);
    }
    if (lifecycle.stage === "acknowledged") {
      const id = window.setTimeout(() => {
        const open = requestRef.current;
        if (open) setRoom((r) => ({ ...r, [open.field]: open.value }));
        setRequest(null);
        setLifecycle((l) => advanceCommandLifecycle(l, { type: "confirm" }));
      }, CONFIRM_MS);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [lifecycle.stage, lifecycle.attempts]);

  const busy = request !== null;
  // True from the first command onwards; only ever turns the readout's height reserve on.
  const [engaged, setEngaged] = React.useState(false);

  const send = (next: Request) => {
    // Refuse a second setting while one is open; allow the open one to be refined. See the note above.
    if (busy && request.field !== next.field) return;
    setEngaged(true);
    setRequest(next);
    setLifecycle(
      advanceCommandLifecycle(
        startCommandLifecycle<string>({
          confirmed: describeCurrent(next.field, room),
          requested: describeValue(next.field, next.value),
        }),
        { type: "sent" },
      ),
    );
  };

  // One resolved state for every control, from the one open lifecycle. While nothing is in flight this is
  // `ready`; while something is, every control is `pending` and none of them is interactive.
  const shared = resolveControlState({ deviceStatus: "online", lifecycle: busy ? lifecycle : undefined });
  const ready = resolveControlState({ deviceStatus: "online" });

  /** The resolved state for one setting: ready if nothing is open or this setting owns what is. */
  const stateFor = (field: Request["field"]) => (!busy || request.field === field ? ready : shared);

  // Brightness is the one control with a second reason to be unavailable: a light that is off has no
  // brightness to change. The sentence says which reason applies, because "unavailable" on its own sends a
  // reader looking for a fault that is not there.
  const lightOff = room.power === "off" && !busy;
  const brightnessState: KinetixControlState = lightOff
    ? { ...resolveControlState({ deviceStatus: "online", disabled: true }), description: "The ceiling light is off. Turn it on to set a brightness." }
    : stateFor("brightness");

  const requestedFor = <T,>(field: Request["field"]): T | undefined =>
    request?.field === field ? (request.value as T) : undefined;

  return (
    <div
      data-live-control-panel=""
      className="flex min-w-0 flex-col gap-5 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6"
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-border px-2.5 py-0.5 text-label-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {SIMULATION_LABEL}
        </span>
        <span className="min-w-0 text-label-sm text-muted-foreground">Studio 2 · two demo devices, one command queue</span>
      </div>

      {/* `items-start` so the shorter card hugs its content: stretched, the light card carried ~190px
          of empty space to match the climate unit's ring. */}
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
        {/* ── Ceiling light: power, then the level it gates ─────────────────────────── */}
        <section
          aria-label="Ceiling light"
          className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-background/60 p-4"
        >
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="font-display text-base font-semibold">Ceiling light</span>
            <DeviceStatusBadge status="online" />
          </div>

          <DevicePowerControl
            label="Ceiling light power"
            state={room.power}
            requested={requestedFor<"on" | "off">("power")}
            control={shared}
            onToggle={(next) => send({ field: "power", value: next === "on" ? "on" : "off" })}
          />

          <DeviceLevelControl
            label="Brightness"
            value={room.brightness}
            target={requestedFor<number>("brightness")}
            min={0}
            max={100}
            step={5}
            unit="%"
            control={brightnessState}
            onCommit={(next) => send({ field: "brightness", value: next })}
          />
        </section>

        {/* ── Climate unit: mode, and the target it runs to ──────────────────────────── */}
        <section
          aria-label="Climate unit"
          className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-background/60 p-4"
        >
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="font-display text-base font-semibold">Climate unit</span>
            <DeviceStatusBadge status="online" />
          </div>

          <DeviceModeControl
            label="Climate mode"
            modes={MODES}
            value={room.mode}
            requested={requestedFor<string>("mode")}
            control={shared}
            onSelect={(id) => send({ field: "mode", value: id })}
          />

          <DeviceSetpointControl
            label="Studio 2 temperature"
            current={REPORTED_TEMPERATURE}
            target={room.target}
            requestedTarget={requestedFor<number>("target")}
            min={15}
            max={28}
            step={0.5}
            unit="°C"
            presentation="ring"
            activity={describeActivity(room)}
            control={stateFor("target")}
            onCommit={(next) => send({ field: "target", value: next })}
          />
        </section>
      </div>

      {/* The one lifecycle readout, for whichever control was last used. Its height is reserved from the
          first command onwards for the same reason the hero reserves its own: a strip that appears under a
          grid pushes the grid down at the exact moment the reader is looking at it. */}
      <div
        className={cn(
          "flex min-w-0 flex-col gap-2 border-t border-border pt-4",
          // The stepper, the attempt line and the summary sentence all arrive with the first command, and
          // the panel grew by ~120px underneath the reader's hand at the moment they pressed something.
          // Reserved from that first press onwards, for the same reason the hero reserves its own region —
          // and not before, so an untouched panel does not open with a hole in it.
          engaged && "min-h-52 sm:min-h-44",
        )}
      >
        <p className="m-0 text-label-sm uppercase tracking-wide text-muted-foreground">Last command</p>
        <CommandLifecycle
          lifecycle={lifecycle}
          onRetry={canRetryLifecycle(lifecycle) ? () => setLifecycle((l) => advanceCommandLifecycle(l, { type: "retry" })) : undefined}
        />
      </div>

      <p className="m-0 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">{SIMULATION_DISCLOSURE}</p>
    </div>
  );
}
