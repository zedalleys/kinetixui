"use client";

import * as React from "react";
import type { KinetixCommandLifecycle, KinetixCommandStrategy } from "../types/command";
import { describeCommandFeedback } from "../functions/feedback";
import { resolveControlPresentation } from "../functions/control";
import { parseTimestamp } from "../functions/time";
import { Glyph, STAGE_GLYPH } from "./glyph";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * CommandFeedback — what happened to a command, said where the user is looking (M3).
 *
 * Presentation over an existing {@link KinetixCommandLifecycle}; it holds no state and runs no timer.
 * `CommandLifecycle` is the three-step stepper for a request you want to watch settle. This is the line
 * (or small panel) of feedback beside a control or in a list: a stage glyph, a headline, and in `full`
 * density the sentence, the reason and the times.
 *
 * - `requested`, `acknowledged` and `retrying` read "…, not yet confirmed". Only `confirmed` reads as done.
 * - `timed-out` reads "Timed out, may still apply": the application stopped waiting; the device may not have.
 * - `unreachable` is its own headline, not a generic failure. `cancelled` claims no rollback.
 * - The device's reported value is in every sentence, and stays the truth.
 * - `strategy` is the one the control uses. It changes what the control **draws**, so the feedback
 *   says when the display rolled back; it never changes what the feedback says about the device.
 *
 * Retry is a real button, offered only when the lifecycle allows one (`canRetryLifecycle`) and the
 * product passed `onRetry`. Nothing is retried automatically.
 *
 * **Announcing.** Off by default: a control given the same lifecycle already announces its outcome, and
 * two regions would be heard twice. Pass `announce` when this is the only place the outcome is said;
 * it renders one polite `role="status"` region (present before its first message), and under the
 * `optimistic` strategy the wait itself is not announced, as in the controls.
 */
export interface CommandFeedbackProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  lifecycle: KinetixCommandLifecycle;
  /** The strategy the related control uses. Defaults to `confirmed`. */
  strategy?: KinetixCommandStrategy;
  /** How a value reads: `(v) => (v ? "on" : "off")`. Defaults to `String`. */
  formatValue?: (value: unknown) => string;
  /** A name for the command, e.g. "Irrigation zone 3". Prefixed to the headline. */
  label?: string;
  /** `compact` (default) is one line; `full` adds the sentence, the reason and the times. */
  density?: "compact" | "full";
  /** Called from the Retry button, which renders only when the lifecycle allows a retry. */
  onRetry?: () => void;
  /** The Retry button's text. Defaults to "Retry". */
  retryLabel?: string;
  /** One polite status region for this feedback. Off by default; see the component docs. */
  announce?: boolean;
  /** How a time reads in `full` density. Defaults to `HH:MM:SS` UTC, like the rest of the package. */
  formatTime?: (date: Date) => string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const utcClock = (d: Date) => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;

const TONE = {
  neutral: "text-muted-foreground",
  pending: "text-foreground",
  success: "text-foreground",
  attention: "text-destructive",
} as const;

const CommandFeedback = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, CommandFeedbackProps>(
  ({ lifecycle, strategy = "confirmed", formatValue, label, density = "compact", onRetry, retryLabel = "Retry", announce = false, formatTime, className, ...props }, ref) => {
    const feedback = describeCommandFeedback(lifecycle, { formatValue });
    const presentation = resolveControlPresentation({ lifecycle, strategy });
    const full = density === "full";
    const retry = onRetry !== undefined && feedback.retryable;
    const clock = formatTime ?? utcClock;
    const headline = label?.trim() ? `${label.trim()}: ${feedback.headline}` : feedback.headline;
    // The announcement follows the controls' rule: under `optimistic` the wait is not marked, so it is not
    // announced; every outcome is. Its words are the feedback's own sentence.
    const announcement = !announce
      ? null
      : feedback.pending && !presentation.indicatePending
        ? ""
        : lifecycle.stage === "idle"
          ? ""
          : `${headline}. ${feedback.sentence}`;
    const times: { term: string; at: Date }[] = [];
    if (full) {
      const entries: [string, string | undefined][] = [
        ["Sent", lifecycle.sentAt],
        ["Acknowledged", lifecycle.ackAt],
        [lifecycle.stage === "confirmed" ? "Confirmed" : "Settled", lifecycle.settledAt],
      ];
      for (const [term, value] of entries) {
        const at = parseTimestamp(value ?? null);
        if (at) times.push({ term, at });
      }
    }
    const rolledBack = presentation.rolledBack;

    return (
      <div
        ref={ref}
        data-feedback-stage={lifecycle.stage}
        data-feedback-tone={feedback.tone}
        data-density={density}
        className={cn("flex min-w-0 font-sans", full ? "flex-col gap-2 rounded-xl bg-muted/40 p-3" : "flex-wrap items-center gap-x-3 gap-y-1", className)}
        {...props}
      >
        <span data-feedback-headline="" className={cn("inline-flex min-w-0 items-start gap-1.5 text-label-lg font-medium", TONE[feedback.tone])}>
          <Glyph
            name={STAGE_GLYPH[lifecycle.stage] ?? "dot"}
            size={16}
            // Retrying is the one stage that names an action in progress; its glyph turns, and stops
            // under reduced motion with the word unchanged.
            className={cn("mt-0.5", lifecycle.stage === "retrying" && "animate-spin motion-reduce:animate-none")}
          />
          <span className="min-w-0 break-words">{headline}</span>
        </span>
        {full ? (
          <p data-feedback-sentence="" className="m-0 break-words text-body-sm text-foreground">
            {feedback.sentence}
          </p>
        ) : (
          // Compact keeps the sentence for assistive technology: the headline alone does not say what the device reports.
          <span className="sr-only">{feedback.sentence}</span>
        )}
        {rolledBack ? (
          <p data-feedback-rolled-back="" className="m-0 break-words text-label-md text-muted-foreground">
            The display returned to what the device reports.
          </p>
        ) : null}
        {full && lifecycle.reasonCode ? (
          <p data-feedback-code="" className="m-0 break-words text-label-md text-muted-foreground">
            Code: <code className="font-mono">{lifecycle.reasonCode}</code>
          </p>
        ) : null}
        {times.length > 0 ? (
          <dl className="m-0 flex flex-wrap gap-x-4 gap-y-1 text-label-md">
            {times.map(({ term, at }) => (
              <div key={term} className="flex gap-x-1.5">
                <dt className="text-muted-foreground">{term}</dt>
                <dd className="m-0 tabular-nums text-foreground">
                  <time dateTime={at.toISOString()}>{clock(at)}</time>
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        {retry ? (
          <button
            type="button"
            onClick={onRetry}
            className={cn(
              "inline-flex min-h-11 items-center self-start rounded-lg bg-muted px-4 text-label-lg text-foreground md:min-h-9",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            )}
          >
            {retryLabel}
          </button>
        ) : null}
        {announcement !== null ? (
          <span role="status" aria-live="polite" aria-atomic="true" data-feedback-announcer="" className="sr-only">
            {announcement}
          </span>
        ) : null}
      </div>
    );
  },
), "CommandFeedback");

export { CommandFeedback };
