"use client";

import * as React from "react";
import type { KinetixCommandLifecycle, KinetixCommandLifecycleStage } from "../types/command";
import { canRetryLifecycle, describeCommandLifecycle, describeLifecycleStage, isLifecyclePending } from "../functions/commands";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";
import { Glyph, STAGE_GLYPH } from "./glyph";

/**
 * CommandLifecycle — the honest middle of "I asked, and did it happen?".
 *
 * Renders a {@link KinetixCommandLifecycle} as a compact stepper: `requested → acknowledged →
 * confirmed` on the way to success, or `requested → timed out / unreachable / failed` (with a Retry
 * when the machine says one is allowed) on the way to failure. It draws only the steps that were
 * actually reached plus the ones still ahead of an in-flight request; it never claims a timeout that
 * the lifecycle did not record.
 *
 * **Acknowledged never looks like confirmed.** Different glyph (a half-filled ring against a ringed
 * tick), different word, and the sentence beneath — `describeCommandLifecycle`, the same one an
 * assistive-technology user gets — says "has not confirmed it". The requested value and the value the
 * device last reported are both printed, so the gap between them is visible instead of implied.
 *
 * **Live region discipline.** The sentence is the one `role="status"` region. It is not duplicated
 * anywhere (the stepper is not live) and nothing is announced on first render — a live region
 * announces *changes* — so a stage change is spoken once, politely. Failure is polite too: the visible
 * text and the Retry button say what happened, and interrupting someone mid-sentence for a timeout
 * that they can retry is worse than telling them next.
 *
 * Nothing here sends anything. `onRetry` and `onCancel` report intent; the product drives the
 * lifecycle machine.
 */
export interface CommandLifecycleProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  lifecycle: KinetixCommandLifecycle;
  /** How a value reads: `(v) => (v ? "on" : "off")`. Defaults to `String`. */
  formatValue?: (value: unknown) => string;
  /** Called from the Retry button, which renders only when the lifecycle permits a retry. */
  onRetry?: () => void;
  /** Called from the Cancel button, which renders while a request is in flight or has failed to land. */
  onCancel?: () => void;
  /** Copy overrides, e.g. for translation. Anything omitted uses the package wording. */
  labels?: {
    retry?: string;
    cancel?: string;
    requested?: string;
    device?: string;
    attempt?: (attempts: number, max: number) => string;
  };
  /** Hide the "Requested / Device reports" pair. Only where both values are already on screen. */
  hideValues?: boolean;
}

type StepState = "done" | "current" | "upcoming";

/** The steps reached so far, then the ones still ahead. Only the recorded history is drawn. */
function stepsFor(l: KinetixCommandLifecycle): { stage: KinetixCommandLifecycleStage; state: StepState }[] {
  const acked = l.ackAt !== undefined;
  switch (l.stage) {
    case "idle":
      return [];
    case "requested":
    case "retrying":
      return [
        { stage: l.stage, state: "current" },
        { stage: "acknowledged", state: "upcoming" },
        { stage: "confirmed", state: "upcoming" },
      ];
    case "acknowledged":
      return [
        { stage: "requested", state: "done" },
        { stage: "acknowledged", state: "current" },
        { stage: "confirmed", state: "upcoming" },
      ];
    case "confirmed":
      return [
        { stage: "requested", state: "done" },
        ...(acked ? [{ stage: "acknowledged" as const, state: "done" as const }] : []),
        { stage: "confirmed", state: "current" },
      ];
    default:
      return [
        { stage: "requested", state: "done" },
        ...(acked ? [{ stage: "acknowledged" as const, state: "done" as const }] : []),
        { stage: l.stage, state: "current" },
      ];
  }
}

const TERMINAL_BAD: readonly KinetixCommandLifecycleStage[] = ["failed", "timed-out", "unreachable"];

const CommandLifecycle = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, CommandLifecycleProps>(
  ({ lifecycle, formatValue, onRetry, onCancel, labels, hideValues = false, className, ...props }, ref) => {
    const format = (v: unknown) => (v === undefined || v === null ? "Unknown" : (formatValue ?? String)(v));
    const steps = stepsFor(lifecycle);
    const pending = isLifecyclePending(lifecycle);
    const retry = onRetry !== undefined && canRetryLifecycle(lifecycle);
    const bad = TERMINAL_BAD.includes(lifecycle.stage);
    // The machine accepts a cancel while in flight and after a failure, timeout or unreachable
    // (abandoning a request that never landed); it does not after confirmed or cancelled.
    const cancel = onCancel !== undefined && (pending || bad);
    const attemptText =
      lifecycle.attempts > 0
        ? (labels?.attempt?.(lifecycle.attempts, lifecycle.maxAttempts) ?? `Attempt ${lifecycle.attempts} of ${lifecycle.maxAttempts}`)
        : null;

    return (
      <div
        ref={ref}
        data-lifecycle-stage={lifecycle.stage}
        className={cn("flex min-w-0 flex-col gap-2.5 font-sans", className)}
        {...props}
      >
        {steps.length > 0 ? (
          <ol className="flex flex-wrap items-center gap-x-4 gap-y-1.5" aria-label="Progress of the request">
            {steps.map((step) => {
              const bare = describeLifecycleStage(step.stage);
              // The half-filled "Acknowledged" is spelled out while it is the current step: it is the
              // one stage most likely to be misread as done.
              const word = step.stage === "acknowledged" && step.state === "current" ? "Acknowledged, not yet confirmed" : bare;
              return (
                <li
                  key={step.stage}
                  data-step={step.stage}
                  data-step-state={step.state}
                  aria-current={step.state === "current" ? "step" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 text-label-md",
                    step.state === "upcoming" ? "text-muted-foreground" : "text-foreground",
                    step.state === "current" && bad && "text-destructive",
                  )}
                >
                  <Glyph name={STAGE_GLYPH[step.stage]} className={cn(step.state === "upcoming" && "opacity-60", step.stage === "retrying" && pending && "animate-spin motion-reduce:animate-none")} />
                  <span className={step.state === "current" ? "font-medium" : undefined}>{word}</span>
                  {step.state === "upcoming" ? <span className="sr-only"> (not reached yet)</span> : null}
                </li>
              );
            })}
          </ol>
        ) : null}

        {hideValues ? null : (
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-label-sm">
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">{labels?.requested ?? "Requested"}</dt>
              <dd data-requested="" className="text-foreground">{format(lifecycle.requestedValue)}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">{labels?.device ?? "Device reports"}</dt>
              <dd data-confirmed="" className="text-foreground">{format(lifecycle.confirmedValue)}</dd>
            </div>
          </dl>
        )}
        {attemptText ? <p data-attempts="" className="text-label-sm text-muted-foreground">{attemptText}</p> : null}

        {/* The one live region. Live regions announce *changes*, so the first render is silent and a
            stage change is spoken once. The stepper above is deliberately not live. */}
        <p role="status" data-lifecycle-summary="" className="text-label-sm text-muted-foreground">
          {describeCommandLifecycle(lifecycle, { formatValue })}
        </p>

        {retry || cancel ? (
          <div className="flex flex-wrap gap-2">
            {retry ? (
              <button
                type="button"
                onClick={onRetry}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-lg bg-primary px-3.5 text-label-md text-primary-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                )}
              >
                {labels?.retry ?? "Retry"}
              </button>
            ) : null}
            {cancel ? (
              <button
                type="button"
                onClick={onCancel}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-lg border border-input bg-background px-3.5 text-label-md text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                )}
              >
                {labels?.cancel ?? "Cancel"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  },
), "CommandLifecycle");

export { CommandLifecycle };
