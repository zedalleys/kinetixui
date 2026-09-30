"use client";

import * as React from "react";
import type { KinetixAutomation } from "../types/automation";
import { canRunAutomation, describeAutomationStatus, describeRelativeTime, formatRelativeTime } from "../functions/automation";
import { Glyph } from "./glyph";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * RoutineCard — a scene, routine or schedule, and whether it is doing anything.
 *
 * One component for all three because they are one shape: a name, what sets it off, what it does,
 * and a run state. The `kind` changes the emphasis — a scene leads with its action because you fire
 * it, a routine leads with its trigger because it fires itself — rather than changing the layout.
 *
 * **Running is a state, not a spinner.** A routine mid-run gets a pulsing bar along its top edge, so
 * a list of eight shows which one is going without eight spinners competing. It uses core Tailwind's
 * `animate-pulse`, as `CommandStatus` does: this package ships no CSS, so a custom `@keyframes` would
 * silently do nothing in a consumer's app. Under `prefers-reduced-motion` the pulse stops and the
 * bar stays solid, with the word "Running" carrying the fact either way.
 *
 * **Times are relative in both directions.** `lastRunAt` is past and `nextRunAt` is future, so this
 * uses `formatRelativeTime` rather than `formatLastSeen` — the latter floors elapsed time at zero by
 * design, which would render tomorrow's run as "just now".
 *
 * **Next run is shown only when the product knows it.** An automation triggered by soil moisture has
 * no next run, and inventing "Tomorrow" for it would be a lie the UI tells every day.
 */
export interface RoutineCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  automation: KinetixAutomation;
  /** Reference instant for relative times. Pass a fixed value for deterministic rendering. */
  now?: string | Date | number;
  /** Fire it now. Absent for automations a user cannot trigger by hand. */
  onRun?: () => void;
  /** Arm/disarm. Absent where the product does not allow it. */
  onToggleEnabled?: (next: boolean) => void;
  onSelect?: () => void;
}

const KIND_LABEL: Record<KinetixAutomation["kind"], string> = {
  scene: "Scene",
  routine: "Routine",
  schedule: "Schedule",
};

const RoutineCard = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, RoutineCardProps>(
  ({ automation, now, onRun, onToggleEnabled, onSelect, className, ...props }, ref) => {
    const running = automation.status === "running";
    const failed = automation.status === "failed";
    const off = !automation.enabled || automation.status === "disabled";
    const runnable = canRunAutomation(automation);

    const lastRun = automation.lastRunAt ? formatRelativeTime(automation.lastRunAt, { now }) : undefined;
    const nextRun = automation.nextRunAt ? formatRelativeTime(automation.nextRunAt, { now }) : undefined;

    // A scene is fired, so its actions are the headline; a routine fires itself, so its trigger is.
    const primary = automation.kind === "scene" ? automation.actions : automation.trigger;
    const secondary = automation.kind === "scene" ? automation.trigger : automation.actions;

    // One spoken sentence for the whole card's state, so a screen reader does not have to stitch
    // together three separate fragments to learn whether this thing is on, running, or broken.
    const spoken = [
      describeAutomationStatus(automation.status, automation.enabled),
      automation.lastRunAt ? `last run ${describeRelativeTime(automation.lastRunAt, { now })}` : null,
      automation.nextRunAt && !running ? `next run ${describeRelativeTime(automation.nextRunAt, { now })}` : null,
    ]
      .filter(Boolean)
      .join(", ");

    return (
      <div
        ref={ref}
        data-status={automation.status}
        data-enabled={automation.enabled ? "" : undefined}
        className={cn(
          "relative flex flex-col gap-3 overflow-hidden rounded-container p-5 font-sans",
          "transition-colors duration-base ease-out motion-reduce:transition-none",
          // The off state is a quieter surface, not faded text: opacity would multiply through to every
          // descendant and pull the words below the contrast threshold.
          failed ? "bg-destructive/5" : running ? "bg-primary/5" : off ? "bg-muted/25" : "bg-muted/40",
          className,
        )}
        {...props}
      >
        {running ? (
          // Core Tailwind only — this package ships no CSS, so a custom keyframe would be a no-op in
          // a consumer's build. `motion-reduce:` leaves a solid bar; the word "Running" below carries
          // the fact either way, so the animation is never the only signal.
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1 bg-primary animate-pulse motion-reduce:animate-none"
          />
        ) : null}

        <div className="flex items-start gap-3">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-label-md text-muted-foreground">{KIND_LABEL[automation.kind]}</span>
            {/* The name is the identifier, so it wraps rather than truncates: "Evening lights" clipped to
                "Evening lig…" in a narrow column names nothing. Clamped at two lines so a long name still
                cannot stretch the card unboundedly. */}
            <span className={cn("line-clamp-2 text-title-md", off ? "text-muted-foreground" : "text-foreground")}>{automation.name}</span>
          </span>
          {onToggleEnabled ? (
            <button
              type="button"
              role="switch"
              aria-checked={automation.enabled}
              aria-label={`${automation.name} enabled`}
              onClick={() => onToggleEnabled(!automation.enabled)}
              // The hit area is 44px; the visible track inside it is the smaller pill.
              className={cn(
                "-my-2 inline-flex min-h-11 min-w-14 shrink-0 items-center justify-center rounded-full",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "focus-visible:ring-offset-background md:-my-1 md:min-h-9",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-7 w-12 items-center rounded-full p-1 transition-colors duration-base motion-reduce:transition-none",
                  automation.enabled ? "bg-primary" : "bg-muted-foreground/30",
                )}
              >
                <span
                  className={cn(
                    "grid size-5 place-items-center rounded-full bg-background text-primary shadow-sm transition-transform duration-base motion-reduce:transition-none",
                    automation.enabled && "translate-x-5 rtl:-translate-x-5",
                  )}
                >
                  {/* A check on the thumb: the on state is a shape, not only the track's colour. */}
                  {automation.enabled ? <Glyph name="check" size={12} /> : null}
                </span>
              </span>
            </button>
          ) : null}
        </div>

        {primary ? <p className={cn("m-0 truncate text-body-md", off ? "text-muted-foreground" : "text-foreground")}>{primary}</p> : null}
        {secondary ? <p className="m-0 truncate text-body-sm text-muted-foreground">{secondary}</p> : null}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-body-sm text-muted-foreground">
          {/* The visible row stays abbreviated; the sentence below carries the same facts spoken. */}
          {running ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-label-md text-primary">
              <Glyph name="circle-dot" size={12} />
              Running
            </span>
          ) : null}
          {failed ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-destructive px-2.5 py-0.5 text-label-md text-destructive">
              <Glyph name="octagon" size={12} />
              {automation.errorMessage ?? "Last run failed"}
            </span>
          ) : null}
          {off && !running ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-label-md text-muted-foreground">
              <Glyph name="dash" size={12} />
              Off
            </span>
          ) : null}
          {lastRun ? <span className="tabular-nums">Last run {lastRun}</span> : null}
          {nextRun && !running ? <span className="tabular-nums">Next run {nextRun}</span> : null}
          <span className="sr-only">{spoken}</span>
        </div>

        {onRun || onSelect ? (
          <div className="flex items-center gap-2 pt-1">
            {onRun ? (
              <button
                type="button"
                onClick={onRun}
                // `canRunAutomation` rather than a local expression, so a second press cannot queue a
                // duplicate run of something with a physical cost.
                disabled={!runnable}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-label-lg text-primary-foreground md:min-h-9",
                  "transition-colors duration-fast hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2",
                  "focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  "motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                {running ? "Running…" : "Run now"}
              </button>
            ) : null}
            {onSelect ? (
              <button
                type="button"
                onClick={onSelect}
                className={cn(
                  "ms-auto inline-flex min-h-11 items-center rounded-full px-4 text-label-lg text-muted-foreground md:min-h-9",
                  "transition-colors duration-fast hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2",
                  "focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  "motion-reduce:transition-none",
                )}
              >
                Details
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  },
), "RoutineCard");

export { RoutineCard };
