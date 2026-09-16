"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { GripVertical } from "lucide-react";
import { cn } from "../lib/utils";

/**
 * ComparisonSlider — a drag handle wiping between two stacked layers
 * (before/after image, redesign preview, …). Built on Radix's `Slider`
 * for the drag + keyboard + ARIA behavior (a plain 0–100 value), but
 * fully custom-drawn: Radix's own `Range` fill can't be reused as the
 * divider line (it's Radix's own inline `width` style, which would win
 * over any Tailwind width class), so the line is a separate element
 * positioned from the same value instead. Gap-fill addition (not in the
 * original Figma source).
 */
export interface ComparisonSliderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  before: React.ReactNode;
  after: React.ReactNode;
  beforeLabel?: React.ReactNode;
  afterLabel?: React.ReactNode;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
}

const ComparisonSlider = React.forwardRef<HTMLDivElement, ComparisonSliderProps>(
  (
    { className, before, after, beforeLabel, afterLabel, value, defaultValue = 50, onValueChange, ...props },
    ref,
  ) => {
    const [internal, setInternal] = React.useState(defaultValue);
    const current = value ?? internal;

    const handleChange = (vals: number[]) => {
      const v = vals[0] ?? current;
      setInternal(v);
      onValueChange?.(v);
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative aspect-video w-full select-none overflow-hidden rounded-md bg-muted font-sans",
          "[&_img]:size-full [&_img]:object-cover [&_video]:size-full [&_video]:object-cover",
          className,
        )}
        {...props}
      >
        <div className="absolute inset-0">{before}</div>
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 0 0 ${current}%)` }}>
          {after}
        </div>

        <div
          aria-hidden
          className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-background shadow-sm"
          style={{ left: `${current}%` }}
        />

        {beforeLabel && (
          <span className="absolute left-2 top-2 rounded bg-background/80 px-2 py-0.5 text-label-sm text-foreground backdrop-blur-sm">
            {beforeLabel}
          </span>
        )}
        {afterLabel && (
          <span className="absolute right-2 top-2 rounded bg-background/80 px-2 py-0.5 text-label-sm text-foreground backdrop-blur-sm">
            {afterLabel}
          </span>
        )}

        <SliderPrimitive.Root
          value={[current]}
          onValueChange={handleChange}
          max={100}
          step={0.1}
          className="absolute inset-0 flex touch-none items-center"
        >
          <SliderPrimitive.Track className="relative h-full w-full grow bg-transparent">
            <SliderPrimitive.Range className="absolute h-full bg-transparent" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            aria-label="Comparison position"
            className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-background bg-background/90 text-foreground shadow-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <GripVertical className="size-4" />
          </SliderPrimitive.Thumb>
        </SliderPrimitive.Root>
      </div>
    );
  },
);
ComparisonSlider.displayName = "ComparisonSlider";

export { ComparisonSlider };
