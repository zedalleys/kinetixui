"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "../lib/utils";

/**
 * Stepper — a numbered multi-step progress indicator. Horizontal or
 * vertical; each step is complete / current / upcoming, derived from
 * `current` against its index.
 */
export interface StepperStep {
  label: React.ReactNode;
  description?: React.ReactNode;
}

export interface StepperProps extends React.HTMLAttributes<HTMLOListElement> {
  steps: StepperStep[];
  /** zero-based index of the active step */
  current: number;
  orientation?: "horizontal" | "vertical";
}

const Stepper = React.forwardRef<HTMLOListElement, StepperProps>(
  ({ className, steps, current, orientation = "horizontal", ...props }, ref) => {
    const vertical = orientation === "vertical";
    return (
      <ol ref={ref} className={cn("flex font-sans", vertical ? "flex-col" : "w-full items-start", className)} {...props}>
        {steps.map((step, i) => {
          const status = i < current ? "complete" : i === current ? "current" : "upcoming";
          const isLast = i === steps.length - 1;
          return (
            <li
              key={i}
              className={cn("flex", vertical ? "flex-row gap-3" : "flex-1 flex-col items-center gap-2 text-center")}
              aria-current={status === "current" ? "step" : undefined}
            >
              <div className={cn("flex items-center", vertical ? "flex-col" : "w-full")}>
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-label-md font-medium",
                    status === "complete" && "bg-primary text-primary-foreground",
                    status === "current" && "border-2 border-primary text-primary",
                    status === "upcoming" && "border border-input text-muted-foreground",
                  )}
                >
                  {status === "complete" ? <Check className="size-4" /> : i + 1}
                </span>
                {!isLast && (
                  <span
                    aria-hidden
                    className={cn(
                      "bg-border",
                      vertical ? "my-1 min-h-6 w-px flex-1 self-stretch" : "mt-3.5 h-px flex-1",
                      status === "complete" && "bg-primary",
                    )}
                  />
                )}
              </div>
              <div className={cn(vertical && "pb-6")}>
                <p className={cn("text-label-md font-medium", status === "upcoming" ? "text-muted-foreground" : "text-foreground")}>
                  {step.label}
                </p>
                {step.description && <p className="text-body-sm text-muted-foreground">{step.description}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    );
  },
);
Stepper.displayName = "Stepper";

export { Stepper };
