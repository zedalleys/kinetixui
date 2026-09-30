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
 * **Density.** `full` (default) is the stepper with its values and sentence. `compact` is one line —
 * "Requested › Acknowledged, not yet confirmed" — with the current stage emphasised by weight and a tint,
 * for a card that already shows the values. The sentence stays the single `role="status"` region in both
 * densities (visually hidden in compact unless the request failed, so a failure is never silent on screen).
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
  /** `full` (default) or `compact` — a single line with the current stage emphasised. */
  density?: "full" | "compact";
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
  ({ lifecycle, formatValue, onRetry, onCancel, labels, hideValues = false, density = "full", className, ...props }, ref) => {
    const format = (v: unknown) => (v === undefined || v === null ? "Unknown" : (formatValue ?? String)(v));
    const steps = stepsFor(lifecycle);
    const pending = isLifecyclePending(lifecycle);
    const retry = onRetry !== undefined && canRetryLifecycle(lifecycle);
    const bad = TERMINAL_BAD.includes(lifecycle.stage);
    // The machine accepts a cancel while in flight and after a failure, timeout or unreachable
    // (abandoning a request that never landed); it does not after confirmed or cancelled.
    const cancel = onCancel !== undefined && (pending || bad);
    const compact = density === "compact";
    const attemptText =
      lifecycle.attempts > 0
        ? (labels?.attempt?.(lifecycle.attempts, lifecycle.maxAttempts) ?? `Attempt ${lifecycle.attempts} of ${lifecycle.maxAttempts}`)
        : null;

    const wordFor = (step: (typeof steps)[number]) => {
      const bare = describeLifecycleStage(step.stage);
      // The half-filled "Acknowledged" is spelled out while it is the current step: it is the
      // one stage most likely to be misread as done.
      return step.stage === "acknowledged" && step.state === "current" ? "Acknowledged, not yet confirmed" : bare;
    };

    return (
      <div
        ref={ref}
        data-lifecycle-stage={lifecycle.stage}
        data-density={density}
        className={cn("flex min-w-0 flex-col font-sans", compact ? "gap-1.5" : "gap-3", className)}
        {...props}
      >
        {steps.length > 0 ? (
          <ol
            className={cn("m-0 flex list-none flex-wrap items-center p-0", compact ? "gap-x-1.5 gap-y-1" : "gap-x-2 gap-y-2")}
            aria-label="Progress of the request"
          >
            {steps.map((step, index) => {
              const word = wordFor(step);
              const last = index === steps.length - 1;
              const failed = step.state === "current" && bad;
              return (
                <li
                  key={step.stage}
                  data-step={step.stage}
                  data-step-state={step.state}
                  aria-current={step.state === "current" ? "step" : undefined}
                  className={cn(
                    "inline-flex items-center",
                    compact ? "gap-1.5 text-label-lg" : "gap-2 text-label-lg",
                    step.state === "upcoming" ? "text-muted-foreground" : "text-foreground",
                    failed && "text-destructive",
                  )}
                >
                  {compact ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5",
                        step.state === "current" && (failed ? "bg-destructive/10 font-semibold" : "bg-primary/10 font-semibold"),
                      )}
                    >
                      <Glyph
                        name={STAGE_GLYPH[step.stage]}
                        size={14}
                        className={cn(step.state === "upcoming" && "opacity-60", step.stage === "retrying" && pending && "animate-spin motion-reduce:animate-none")}
                      />
                      <span>{word}</span>
                    </span>
                  ) : (
                    <>
                      {/* The marker: filled tone = reached, tinted ring = here, dashed hollow = still ahead. */}
                      <span
                        className={cn(
                          "grid size-7 shrink-0 place-items-center rounded-full",
                          step.state === "done" && "bg-muted",
                          step.state === "current" && (failed ? "bg-destructive/10 ring-1 ring-inset ring-destructive/40" : "bg-primary/10 ring-1 ring-inset ring-primary/40"),
                          step.state === "upcoming" && "border border-dashed border-border",
                        )}
                      >
                        <Glyph
                          name={STAGE_GLYPH[step.stage]}
                          size={16}
                          className={cn(step.state === "upcoming" && "opacity-60", step.stage === "retrying" && pending && "animate-spin motion-reduce:animate-none")}
                        />
                      </span>
                      <span className={step.state === "current" ? "font-semibold" : step.state === "done" ? "font-medium" : "font-normal"}>{word}</span>
                    </>
                  )}
                  {step.state === "upcoming" ? <span className="sr-only"> (not reached yet)</span> : null}
                  {last ? null : compact ? (
                    // Chevron, mirrored under RTL: it points along the reading direction.
                    <svg aria-hidden="true" focusable="false" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-foreground rtl:-scale-x-100">
                      <path d="m6 3.5 4.5 4.5L6 12.5" />
                    </svg>
                  ) : (
                    // The connecting hairline: solid once the next step is reached, dashed while it is ahead.
                    <span
                      aria-hidden="true"
                      className={cn(
                        "ms-1 hidden h-0 w-6 shrink-0 border-t sm:block",
                        steps[index + 1]?.state === "upcoming" ? "border-dashed border-border" : "border-solid border-muted-foreground/50",
                      )}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        ) : null}

        {hideValues || compact ? null : (
          <dl className="m-0 flex flex-wrap gap-x-6 gap-y-1 rounded-xl bg-muted/40 px-3 py-2 text-label-md">
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
        {attemptText ? <p data-attempts="" className="m-0 text-label-md text-muted-foreground">{attemptText}</p> : null}

        {/* The one live region. Live regions announce *changes*, so the first render is silent and a
            stage change is spoken once. The stepper above is deliberately not live. */}
        <p
          role="status"
          data-lifecycle-summary=""
          className={cn("m-0 text-label-lg text-muted-foreground", compact && !bad && "sr-only")}
        >
          {describeCommandLifecycle(lifecycle, { formatValue })}
        </p>

        {retry || cancel ? (
          <div className="flex flex-wrap gap-2">
            {retry ? (
              <button
                type="button"
                onClick={onRetry}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-label-lg text-primary-foreground md:min-h-9",
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
                  "inline-flex min-h-11 items-center rounded-lg bg-muted px-4 text-label-lg text-foreground md:min-h-9",
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
