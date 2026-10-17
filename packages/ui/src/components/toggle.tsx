"use client";

import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

/**
 * Two motions on one element, told apart by property rather than by trigger (MOTION.md, roles
 * `selection-state` and `press-feedback`):
 *
 *   selected / unselected   background, text and border colour move on `fast` (200ms)
 *   hover / press           a state layer moves on `instant` (100ms)
 *
 * A CSS transition is timed by the property that changes, not by what changed it, so hover could not
 * keep its old `hover:bg-muted` and still be quicker than selection: both would be `background-color`.
 * The layer is an inset `box-shadow` instead — `foreground` at 8% on hover and 14% on press, the same
 * values as the selection-control contract in TOKENS.md — which paints over the background and under
 * the label. Tailwind's `shadow-*` and `ring-*` share one `box-shadow` through variables, so the layer
 * sits beside the on-state ring rather than replacing it. Hover is keyed on `(hover:hover)` so a tap
 * on a touch screen does not leave it stuck on; press is written twice for the reason Switch gives.
 * `aria-pressed` and `data-state` change at once; only the paint interpolates.
 */
const toggleVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium font-sans",
    // One literal, so the property list and its per-property tiers cannot be separated by an edit.
    "transition-[background-color,color,border-color,box-shadow] ease-standard [transition-duration:var(--duration-fast),var(--duration-fast),var(--duration-fast),var(--duration-instant)]",
    "motion-reduce:transition-none",
    // The resting layer is a transparent INSET shadow, not none: box-shadow only interpolates between lists
    // whose entries agree on `inset`, and the on-state ring is inset, so a non-inset rest would make the
    // layer snap on every selected toggle instead of moving on instant.
    "shadow-[shadow:inset_0_0_0_100vmax_transparent]",
    "[@media(hover:hover)]:enabled:hover:shadow-[inset_0_0_0_100vmax_hsl(var(--foreground)/0.08)]",
    "enabled:active:shadow-[inset_0_0_0_100vmax_hsl(var(--foreground)/0.14)]",
    "[@media(hover:hover)]:enabled:active:shadow-[inset_0_0_0_100vmax_hsl(var(--foreground)/0.14)]",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-disabled",
    "data-[state=on]:bg-accent data-[state=on]:text-accent-foreground data-[state=on]:ring-1 data-[state=on]:ring-inset data-[state=on]:ring-ring",
    // Forced colours replace backgrounds and drop box-shadows, which left on and off identical. The chosen
    // toggle takes the system's own selection pair instead, and the outline stays free for focus.
    // Opting out of adjustment brings author box-shadows and borders back, so the ring and the edge are set
    // to match the system pair too.
    "forced-colors:data-[state=on]:[forced-color-adjust:none] forced-colors:data-[state=on]:bg-[Highlight] forced-colors:data-[state=on]:text-[HighlightText]",
    "forced-colors:data-[state=on]:border-[Highlight] forced-colors:data-[state=on]:ring-0",
    // Focus is an outline in every variant, so it survives forced colours on a chosen toggle as well: the
    // `outline-none` above is a transparent outline, which stays transparent once adjustment is off.
    "forced-colors:focus-visible:[outline:2px_solid_CanvasText] forced-colors:focus-visible:outline-offset-2",
    "[&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-transparent",
        pill: "max-w-full rounded-full border border-border bg-transparent text-label-md data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:ring-0 focus-visible:ring-2",
        // The resting `shadow-sm` is carried into each layer, or hovering would remove the depth.
        outline: [
          "border border-input bg-transparent shadow-[shadow:inset_0_0_0_100vmax_transparent,var(--shadow-sm)]",
          "[@media(hover:hover)]:enabled:hover:shadow-[shadow:inset_0_0_0_100vmax_hsl(var(--foreground)/0.08),var(--shadow-sm)]",
          "enabled:active:shadow-[shadow:inset_0_0_0_100vmax_hsl(var(--foreground)/0.14),var(--shadow-sm)]",
          "[@media(hover:hover)]:enabled:active:shadow-[shadow:inset_0_0_0_100vmax_hsl(var(--foreground)/0.14),var(--shadow-sm)]",
        ].join(" "),
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
