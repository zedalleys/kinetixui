"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      // Radix gives this `role="dialog"`, and a dialog without an accessible name is announced as just
      // "dialog" — WCAG 4.1.2. Nothing here named it, so every Popover in the library shipped that way:
      // found by running axe against the surface while it was open, which until this slice nothing did.
      // The fallback is deliberately only a fallback. A caller who passes `aria-label` or points at a
      // heading with `aria-labelledby` keeps theirs, and should: "Popover" tells a screen-reader user
      // what kind of thing opened and nothing about what is in it. It is the floor, not the goal.
      aria-label={props["aria-label"] ?? (props["aria-labelledby"] ? undefined : "Popover")}
      className={cn(
        // A surface wider than the window is not usable. Measured at 390px with the root font size
        // doubled: this came out 576px, because `w-72` is rem and doubles with the text, and the
        // context menu 416px — pushing the page 186px sideways, so a reader who asked for large text
        // had to scroll horizontally to see a popover. Radix publishes the room it has as
        // `--radix-popper-available-width`, so the cap is its own measurement rather than a viewport
        // guess, and it binds only when the surface would otherwise overflow.
        "z-overlay w-72 max-w-[var(--radix-popper-available-width)] rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none font-sans",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=open]:duration-fast data-[state=open]:ease-enter data-[state=closed]:duration-instant data-[state=closed]:ease-exit",
        // `data-side` is the side Radix RESOLVED the surface onto — it is already physical, having been
        // flipped for direction and collisions before it reaches the DOM. The slide must therefore stay
        // physical to travel away from the trigger; a logical class here would invert the animation under
        // RTL and make the surface fly the wrong way. // rtl-ok
        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
