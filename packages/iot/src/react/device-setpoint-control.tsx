"use client";

import * as React from "react";
import type { KinetixControlState } from "../types/control";
import { snapToStep } from "../functions/control";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * DeviceSetpointControl — a target the device is working towards.
 *
 * Generalised rather than climate-specific, because the shape is identical for a thermostat holding
 * 21°C, a chiller holding 4°C, a humidifier holding 55%RH and a pressure regulator holding 2.4 bar.
 * Naming it `Thermostat` would have bought nothing but a word that stops being true on the second
 * product.
 *
 * **Two numbers, and the difference between them is the point.** The target is the large figure
 * because it is the thing the user sets; the current measurement sits beneath it, quieter, because
 * it is the thing the device reports. Products that show only one leave the user unable to tell
 * "it's cold" from "it's heading there" — which is the single most common complaint about
 * thermostat UIs.
 *
 * Stepping is by button, not a slider: setpoints are adjusted in small deliberate increments and a
 * drag across a 10-degree range is a fat-finger hazard on a device that costs money to run. The
 * buttons are real buttons with real labels, so keyboard and screen reader work without anything
 * extra, and holding one does not auto-repeat — a deliberate omission, since an unnoticed repeat on
 * a setpoint is expensive.
 */
export interface DeviceSetpointControlProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** What the device is measuring now. `null` renders as unknown rather than as the target. */
  current?: number | null;
  /** The confirmed target. */
  target: number | null | undefined;
  /** A requested target that the device has not confirmed. */
  requestedTarget?: number | null;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  /** Accessible name, e.g. "Living room temperature". */
  label: string;
  control?: KinetixControlState;
  onCommit?: (next: number) => void;
  /** What the device is doing to reach the target — "Heating", "Cooling", "Idle". Product's words. */
  activity?: string;
}

const DeviceSetpointControl = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, DeviceSetpointControlProps>(
  (
    { current, target, requestedTarget, min, max, step = 0.5, unit = "°", label, control, onCommit, activity, className, ...props },
    ref,
  ) => {
    const confirmed = typeof target === "number" && Number.isFinite(target) ? target : null;
    const requested = requestedTarget === undefined || requestedTarget === null ? null : requestedTarget;
    const pending = requested !== null && requested !== confirmed;
    const shown = pending ? requested! : confirmed;

    const interactive = control ? control.interactive : true;
    const descriptionId = React.useId();

    const nudge = (delta: number) => {
      if (shown === null) return;
      const next = snapToStep(shown + delta, min, max, step);
      if (next !== shown) onCommit?.(next);
    };

    const atMin = shown !== null && shown <= min;
    const atMax = shown !== null && shown >= max;

    return (
      <div ref={ref} className={cn("flex flex-col gap-3", className)} data-pending={pending ? "" : undefined} {...props}>
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label={`Decrease ${label}`}
            disabled={!interactive || atMin || shown === null}
            onClick={() => nudge(-step)}
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground",
              "transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none",
              "disabled:cursor-not-allowed disabled:opacity-45",
            )}
          >
            {/* Minus and plus are direction-neutral, so nothing here needs to flip under RTL. */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M5 12h14" />
            </svg>
          </button>

          <div className="flex min-w-0 flex-1 flex-col items-center">
            <span
              // Deliberately NOT a live region. The sr-only sentence below announces the same change
              // with its context ("target 21, currently 19"); making this one live as well had a
              // screen reader read the bare number first and the sentence straight after.
              className={cn("text-display-sm tabular-nums leading-none", pending ? "text-primary" : "text-foreground")}
            >
              {shown === null ? "—" : shown}
              <span className="text-title-sm align-top">{unit}</span>
            </span>
            <span className="mt-1 truncate text-label-sm text-muted-foreground">
              {current === null || current === undefined
                ? "Current unknown"
                : `Now ${current}${unit}`}
              {activity ? ` · ${activity}` : ""}
            </span>
          </div>

          <button
            type="button"
            aria-label={`Increase ${label}`}
            disabled={!interactive || atMax || shown === null}
            onClick={() => nudge(step)}
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground",
              "transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none",
              "disabled:cursor-not-allowed disabled:opacity-45",
            )}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </button>
        </div>

        {/*
          The live region carries the whole story in one sentence, because a screen-reader user
          stepping the target hears this and nothing else. "Target 21, currently 19" is usable;
          "21" is not.
        */}
        <span className="sr-only" aria-live="polite">
          {label}: target {shown === null ? "unknown" : `${shown}${unit}`}
          {pending ? ", requested, not yet confirmed" : ""}
          {current === null || current === undefined ? "" : `, currently ${current}${unit}`}
        </span>

        {control?.description && control.availability !== "ready" ? (
          <span id={descriptionId} className="text-center text-label-sm text-muted-foreground">
            {control.description}
          </span>
        ) : null}
      </div>
    );
  },
), "DeviceSetpointControl");

export { DeviceSetpointControl };
