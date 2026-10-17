"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "../lib/utils";

/**
 * The element a screen reader treats as the slider is the thumb (`role="slider"`), not the root, so everything
 * that describes it belongs on the thumb: its name (`aria-label`/`aria-labelledby`), a spoken value
 * (`aria-valuetext`, when the number alone does not say it) and its disabled state. Radix marks a disabled root
 * with `aria-disabled`, but the root has no role and a thumb does not inherit it, so the thumb says so itself.
 *
 * Disabled is drawn from `data-disabled`, which Radix sets on the root and the thumb: both are spans, and a span
 * never matches `:disabled`, so `disabled:` utilities would never apply.
 */
const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(
  (
    { className, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, "aria-valuetext": ariaValueText, ...props },
    ref,
  ) => (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center data-[disabled]:cursor-not-allowed data-[disabled]:opacity-disabled",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted">
        <SliderPrimitive.Range className="absolute h-full bg-action" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-valuetext={ariaValueText}
        aria-disabled={props.disabled || undefined}
        className="block size-4 rounded-full border border-action/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </SliderPrimitive.Root>
  ),
);
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
