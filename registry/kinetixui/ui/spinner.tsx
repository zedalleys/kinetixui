"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Spinner — a lightweight loading indicator. Border-based ring, no icon
 * dependency; `size` sets the diameter, `variant` swaps the indicator
 * colour for on-color surfaces.
 */
const spinnerVariants = cva("inline-block animate-spin rounded-full border-2 border-current border-t-transparent", {
  variants: {
    size: {
      sm: "size-4",
      md: "size-6",
      lg: "size-8",
    },
    variant: {
      default: "text-primary",
      muted: "text-muted-foreground",
      onColor: "text-primary-foreground",
    },
  },
  defaultVariants: { size: "md", variant: "default" },
});

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string;
}

const Spinner = React.forwardRef<HTMLSpanElement, SpinnerProps>(
  ({ className, size, variant, label = "Loading…", ...props }, ref) => (
    <span ref={ref} role="status" aria-label={label} className={cn(spinnerVariants({ size, variant }), className)} {...props}>
      <span className="sr-only">{label}</span>
    </span>
  ),
);
Spinner.displayName = "Spinner";

export { Spinner, spinnerVariants };
