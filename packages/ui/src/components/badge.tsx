"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

/**
 * Badge — reconciled 1:1 with the KinetixUI design source, node 54855:13995.
 * Solid pill status marker. Label Medium type (12 / 16, +0.5). Variants:
 * default | secondary | destructive | outline | subtle.
 *
 * Note: the design's "Secondary" badge is the saturated sage (`#748873`), which
 * in this token contract is `--secondary-foreground`; `--secondary` is its light
 * container. Hence the swapped bg/text on that one variant.
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-1 text-label-md font-sans transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-action text-action-foreground",
        secondary: "bg-secondary-foreground text-secondary",
        destructive: "bg-destructive text-destructive-foreground",
        outline: "border border-input text-foreground",
        subtle: "bg-accent text-accent-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  /** render as the single child element (Radix Slot) instead of <div> —
   * e.g. `<Badge asChild><a href="/new">New</a></Badge>` for a linked badge */
  asChild?: boolean;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "div";
    return <Comp ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />;
  },
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
