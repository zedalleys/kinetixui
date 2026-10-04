"use client";

import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cn } from "../lib/utils";

/**
 * SegmentedControl — an iOS-style single-select strip. Functionally
 * `ToggleGroup type="single"`: a thin, documented preset over the same
 * Radix primitive with the segmented look (`Tabs`' `TabsList`/
 * `TabsTrigger` visual treatment — filled track, raised active segment)
 * instead of `Toggle`'s individually-outlined-button look. `type="single"`
 * is fixed, not exposed — a segmented control that could go fully
 * unselected or multi-select isn't the pattern. Gap-fill addition (not in
 * the original Figma source).
 *
 * Surfaces follow the surface model (TOKENS.md): the track is an inset well, `--surface-grouped`, and the
 * chosen segment is a small raised surface on it — `--card`, the Card's half-strength `--border` edge and
 * `sm` depth. The track used to be `--muted` with a `--background` segment, which in dark mode put the
 * chosen segment BELOW its track (`--background` is the darkest surface), so it read as a hole.
 *
 * States (TOKENS.md, "Selection controls"): an unchosen segment answers the pointer with the same
 * `--foreground` state layer the other selection controls use (8% hover, 14% pressed) and `--foreground`
 * text; chosen is surface + edge + depth + `--foreground` text, so it is never colour alone; focus is the
 * ring; disabled is inert.
 */
export type SegmentedControlProps = Omit<ToggleGroupPrimitive.ToggleGroupSingleProps, "type">;

const SegmentedControl = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  SegmentedControlProps
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    type="single"
    className={cn("inline-flex items-center rounded-lg bg-surface-grouped p-1 font-sans", className)}
    {...props}
  />
));
SegmentedControl.displayName = "SegmentedControl";

const SegmentedControlItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Item
    ref={ref}
    className={cn(
      "inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-label-md font-medium text-muted-foreground",
      "transition-[color,background-color,box-shadow] duration-fast ease-standard",
      "[@media(hover:hover)]:enabled:hover:data-[state=off]:bg-foreground/[0.08] [@media(hover:hover)]:enabled:hover:data-[state=off]:text-foreground",
      // Pressed is written twice: bare for touch, and again inside the hover media query, because Tailwind
      // emits media-wrapped utilities after plain ones and the hover layer would otherwise outrank the press.
      "enabled:active:data-[state=off]:bg-foreground/[0.14] enabled:active:data-[state=off]:text-foreground",
      "[@media(hover:hover)]:enabled:active:data-[state=off]:bg-foreground/[0.14] [@media(hover:hover)]:enabled:active:data-[state=off]:text-foreground",
      "data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:[box-shadow:inset_0_0_0_1px_hsl(var(--border)/0.5),var(--shadow-sm)]",
      "outline-none focus-visible:!ring-2 focus-visible:ring-ring",
      "disabled:pointer-events-none disabled:opacity-disabled",
      className,
    )}
    {...props}
  />
));
SegmentedControlItem.displayName = "SegmentedControlItem";

export { SegmentedControl, SegmentedControlItem };
