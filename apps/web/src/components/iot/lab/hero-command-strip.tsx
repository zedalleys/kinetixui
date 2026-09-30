"use client";

import * as React from "react";
import { CommandLifecycle, DevicePowerControl, DeviceStatusBadge } from "@kinetixui/iot/react";
import {
  advanceCommandLifecycle,
  canRetryLifecycle,
  lifecycleToControlPhase,
  resolveControlState,
  startCommandLifecycle,
  type KinetixCommandLifecycle,
} from "@kinetixui/iot/functions";
import { SIMULATION_DISCLOSURE } from "@/lib/iot-sim/labels";
import { cn } from "@/lib/utils";

/**
 * The hero's one live thing: a single simulated device and a command that has to earn its confirmation.
 *
 * **Deliberately cheap.** It imports two components and the lifecycle machine, not the simulation layer, so
 * the hero does not pull the scenario data or the tick loop into the initial bundle. The "device" is a
 * `setTimeout` chain in this file: requested, then acknowledged, then confirmed — and, if the reader ticks the
 * box, never acknowledged, so the request times out and offers a Retry. That second path is the one that
 * matters, because a UI that has only ever been shown succeeding has not been shown to be honest.
 *
 * **Honesty about what it is.** The word SIMULATION sits on the card and the disclosure sentence sits under it.
 * Nothing here contacts anything. The lifecycle machine is the real one from `@kinetixui/iot/functions`; the
 * device, its delays and its failure are scripted.
 *
 * **Reduced motion.** The components use Tailwind's `motion-reduce:` variant for their own transitions and
 * nothing here animates. Timing is unchanged for a reader who prefers reduced motion — a request still
 * settles, because slowing the honest answer down would be a worse trade than a moving track.
 */

type Power = "on" | "off";
const ACK_MS = 800;
const CONFIRM_MS = 1200;
const TIMEOUT_MS = 2600;

const formatPower = (value: unknown) => (value === "on" ? "on" : value === "off" ? "off" : "unknown");

export function HeroCommandStrip() {
  const [lifecycle, setLifecycle] = React.useState<KinetixCommandLifecycle<Power>>(() =>
    startCommandLifecycle<Power>({ confirmed: "off" }),
  );
  const [silent, setSilent] = React.useState(false);
  const silentRef = React.useRef(silent);
  silentRef.current = silent;
  // The switch's accessible description is the visible status line below it, not a hidden copy of it.
  const controlStateId = React.useId();
  // True from the first request onwards. It only ever turns the status region's reserved height on: see
  // the note on the region below for why the reserve is not there before anything has been asked for.
  const [engaged, setEngaged] = React.useState(false);

  // The scripted device. It answers the current request, or does not, and the machine records what happened.
  React.useEffect(() => {
    if (lifecycle.stage === "requested" || lifecycle.stage === "retrying") {
      const id = window.setTimeout(
        () =>
          setLifecycle((l) =>
            silentRef.current ? advanceCommandLifecycle(l, { type: "timeout", reason: "The simulated device did not answer." }) : advanceCommandLifecycle(l, { type: "acknowledge" }),
          ),
        silentRef.current ? TIMEOUT_MS : ACK_MS,
      );
      return () => window.clearTimeout(id);
    }
    if (lifecycle.stage === "acknowledged") {
      const id = window.setTimeout(() => setLifecycle((l) => advanceCommandLifecycle(l, { type: "confirm" })), CONFIRM_MS);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [lifecycle.stage, lifecycle.attempts]);

  const confirmed = lifecycle.confirmedValue ?? "off";
  const control = resolveControlState({ deviceStatus: "online", lifecycle });
  const requested = lifecycleToControlPhase(lifecycle) === "requested" || lifecycle.stage === "timed-out" ? lifecycle.requestedValue : undefined;

  const request = (next: Power) => {
    setEngaged(true);
    // A new lifecycle from what the device last confirmed. `sent` is the moment the request leaves.
    setLifecycle(advanceCommandLifecycle(startCommandLifecycle<Power>({ confirmed, requested: next }), { type: "sent" }));
  };

  return (
    <div data-hero-command-strip="" className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-border px-2.5 py-0.5 text-label-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Simulation
        </span>
        <span className="min-w-0 text-label-sm text-muted-foreground">Water pump · demo device</span>
      </div>

      {/* Identity and switch share a row only once there is room for both. Below `sm` the row stacks:
          a 44px switch, its state word and a device name competing for ~320px is how the card ended up
          wider than the phone, and `justify-between` hid it by pushing the overflow off the end. */}
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6 sm:gap-y-3">
        <div className="flex min-w-0 flex-col items-start gap-1.5">
          <span className="font-display text-lg font-semibold">Pump 01</span>
          <DeviceStatusBadge status="online" />
        </div>
        <div className="flex min-w-0">
          <DevicePowerControl
            label="Pump 01 power"
            state={confirmed}
            requested={requested}
            // The resolved state drives `disabled` and the switch's styling as usual, but its sentence is
            // rendered here instead: the component prints it on one truncated line beside the switch, and
            // "Change requested, not yet confirmed by the dev…" is the one sentence on this card that must
            // never be cut. Blanking `description` suppresses that line; `aria-describedby` below points
            // the switch at the wrapping copy, so the accessible description is the visible one.
            control={{ ...control, description: "" }}
            aria-describedby={controlStateId}
            onToggle={(next) => request(next === "on" ? "on" : "off")}
          />
        </div>
      </div>

      {/* One status region for everything the request has to say, with room reserved for its tallest
          state. The stepper appears at "requested", the attempt line comes and goes with it and the Retry
          button only exists after a failure; letting the card grow and shrink around them moved the hero
          by up to 136px within a single command. The reserve holds the box at the height of its worst
          case, so CONFIRMED → REQUESTED → ACKNOWLEDGED → CONFIRMED (or FAILED) does not move anything.

          Nothing empty is added to reserve it: the region always holds the control's own sentence and the
          lifecycle's values, so there is no filler element for a screen reader to find — the reserve is a
          minimum height on a box that has real content in it.

          The reserve arrives with the first request rather than on load. Sized for the tallest state it
          is ~200px taller than the untouched card needs, and a hero that opens with a hole in it to hold
          space for something nobody has asked for yet is a worse trade than one resize at the moment the
          reader presses the switch. From that press onwards the box does not move again. */}
      <div
        data-command-status-region=""
        className={cn("flex min-w-0 flex-col justify-start gap-3", engaged && "min-h-72 sm:min-h-60")}
      >
        <p id={controlStateId} className="m-0 text-label-md text-muted-foreground">
          {control.description}
        </p>
        <CommandLifecycle
          lifecycle={lifecycle}
          formatValue={formatPower}
          onRetry={canRetryLifecycle(lifecycle) ? () => setLifecycle((l) => advanceCommandLifecycle(l, { type: "retry" })) : undefined}
        />
      </div>

      <label className="flex items-start gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={silent}
          onChange={(e) => setSilent(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-primary"
        />
        <span className="min-w-0">
          Make the device stop answering
          {/* Always said, never inserted mid-request: it is true of every request, and a line that
              appears only while one is in flight is a line that moves the card while it is in flight. */}
          <span className="block text-label-md">Takes effect from the next step of a request already in flight.</span>
        </span>
      </label>

      <p className="border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">{SIMULATION_DISCLOSURE}</p>
    </div>
  );
}
