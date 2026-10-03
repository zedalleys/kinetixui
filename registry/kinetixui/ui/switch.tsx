"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

/**
 * Switch — from the KinetixUI design source, node 54855:13984: 48×24 pill track, off = `--tertiary`, on =
 * `--action`, 20px `--background` thumb that travels 24px, focus = 2px `--ring` offset.
 *
 * It follows the selection-control state contract (TOKENS.md, "Selection controls"): the same 8% / 14%
 * `--foreground` state layer as Checkbox and Radio on hover and press, the on track steps to `--action`/90
 * under the pointer, the thumb's position is the shape cue for on/off, the focus ring cannot be covered by
 * any other layer, and a disabled switch does not answer the pointer. The off track stays `--tertiary`
 * (2.6:1, a tracked SC 1.4.11 exception in check-contrast.mjs): the thumb and `aria-checked` carry it.
 */
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-6 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent",
      "transition-[background-color,box-shadow] duration-instant ease-standard",
      "data-[state=checked]:bg-action data-[state=unchecked]:bg-tertiary",
      "[@media(hover:hover)]:enabled:hover:[box-shadow:0_0_0_5px_hsl(var(--foreground)/0.08)]",
      // Pressed is written twice: bare for touch, and again inside the hover media query, because Tailwind
      // emits media-wrapped utilities after plain ones and the hover layer would otherwise outrank the press.
      "enabled:active:[box-shadow:0_0_0_5px_hsl(var(--foreground)/0.14)]",
      "[@media(hover:hover)]:enabled:active:[box-shadow:0_0_0_5px_hsl(var(--foreground)/0.14)]",
      "[@media(hover:hover)]:enabled:hover:data-[state=checked]:bg-action/90",
      "focus-visible:outline-none focus-visible:!ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-disabled",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "pointer-events-none block size-5 rounded-full bg-background shadow-lg ring-0 transition-transform duration-instant ease-standard",
        // `translate-x` is physical, so under `dir="rtl"` the thumb travelled the same way as in LTR —
        // away from the start edge it already sat against, and straight off a 48px track (measured: thumb
        // left edge at 50px). An RTL switch turned on showed a filled pill with no thumb in it at all.
        "data-[state=checked]:translate-x-6 data-[state=unchecked]:translate-x-0",
        "rtl:data-[state=checked]:-translate-x-6",
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
