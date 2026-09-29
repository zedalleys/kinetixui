"use client";

import * as React from "react";
import { CommandLifecycle, DevicePowerControl, DeviceStatusBadge } from "@kinetixui/iot/react";
import {
  advanceCommandLifecycle,
  canRetryLifecycle,
  isLifecyclePending,
  lifecycleToControlPhase,
  resolveControlState,
  startCommandLifecycle,
  type KinetixCommandLifecycle,
} from "@kinetixui/iot/functions";
import { SIMULATION_DISCLOSURE } from "@/lib/iot-sim/labels";

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

  const pending = isLifecyclePending(lifecycle);

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
    // A new lifecycle from what the device last confirmed. `sent` is the moment the request leaves.
    setLifecycle(advanceCommandLifecycle(startCommandLifecycle<Power>({ confirmed, requested: next }), { type: "sent" }));
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Simulation
        </span>
        <span className="text-label-sm text-muted-foreground">Water pump · demo device</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="font-display text-lg font-semibold">Pump 01</span>
          <DeviceStatusBadge status="online" />
        </div>
        <DevicePowerControl
          label="Pump 01 power"
          state={confirmed}
          requested={requested}
          control={control}
          onToggle={(next) => request(next === "on" ? "on" : "off")}
        />
      </div>

      <CommandLifecycle
        lifecycle={lifecycle}
        formatValue={formatPower}
        onRetry={canRetryLifecycle(lifecycle) ? () => setLifecycle((l) => advanceCommandLifecycle(l, { type: "retry" })) : undefined}
      />

      <label className="flex items-start gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={silent}
          onChange={(e) => setSilent(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-[hsl(var(--primary))]"
        />
        <span>
          Make the device stop answering
          {pending ? <span className="block text-xs">Applies to the next step of the request in flight.</span> : null}
        </span>
      </label>

      <p className="border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">{SIMULATION_DISCLOSURE}</p>
    </div>
  );
}
