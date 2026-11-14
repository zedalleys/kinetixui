"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, max, ...props }, ref) => {
  // Use the same default and valid range as the primitive so paint and ARIA agree.
  const limit = typeof max === "number" && max > 0 ? max : 100;
  const fraction = typeof value === "number" && value >= 0 && value <= limit && Number.isFinite(value)
    ? value / limit
    : 0;

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      value={value}
      max={max}
      {...props}
    >
      {/* The midpoint of the double-width indicator sits on the track's
          logical start. Scaling around it mirrors with CSS layout direction. */}
      <ProgressPrimitive.Indicator
        className="absolute end-0 top-0 h-full w-[200%] transition-transform duration-base ease-standard motion-reduce:transition-none data-[state=indeterminate]:transition-none"
        style={{ transform: `scaleX(${fraction})` }}
      >
        <span className="absolute end-0 top-0 h-full w-1/2 bg-action" />
      </ProgressPrimitive.Indicator>
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
