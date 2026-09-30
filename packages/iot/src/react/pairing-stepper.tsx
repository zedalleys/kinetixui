import * as React from "react";
import type { KinetixPairingFlowState, KinetixPairingStep, KinetixPairingStepStatus } from "../types/pairing";
import { pairingFlowSteps } from "../functions/pairing";
import { Glyph, type GlyphName } from "./glyph";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * PairingStepper — where a person is in adding a device, as an ordered list.
 *
 * Give it the `flow` state (`pairingFlowSteps` derives the steps) or an explicit `steps` array. Every
 * step is a numbered node **and** a word — Done, In progress, Needs attention, Not started — and the
 * active or failed step carries `aria-current="step"`, so the position is available without seeing the
 * line between the nodes. Errors are a different silhouette from progress (an octagon with a "!" against
 * a ringed number), not only a different colour; a completed step is a check.
 *
 * ## Layouts (visual pass)
 * - default: a column of nodes joined by a hairline, every word visible.
 * - `horizontal`: nodes along a hairline. Below `sm` only the current step's label and state are drawn (the
 *   rest stay in the accessibility tree), at `sm` and up every label is visible.
 * - `variant="dots"`: a compact progress pill — a row of small dots with the current step's name and state
 *   beside the current one. Same list semantics, same `aria-current`.
 *
 * This is a display. It moves nowhere and starts nothing; the product advances the flow state.
 */
export interface PairingStepperProps extends Omit<React.HTMLAttributes<HTMLOListElement>, "children"> {
  flow?: KinetixPairingFlowState;
  steps?: readonly KinetixPairingStep[];
  /** Accessible name. Defaults to "Pairing progress". */
  label?: string;
  /** Lay the steps out along a line instead of down a column. */
  horizontal?: boolean;
  /** `nodes` (default) numbered nodes on a hairline, or `dots` for a compact progress pill. */
  variant?: "nodes" | "dots";
}

const GLYPH: Record<KinetixPairingStepStatus, GlyphName> = {
  complete: "check",
  active: "circle-half",
  error: "octagon",
  pending: "circle",
};

const WORD: Record<KinetixPairingStepStatus, string> = {
  complete: "Done",
  active: "In progress",
  error: "Needs attention",
  pending: "Not started",
};

const NODE: Record<KinetixPairingStepStatus, string> = {
  complete: "bg-primary text-primary-foreground",
  active: "bg-background text-primary ring-2 ring-primary",
  error: "bg-destructive/10 text-destructive",
  pending: "bg-muted text-muted-foreground",
};

/** The number, a check (done) or an octagon with "!" (needs attention) inside a round node. */
function Node({ status, index }: { status: KinetixPairingStepStatus; index: number }) {
  return (
    <span className={cn("relative z-10 grid size-8 shrink-0 place-items-center rounded-full text-label-lg tabular-nums", NODE[status], status === "active" && "font-semibold")}>
      {status === "complete" ? <Glyph name="check" size={18} /> : status === "error" ? <Glyph name="octagon" size={20} /> : index + 1}
    </span>
  );
}

const PairingStepper = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLOListElement, PairingStepperProps>(
  ({ flow, steps, label = "Pairing progress", horizontal = false, variant = "nodes", className, ...props }, ref) => {
    const list = steps ?? (flow ? pairingFlowSteps(flow) : []);

    if (variant === "dots") {
      return (
        <ol ref={ref} aria-label={label} data-variant="dots" className={cn("m-0 flex list-none flex-wrap items-center gap-1.5 p-0 font-sans", className)} {...props}>
          {list.map((step) => {
            const current = step.status === "active" || step.status === "error";
            return (
              <li
                key={step.id}
                data-step={step.id}
                data-step-status={step.status}
                aria-current={current ? "step" : undefined}
                className={cn("flex min-w-0 items-center gap-2 rounded-full", current && "bg-muted py-1 ps-2 pe-3")}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-2 shrink-0 rounded-full",
                    step.status === "complete" && "w-2 bg-primary",
                    step.status === "active" && "w-6 bg-primary",
                    step.status === "error" && "w-6 border-2 border-dashed border-destructive",
                    step.status === "pending" && "w-2 bg-muted-foreground/40",
                  )}
                />
                <Glyph name={GLYPH[step.status]} size={current ? 14 : 12} className={cn(current ? (step.status === "error" ? "text-destructive" : "text-primary") : "hidden")} />
                <span className={cn("flex min-w-0 flex-col", current ? "" : "sr-only")}>
                  <span className={cn("break-words text-label-lg", step.status === "error" ? "text-destructive" : "text-foreground")}>{step.label}</span>
                  <span className={cn("text-label-md", step.status === "error" ? "text-destructive" : "text-muted-foreground")}>{WORD[step.status]}</span>
                </span>
              </li>
            );
          })}
        </ol>
      );
    }

    return (
      <ol
        ref={ref}
        aria-label={label}
        data-variant="nodes"
        className={cn("m-0 flex list-none p-0 font-sans", horizontal ? "flex-row items-start" : "flex-col", className)}
        {...props}
      >
        {list.map((step, index) => {
          const last = index === list.length - 1;
          const first = index === 0;
          const prevDone = list[index - 1]?.status === "complete";
          const current = step.status === "active" || step.status === "error";
          // Below `sm` a horizontal row has no room for every label: the current one stays drawn and the
          // others move to the accessibility tree only.
          const textClass = horizontal && !current ? "sr-only sm:not-sr-only" : "";
          const done = step.status === "complete";
          return (
            <li
              key={step.id}
              data-step={step.id}
              data-step-status={step.status}
              aria-current={current ? "step" : undefined}
              className={cn("relative flex min-w-0", horizontal ? "flex-1 flex-col items-center gap-2 text-center" : "items-stretch gap-3")}
            >
              {horizontal ? (
                <>
                  <Node status={step.status} index={index} />
                  {/* The hairline is drawn as two halves, each inside its own step: from this node to the
                      end of the step, and from the start of the next step to its node. A single
                      `w-full` line offset by 50% would stick 50% of the step's width past its end, which
                      is a real horizontal overflow at phone widths (a step 54px wide scrolled to 81px). */}
                  {first ? null : <span aria-hidden="true" className={cn("absolute start-0 end-1/2 top-4 h-px", prevDone ? "bg-primary" : "bg-border")} />}
                  {last ? null : <span aria-hidden="true" className={cn("absolute start-1/2 end-0 top-4 h-px", done ? "bg-primary" : "bg-border")} />}
                  <span className="flex min-w-0 flex-col items-center gap-0.5">
                    <span className={cn("break-words text-label-lg", step.status === "pending" ? "text-muted-foreground" : "text-foreground", textClass)}>{step.label}</span>
                    {/* A step in a four-step row is about 64px wide on a 320px phone, which is narrower
                        than a glyph plus "In progress" on one line. Wrapping lets the word drop under
                        the glyph rather than scroll out of the step. */}
                    <span className={cn("inline-flex flex-wrap items-center justify-center gap-1 text-label-md", step.status === "error" ? "text-destructive" : "text-muted-foreground", textClass)}>
                      <Glyph name={GLYPH[step.status]} size={12} className={horizontal && !current ? "hidden sm:inline-block" : undefined} />
                      {WORD[step.status]}
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <span className="flex shrink-0 flex-col items-center">
                    <Node status={step.status} index={index} />
                    {last ? null : <span aria-hidden="true" className={cn("my-1 w-px flex-1", done ? "bg-primary" : "bg-border")} />}
                  </span>
                  <span className={cn("flex min-w-0 flex-col justify-start gap-0.5 pt-1", last ? "" : "pb-4")}>
                    <span className={cn("break-words text-title-sm", step.status === "pending" ? "text-muted-foreground" : "text-foreground")}>{step.label}</span>
                    <span className={cn("inline-flex items-center gap-1 text-body-sm", step.status === "error" ? "text-destructive" : "text-muted-foreground")}>
                      <Glyph name={GLYPH[step.status]} size={12} />
                      {WORD[step.status]}
                    </span>
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    );
  },
), "PairingStepper");

export { PairingStepper };
