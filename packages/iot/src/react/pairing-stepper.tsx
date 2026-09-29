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
 * step is a glyph **and** a word — Done, In progress, Needs attention, Not started — and the active or
 * failed step carries `aria-current="step"`, so the position is available without seeing the line
 * between the dots. Errors are a different silhouette from progress (octagon against half-ring), not
 * only a different colour.
 *
 * This is a display. It moves nowhere and starts nothing; the product advances the flow state.
 */
export interface PairingStepperProps extends Omit<React.HTMLAttributes<HTMLOListElement>, "children"> {
  flow?: KinetixPairingFlowState;
  steps?: readonly KinetixPairingStep[];
  /** Accessible name. Defaults to "Pairing progress". */
  label?: string;
  /** Lay the steps out in a wrapping row instead of a column. */
  horizontal?: boolean;
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

const PairingStepper = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLOListElement, PairingStepperProps>(
  ({ flow, steps, label = "Pairing progress", horizontal = false, className, ...props }, ref) => {
    const list = steps ?? (flow ? pairingFlowSteps(flow) : []);
    return (
      <ol
        ref={ref}
        aria-label={label}
        className={cn("m-0 flex list-none gap-x-5 gap-y-2 p-0 font-sans", horizontal ? "flex-row flex-wrap" : "flex-col", className)}
        {...props}
      >
        {list.map((step) => (
          <li
            key={step.id}
            data-step={step.id}
            data-step-status={step.status}
            aria-current={step.status === "active" || step.status === "error" ? "step" : undefined}
            className="flex min-w-0 items-start gap-2"
          >
            <Glyph name={GLYPH[step.status]} size={16} className={cn("mt-0.5", step.status === "error" ? "text-destructive" : step.status === "pending" ? "text-muted-foreground" : "text-foreground")} />
            <span className="flex min-w-0 flex-col">
              <span className={cn("break-words text-label-md", step.status === "pending" ? "text-muted-foreground" : "text-foreground", step.status === "active" && "font-medium")}>{step.label}</span>
              <span className={cn("text-label-sm", step.status === "error" ? "text-destructive" : "text-muted-foreground")}>{WORD[step.status]}</span>
            </span>
          </li>
        ))}
      </ol>
    );
  },
), "PairingStepper");

export { PairingStepper };
