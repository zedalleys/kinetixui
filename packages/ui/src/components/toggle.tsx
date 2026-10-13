"use client";

import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium font-sans transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-disabled data-[state=on]:bg-accent data-[state=on]:text-accent-foreground data-[state=on]:ring-1 data-[state=on]:ring-inset data-[state=on]:ring-ring [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        pill: "max-w-full rounded-full border border-border bg-transparent text-label-md hover:text-foreground data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:ring-0 motion-reduce:transition-none focus-visible:ring-2 forced-colors:focus-visible:[outline:2px_solid_CanvasText] forced-colors:focus-visible:outline-offset-2 forced-colors:data-[state=on]:bg-[Canvas] forced-colors:data-[state=on]:text-[CanvasText] forced-colors:data-[state=on]:border-[CanvasText] forced-colors:data-[state=on]:outline forced-colors:data-[state=on]:outline-2 forced-colors:data-[state=on]:outline-offset-[-3px]",
        outline: "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-9 min-w-9 px-2",
        sm: "h-8 min-w-8 px-1.5",
        lg: "h-10 min-w-10 px-2.5",
      },
    },
    compoundVariants: [{ variant: "pill", className: "h-auto min-h-7 px-3 py-1 coarse:min-h-10" }],
    defaultVariants: { variant: "default", size: "default" },
  },
);

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants> & {
    /** Decorative icon before the accessible text label; follows inherited direction. */
    leadingIcon?: React.ReactNode;
  }
>(({ className, variant, size, leadingIcon, children, ...props }, ref) => (
  <TogglePrimitive.Root ref={ref} className={cn(toggleVariants({ variant, size }), className)} {...props}>
    {leadingIcon ? <span aria-hidden="true" className="inline-flex size-4 shrink-0 items-center justify-center">{leadingIcon}</span> : null}
    {children}
  </TogglePrimitive.Root>
));
Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
