"use client";

import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cn } from "../lib/utils";

/**
 * SegmentedControl — an iOS-style single-select strip. Functionally
 * `ToggleGroup type="single"`: a thin, documented preset over the same
 * Radix primitive with the segmented look (filled track, raised active segment)
 * instead of `Toggle`'s individually-outlined-button look. `type="single"`
 * is fixed, not exposed — a segmented control that could go fully
 * unselected or multi-select isn't the pattern. Gap-fill addition (not in
 * the original Figma source).
 *
 * Surfaces follow the surface model (TOKENS.md): the track is an inset well, `--surface-grouped` with the
 * Card's half-strength `--border` edge. The chosen segment is the inverse fill, `--foreground` with
 * `--background` text: near-black on the light well, and near-white on the dark one, where a black fill would
 * sink into the near-black track. It used to be a raised `--card` segment, which a light track barely set apart.
 *
 * States (TOKENS.md, "Selection controls"): an unchosen segment has `--muted-foreground` text and answers the
 * pointer with the same `--foreground` state layer the other selection controls use (8% hover, 14% pressed);
 * chosen is the inverse fill, a change of luminance far past 3:1, so it is never hue alone, and under forced
 * colours it is the system `SelectedItem` pair; focus is the ring, offset by a sliver of the well so it stays
 * separate from a near-white chosen fill in dark; disabled is inert.
 */
export type SegmentedControlProps = Omit<ToggleGroupPrimitive.ToggleGroupSingleProps, "type">;

const SegmentedControl = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  SegmentedControlProps
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    type="single"
    className={cn("inline-flex min-w-0 max-w-full flex-wrap items-center rounded-lg border border-border/50 bg-surface-grouped p-1 font-sans", className)}
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
      "inline-flex coarse:min-h-11 flex-1 items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-label-md font-medium text-muted-foreground",
      "transition-[color,background-color,box-shadow] duration-fast ease-standard motion-reduce:transition-none",
      "[@media(hover:hover)]:enabled:hover:data-[state=off]:bg-foreground/[0.08] [@media(hover:hover)]:enabled:hover:data-[state=off]:text-foreground",
      // Pressed is written twice: bare for touch, and again inside the hover media query, because Tailwind
      // emits media-wrapped utilities after plain ones and the hover layer would otherwise outrank the press.
      "enabled:active:data-[state=off]:bg-foreground/[0.14] enabled:active:data-[state=off]:text-foreground",
      "[@media(hover:hover)]:enabled:active:data-[state=off]:bg-foreground/[0.14] [@media(hover:hover)]:enabled:active:data-[state=off]:text-foreground",
      "data-[state=on]:bg-foreground data-[state=on]:text-background data-[state=on]:shadow-sm",
      // Forced colours repaint every fill to Canvas, which would leave the chosen segment marked by nothing.
      "forced-colors:data-[state=on]:[forced-color-adjust:none] forced-colors:data-[state=on]:bg-[SelectedItem] forced-colors:data-[state=on]:text-[SelectedItemText]",
      "outline-none focus-visible:!ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface-grouped forced-colors:focus-visible:[outline:2px_solid_Highlight] forced-colors:focus-visible:outline-offset-[-2px]",
      "disabled:pointer-events-none disabled:opacity-disabled",
      className,
    )}
    {...props}
  />
));
SegmentedControlItem.displayName = "SegmentedControlItem";

export { SegmentedControl, SegmentedControlItem };
