"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "../lib/utils";

/**
 * Inform — a persistent, dismissible, intent-tinted inline notice with an
 * optional action (information / warning / success / error / action).
 * Distinct from `Alert` (border-only, static): Inform is filled, closable,
 * and can carry a CTA.
 */
const informVariants = cva(
  "flex items-start gap-2.5 rounded-md p-3 text-body-sm font-sans [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        information: "bg-info/10 text-info",
        warning: "bg-warning/15 text-warning",
        success: "bg-success/15 text-success",
        error: "bg-destructive/10 text-destructive",
        action: "bg-foreground text-background",
      },
    },
    defaultVariants: { variant: "information" },
  },
);

const ICON = {
  information: Info,
  warning: TriangleAlert,
  success: CircleCheck,
  error: CircleAlert,
  action: Info,
} as const;

export interface InformProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof informVariants> {
  hideIcon?: boolean;
  onDismiss?: () => void;
  /** optional CTA rendered below the message */
  action?: { label: React.ReactNode; onClick?: () => void; icon?: React.ReactNode };
}

const Inform = React.forwardRef<HTMLDivElement, InformProps>(
  ({ className, variant = "information", hideIcon, onDismiss, action, children, ...props }, ref) => {
    const Icon = ICON[variant ?? "information"];
    return (
      <div ref={ref} role="status" className={cn(informVariants({ variant }), className)} {...props}>
        {!hideIcon && <Icon />}
        <div className="min-w-0 flex-1">
          <p className="[&:not(:only-child)]:mb-2">{children}</p>
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex items-center gap-1.5 text-label-md font-medium underline-offset-2 outline-none hover:underline focus-visible:underline [&>svg]:size-4"
            >
              {action.icon}
              {action.label}
            </button>
          )}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="-m-0.5 shrink-0 rounded-[2px] p-0.5 opacity-70 outline-none transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-current"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    );
  },
);
Inform.displayName = "Inform";

export { Inform, informVariants };
