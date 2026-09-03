"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Rating — a star rating input / display. Controlled (`value`) or
 * uncontrolled (`defaultValue`); `readOnly` renders a static display, e.g.
 * inside a Card.
 */
const starVariants = cva("transition-colors", {
  variants: {
    size: {
      sm: "size-4",
      md: "size-5",
      lg: "size-6",
    },
  },
  defaultVariants: { size: "md" },
});

export interface RatingProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange">,
    VariantProps<typeof starVariants> {
  value?: number;
  defaultValue?: number;
  max?: number;
  readOnly?: boolean;
  onChange?: (value: number) => void;
}

const Rating = React.forwardRef<HTMLDivElement, RatingProps>(
  ({ className, value, defaultValue = 0, max = 5, size, readOnly = false, onChange, ...props }, ref) => {
    const [internal, setInternal] = React.useState(defaultValue);
    const [hovered, setHovered] = React.useState<number | null>(null);
    const current = value ?? internal;
    const display = hovered ?? current;

    const set = (n: number) => {
      if (readOnly) return;
      setInternal(n);
      onChange?.(n);
    };

    return (
      <div
        ref={ref}
        role={readOnly ? "img" : "radiogroup"}
        aria-label={readOnly ? `Rated ${current} out of ${max}` : "Rating"}
        className={cn("inline-flex items-center gap-0.5", className)}
        onMouseLeave={() => setHovered(null)}
        {...props}
      >
        {Array.from({ length: max }, (_, i) => {
          const n = i + 1;
          const filled = n <= display;
          return (
            <button
              key={n}
              type="button"
              disabled={readOnly}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              aria-pressed={n <= current}
              onMouseEnter={() => !readOnly && setHovered(n)}
              onClick={() => set(n)}
              className={cn(
                "rounded-[2px] outline-none disabled:cursor-default",
                !readOnly && "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              <Star
                className={cn(
                  starVariants({ size }),
                  filled ? "fill-warning text-warning" : "fill-transparent text-muted-foreground",
                )}
              />
            </button>
          );
        })}
      </div>
    );
  },
);
Rating.displayName = "Rating";

export { Rating };
