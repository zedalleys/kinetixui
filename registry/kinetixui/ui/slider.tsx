"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

/**
 * The element a screen reader treats as the slider is the thumb (`role="slider"`), not the root, so everything
 * that describes it belongs on the thumb: its name (`aria-label`/`aria-labelledby`), a spoken value
 * (`aria-valuetext`, when the number alone does not say it) and its disabled state. Radix marks a disabled root
 * with `aria-disabled`, but the root has no role and a thumb does not inherit it, so the thumb says so itself.
 *
 * Disabled is drawn from `data-disabled`, which Radix sets on the root and the thumb: both are spans, and a span
 * never matches `:disabled`, so `disabled:` utilities would never apply.
 *
 * Radix draws one thumb per `<Thumb>` child, not per value, so a range (`defaultValue={[20, 80]}`) needs one thumb
 * for each value or the values past the first have no handle to drag, focus or read. With more than one thumb a
 * single name cannot tell them apart, so the name moves to the root as a `role="group"` and each thumb keeps the
 * name Radix gives it by position ("Minimum"/"Maximum", or "Value 1 of 3"). A single `aria-valuetext` string can
 * only describe one value, so it is applied to a single thumb only.
 */
const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(
  (
    {
      className,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      "aria-valuetext": ariaValueText,
      ...props
    },
    ref,
  ) => {
    // Radix reads `defaultValue` once, so an uncontrolled Slider keeps its first count even if `defaultValue` later
    // changes; a controlled one follows `value`. Counting a later `defaultValue` would draw a thumb with no value and
    // move the name to a group around the one thumb that is still there.
    const [uncontrolledCount] = React.useState(() => (props.defaultValue ?? [props.min ?? 0]).length);
    const count = Math.max(1, props.value ? props.value.length : uncontrolledCount);
    const range = count > 1;
    return (
      <SliderPrimitive.Root
        ref={ref}
        role={range ? "group" : undefined}
        aria-label={range ? ariaLabel : undefined}
        aria-labelledby={range ? ariaLabelledBy : undefined}
        className={cn(
          "relative flex w-full touch-none select-none items-center data-[disabled]:cursor-not-allowed data-[disabled]:opacity-disabled",
          className,
        )}
        {...props}
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted">
          <SliderPrimitive.Range className="absolute h-full bg-action" />
        </SliderPrimitive.Track>
        {Array.from({ length: count }, (_, index) => (
          <SliderPrimitive.Thumb
            key={index}
            // Radix spreads these after its own position name, so on a range they must be absent, not undefined
            {...(range
              ? {}
              : {
                  "aria-label": ariaLabel,
                  "aria-labelledby": ariaLabelledBy,
                  "aria-valuetext": ariaValueText,
                })}
            aria-disabled={props.disabled || undefined}
            className="block size-4 rounded-full border border-action/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        ))}
      </SliderPrimitive.Root>
    );
  },
);
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
