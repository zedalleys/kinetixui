"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

/**
 * Fab — a floating action button. Circular by default; pass a text child
 * alongside the icon to render the extended pill form (`extended`).
 */
const fabVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-sans font-medium",
    "shadow-lg outline-none transition-colors",
    "focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        Primary: "bg-primary text-primary-foreground hover:bg-[--color-blue-600] active:bg-[--color-blue-700]",
        Secondary:
          "bg-secondary text-secondary-foreground hover:bg-[--color-green-500] hover:text-[--color-green-50] active:bg-[--color-green-600] active:text-[--color-green-50]",
      },
      size: {
        default: "size-14 [&_svg]:size-6",
        sm: "size-11 [&_svg]:size-5",
      },
      extended: {
        true: "w-auto px-5",
        false: "",
      },
    },
    defaultVariants: { variant: "Primary", size: "default", extended: false },
  },
);

export interface FabProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof fabVariants> {
  asChild?: boolean;
}

const Fab = React.forwardRef<HTMLButtonElement, FabProps>(
  ({ className, variant, size, extended, asChild = false, ...props }, ref) => {
    const Comp: React.ElementType = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        data-slot="fab"
        className={cn(fabVariants({ variant, size, extended }), className)}
        {...props}
      />
    );
  },
);
Fab.displayName = "Fab";

export { Fab, fabVariants };
