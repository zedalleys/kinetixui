"use client";

import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cn } from "@/lib/utils";

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
 * `type="single"` alone does not keep a segment chosen. Radix clears a single-select ToggleGroup when the
 * chosen item is activated again, which leaves the radiogroup with no checked radio and — because
 * `data-[state=on]` is the only thing that paints a segment — nothing marked at all. Every controlled
 * consumer in this repository had written its own `if (next)` guard against that empty value, and the
 * uncontrolled ones could not. So the control holds its own value and refuses to be emptied by its own
 * items: a second activation of the chosen segment is a no-op, and `onValueChange` is never called with
 * `""`. A consumer that genuinely wants nothing chosen can still pass `value=""` itself.
 *
 * Selection follows focus, as it does in any radiogroup: an arrow key moves focus to the next segment
 * AND chooses it, so `onValueChange` fires on an arrow press rather than waiting for Enter. Home, End,
 * wrapping and the reading direction all come from the primitive's roving focus; the answer simply goes
 * wherever that puts focus, which is why there is no direction branch here. A disabled segment is
 * stepped over rather than chosen.
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
>(({ className, value, defaultValue, onValueChange, ...props }, ref) => {
  // Held here rather than left to the primitive, because refusing the empty value is only half the fix:
  // an uncontrolled ToggleGroup clears its own state, so swallowing the callback would still leave the
  // strip blank. A consumer passing `value` stays in charge of it, including an empty one.
  const controlled = value !== undefined;
  const [own, setOwn] = React.useState(defaultValue ?? "");
  const current = controlled ? value : own;
  const choose = (next: string) => {
    // The chosen segment was activated again. A segmented control answers one question, so the answer
    // it already has stands; it is not a toggle that can be switched off.
    if (next === "" || next === current) return;
    if (!controlled) setOwn(next);
    onValueChange?.(next);
  };
  return (
    <ToggleGroupPrimitive.Root
      ref={ref}
      type="single"
      value={current}
      onValueChange={choose}
      // Selection follows focus. The root is a `radiogroup`, and in one of those the ARIA practices have an
      // arrow key move focus AND check what it lands on; Radix's roving focus moves focus alone, so arrowing
      // used to leave the reader on a segment that was not the answer until they pressed Enter as well.
      // React's onFocus is delegated from `focusin`, so this sees the item focus rather than the root's.
      // A pointer press focuses the item it also activates, so the two paths agree rather than fight.
      onFocus={(event) => {
        const segment = (event.target as HTMLElement).closest<HTMLElement>("[data-kx-segment]");
        const next = segment?.dataset.kxSegment;
        // A disabled segment is not an answer this control can give. Roving focus steps over one, but
        // a script can still call focus() on it — jsdom allows exactly that — and landing there must
        // not change the answer the control already has.
        const inert =
          !!segment && (segment.hasAttribute("disabled") || segment.getAttribute("aria-disabled") === "true");
        if (next && !inert) choose(next);
        props.onFocus?.(event);
      }}
      className={cn("inline-flex min-w-0 max-w-full flex-wrap items-center rounded-lg border border-border/50 bg-surface-grouped p-1 font-sans", className)}
      {...props}
    />
  );
});
SegmentedControl.displayName = "SegmentedControl";

const SegmentedControlItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Item
    ref={ref}
    data-kx-segment={props.value}
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
