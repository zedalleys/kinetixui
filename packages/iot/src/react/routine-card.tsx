"use client";

import * as React from "react";
import type { KinetixAutomation } from "../types/automation";
import { canRunAutomation, describeAutomationStatus, describeRelativeTime, formatRelativeTime } from "../functions/automation";
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
          "relative flex flex-col gap-3 overflow-hidden rounded-2xl border p-4 font-sans",
          "transition-colors duration-300 ease-out motion-reduce:transition-none",
          failed ? "border-destructive/30 bg-destructive/[0.04]" : running ? "border-primary/35 bg-primary/[0.05]" : "border-border bg-card",
          off && "opacity-70",
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
            className="absolute inset-x-0 top-0 h-0.5 bg-primary animate-pulse motion-reduce:animate-none"
          />
        ) : null}

        <div className="flex items-start gap-3">
          <span className="flex min-w-0 flex-col">
            <span className="text-label-sm uppercase tracking-wide text-muted-foreground">{KIND_LABEL[automation.kind]}</span>
            <span className="truncate text-title-sm text-foreground">{automation.name}</span>
          </span>
          {onToggleEnabled ? (
            <button
              type="button"
              role="switch"
              aria-checked={automation.enabled}
              aria-label={`${automation.name} enabled`}
              onClick={() => onToggleEnabled(!automation.enabled)}
              className={cn(
                "ms-auto inline-flex h-7 w-12 shrink-0 items-center rounded-full border p-1 transition-colors duration-300",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "focus-visible:ring-offset-background motion-reduce:transition-none",
                automation.enabled ? "border-transparent bg-primary" : "border-border bg-muted",
              )}
            >
              <span
                className={cn(
                  "size-5 rounded-full bg-background shadow-sm transition-transform duration-300 motion-reduce:transition-none",
                  automation.enabled && "translate-x-5 rtl:-translate-x-5",
                )}
              />
            </button>
          ) : null}
        </div>

        {primary ? <p className="truncate text-label-md text-foreground">{primary}</p> : null}
        {secondary ? <p className="truncate text-label-sm text-muted-foreground">{secondary}</p> : null}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-label-sm text-muted-foreground">
          {/* The visible row stays abbreviated; the sentence below carries the same facts spoken. */}
          {running ? <span className="text-primary">Running</span> : null}
          {failed ? <span className="text-destructive">{automation.errorMessage ?? "Last run failed"}</span> : null}
          {off && !running ? <span>Off</span> : null}
          {lastRun ? <span className="tabular-nums">Last run {lastRun}</span> : null}
          {nextRun && !running ? <span className="tabular-nums">Next run {nextRun}</span> : null}
          <span className="sr-only">{spoken}</span>
        </div>

        {onRun || onSelect ? (
          <div className="flex items-center gap-2 border-t border-border/70 pt-3">
            {onRun ? (
              <button
                type="button"
                onClick={onRun}
                // `canRunAutomation` rather than a local expression, so a second press cannot queue a
                // duplicate run of something with a physical cost.
                disabled={!runnable}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-lg bg-primary px-3.5 text-label-md text-primary-foreground",
                  "transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2",
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
                  "ms-auto inline-flex min-h-11 items-center rounded-lg px-3 text-label-md text-muted-foreground",
                  "transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2",
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
