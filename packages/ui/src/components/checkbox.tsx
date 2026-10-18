"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "../lib/utils";

/**
 * Checkbox — from the KinetixUI design source, node 54863:483: 18px box, 4px radius, 2px border, checked /
 * indeterminate fill = `--action`, focus = 2px `--ring` offset.
 *
 * It follows the selection-control state contract (TOKENS.md, "Selection controls"):
 *
 *   rest      unchecked boundary `--muted-foreground`, not `--input`. The box is the only thing that says a
 *             checkbox is there, so its edge must clear SC 1.4.11's 3:1 (`--input` is 2.2:1 light / 2.7:1
 *             dark — a tracked exception for field outlines, where the field's fill and label carry it).
 *   hover     a pointer that can hover: a `--foreground` state layer at 8% around the box, and the unchecked
 *             edge darkens to `--foreground`; checked fills step to `--action`/90
 *   pressed   the state layer deepens to 14%; checked fills to `--action`/85
 *   checked   `--action` fill AND a glyph — shape, not only colour
 *   invalid   `aria-invalid="true"` → `--destructive` edge (and fill when checked); the field's error text
 *             is the non-colour cue
 *   focus     the 2px offset ring, `!important` so no hover or pressed layer can cover it
 *   disabled  `--opacity-disabled`, and the hover/pressed layers are keyed on `:enabled`, so it never answers
 *
 * Motion (MX1b-1b) has two tiers on one element, because a transition is timed by the property that changes:
 *
 *   selection-state  fill, border and text colour on `--duration-fast` (200ms): checking, unchecking and
 *                    mixed all move the box's colour over the same 200ms
 *   press-feedback   the state layer (box-shadow) on `--duration-instant` (100ms), so hover and press answer
 *                    at once. The box's own hover/press colour step rides on the colour tier; the layer is the
 *                    immediate answer
 *
 * The glyph is chosen by Radix's state, not by the `checked` prop. Choosing from the prop drew a tick under
 * an uncontrolled `defaultChecked="indeterminate"` while announcing "mixed", because the prop is undefined
 * there. Both glyphs are rendered and the Indicator's own `data-state` shows one; the Indicator stays
 * mounted so it can fade in on `fast`. It leaves at once rather than fading: from mixed to unchecked the
 * glyph left on screen would be the tick, the wrong one. Between checked and mixed the glyph swaps in the
 * same frame as `aria-checked`. Reduced motion removes every transition and lands on the same end state.
 */
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      // 1.125rem, not the 18px it replaces: identical at the default root size, but a reader who raises
      // their browser's default font size scales rem and not px. At 200% the box stayed 18x18 beside a
      // label that doubled — the control shrank by half relative to its own text, and its hit target with it.
      "peer size-[1.125rem] shrink-0 rounded-sm border-2 border-muted-foreground outline-none",
      // One literal, so the property list and its per-property tiers cannot be separated by an edit.
      "transition-[background-color,color,border-color,box-shadow] ease-standard [transition-duration:var(--duration-fast),var(--duration-fast),var(--duration-fast),var(--duration-instant)]",
      "motion-reduce:transition-none",
      "data-[state=checked]:border-action data-[state=checked]:bg-action data-[state=checked]:text-action-foreground",
      "data-[state=indeterminate]:border-action data-[state=indeterminate]:bg-action data-[state=indeterminate]:text-action-foreground",
      // `aria-[invalid=true]:`, not `aria-invalid:` — Tailwind 3 has no `invalid` in its aria variants, so
      // the short form compiled to nothing and an invalid checkbox looked exactly like a valid one.
      "aria-[invalid=true]:border-destructive aria-[invalid=true]:data-[state=checked]:bg-destructive aria-[invalid=true]:data-[state=indeterminate]:bg-destructive",
      // The state layer: the same for every value, so hover and press read the same way checked or not.
      "[@media(hover:hover)]:enabled:hover:[box-shadow:0_0_0_5px_hsl(var(--foreground)/0.08)]",
      // Pressed is written twice: bare for touch, and again inside the hover media query, because Tailwind
      // emits media-wrapped utilities after plain ones and the hover layer would otherwise outrank the press.
      "enabled:active:[box-shadow:0_0_0_5px_hsl(var(--foreground)/0.14)]",
      "[@media(hover:hover)]:enabled:active:[box-shadow:0_0_0_5px_hsl(var(--foreground)/0.14)]",
      // ...and the box itself answers in the colour it already has. Valid only: an invalid box keeps its
      // `--destructive` edge under the pointer, or hovering would erase the one cue the box carries.
      "[@media(hover:hover)]:enabled:hover:[&[data-state=unchecked]:not([aria-invalid=true])]:border-foreground",
      "[@media(hover:hover)]:enabled:hover:[&:is([data-state=checked],[data-state=indeterminate]):not([aria-invalid=true])]:bg-action/90",
      "enabled:active:[&:is([data-state=checked],[data-state=indeterminate]):not([aria-invalid=true])]:bg-action/85",
      "[@media(hover:hover)]:enabled:active:[&:is([data-state=checked],[data-state=indeterminate]):not([aria-invalid=true])]:bg-action/85",
      "focus-visible:!ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-disabled",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      forceMount
      className={cn(
        "group/indicator flex items-center justify-center text-current",
        "opacity-0 data-[state=checked]:opacity-100 data-[state=indeterminate]:opacity-100",
        "transition-opacity duration-fast ease-standard data-[state=unchecked]:transition-none motion-reduce:transition-none",
      )}
    >
      <Check className="size-3 group-data-[state=indeterminate]/indicator:hidden" strokeWidth={3} />
      <Minus className="hidden size-3 group-data-[state=indeterminate]/indicator:block" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
