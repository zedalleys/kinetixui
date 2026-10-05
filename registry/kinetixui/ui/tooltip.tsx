"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";
import { withDirectionalPortal } from "@/components/ui/direction-provider";

const TooltipPortal = withDirectionalPortal(TooltipPrimitive.Portal);
const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPortal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
    // Capped to the room Radix reports it has, so large text cannot push the surface past the window —
    // see the note in popover.tsx for the measurement that prompted it.
        "z-overlay max-w-[var(--radix-popper-available-width)] overflow-hidden rounded-md bg-action px-3 py-1.5 text-xs text-action-foreground font-sans",
        // Timing stays in the same string as the animation it times, so a reader (and the motion
        // contract test) can see both at once.
        "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-instant ease-enter data-[state=closed]:ease-exit",
        // `data-side` is the side Radix RESOLVED the surface onto — it is already physical, having been
        // flipped for direction and collisions before it reaches the DOM. The slide must therefore stay
        // physical to travel away from the trigger; a logical class here would invert the animation under
        // RTL and make the surface fly the wrong way. // rtl-ok
        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  </TooltipPortal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
