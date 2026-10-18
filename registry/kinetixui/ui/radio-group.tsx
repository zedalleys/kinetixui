"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * RadioGroup — from the KinetixUI design source, node 54863:536: 18px circle, 2px border, checked border +
 * dot = `--action`, focus = 2px `--ring` offset.
 *
 * Each item follows the selection-control state contract (TOKENS.md, "Selection controls"), exactly as
 * Checkbox does: a `--muted-foreground` unchecked edge that clears 3:1, an 8% `--foreground` state layer on
 * hover (14% pressed), a dot as the shape cue for checked, `aria-invalid="true"` → `--destructive` edge and
 * dot, a focus ring no other layer can cover, and no response at all while disabled.
 *
 * Motion (MX1b-1b), as in checkbox.tsx: the border and dot colour on `--duration-fast` (selection-state), the
 * state layer on `--duration-instant` (press-feedback). The dot stays mounted and fades on `fast` both ways, so
 * choosing B fades A's dot out as B's fades in. There is only one glyph, so the fade can never show the wrong
 * one. `aria-checked` changes in the same frame as the click; the fade follows it and never holds it back.
 */
const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root ref={ref} className={cn("grid gap-3", className)} {...props} />
));
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      // rem rather than px, for the reason spelled out in checkbox.tsx: at a 200% default font size the
      // 18px dot did not grow while its label did.
      "aspect-square size-[1.125rem] rounded-full border-2 border-muted-foreground text-action outline-none",
      // One literal, so the property list and its per-property tiers cannot be separated by an edit.
      "transition-[color,border-color,box-shadow] ease-standard [transition-duration:var(--duration-fast),var(--duration-fast),var(--duration-instant)]",
      "motion-reduce:transition-none",
      "data-[state=checked]:border-action",
      // `aria-[invalid=true]:`, not `aria-invalid:`, which Tailwind 3 does not define (see checkbox.tsx).
      // `text-` carries the dot, which is `fill-current`.
      "aria-[invalid=true]:border-destructive aria-[invalid=true]:text-destructive",
      "[@media(hover:hover)]:enabled:hover:[box-shadow:0_0_0_5px_hsl(var(--foreground)/0.08)]",
      // Pressed is written twice: bare for touch, and again inside the hover media query, because Tailwind
      // emits media-wrapped utilities after plain ones and the hover layer would otherwise outrank the press.
      "enabled:active:[box-shadow:0_0_0_5px_hsl(var(--foreground)/0.14)]",
      "[@media(hover:hover)]:enabled:active:[box-shadow:0_0_0_5px_hsl(var(--foreground)/0.14)]",
      "[@media(hover:hover)]:enabled:hover:[&[data-state=unchecked]:not([aria-invalid=true])]:border-foreground",
      "focus-visible:!ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-disabled",
      className,
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator
      forceMount
      className={cn(
        "flex items-center justify-center opacity-0 data-[state=checked]:opacity-100",
        "transition-opacity duration-fast ease-standard motion-reduce:transition-none",
      )}
    >
      <Circle className="size-2.5 fill-current" />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
));
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
