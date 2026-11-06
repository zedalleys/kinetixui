"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Rating — a star rating input / display. Controlled (`value`) or
 * uncontrolled (`defaultValue`); `readOnly` renders a static display, e.g.
 * inside a Card.
 *
 * The interaction contract, which is `kx-rating`'s contract — Angular stated it, asserted it in its
 * unit tests, and recorded that this component disagreed with it:
 *
 *   semantics   a `radiogroup` whose stars are real `<input type="radio">`s named "1 star" …
 *               "5 stars". One of N, chosen, which is what a rating is and what a screen reader
 *               already knows how to announce ("3 stars, radio, checked, 3 of 5"). It used to
 *               render `aria-pressed` BUTTONS inside that radiogroup: a group that claims one
 *               choice, holding five independent toggles, none of them ever checked.
 *   keyboard    one tab stop — the chosen star, or the first when nothing is chosen. The arrow
 *               keys move and choose, mirrored under RTL, because that is the browser's own radio
 *               behaviour rather than ours; Home and End choose the lowest and highest. It used to
 *               be five tab stops with no arrow movement at all.
 *   pointer     clicking a star chooses it; hovering previews the fill without changing the value.
 *   read-only   `role="img"` named "Rated 3 out of 5", the stars hidden from assistive technology
 *               and no tab stop — a rating that is shown, not given.
 *
 * Native radios rather than `role="radio"` on a div: focus movement, the roving tab stop, RTL
 * mirroring and the "3 of 5" position all come from the browser, and an input the pointer cannot
 * see is still an input the keyboard and the accessibility tree can.
 *
 * What is NOT proven anywhere: the arrow-key half, on a real engine. jsdom implements no
 * radio-group navigation, so `rating-radio.test.tsx` exercises it through `user-event`'s emulation
 * of it, and Angular's `kx-rating` spec runs in jsdom too. Both say what the browser is specified
 * to do; neither observes it doing so.
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
    // One radio group per instance, so two Ratings on a page do not share a choice.
    const name = React.useId();

    const set = (n: number) => {
      if (readOnly) return;
      setInternal(n);
      onChange?.(n);
    };

    /**
     * Home and End are the one piece of radio-group keyboard behaviour the browser does not give us.
     * Everything else — arrows, the roving tab stop, RTL — is the native radio's own.
     */
    const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Home" && event.key !== "End") return;
      event.preventDefault();
      const n = event.key === "Home" ? 1 : max;
      const group = event.currentTarget.closest("[data-slot='rating']");
      group?.querySelectorAll<HTMLInputElement>("input[type='radio']")[n - 1]?.focus();
      set(n);
    };

    return (
      <div
        ref={ref}
        data-slot="rating"
        role={readOnly ? "img" : "radiogroup"}
        aria-label={readOnly ? `Rated ${current} out of ${max}` : "Rating"}
        className={cn("inline-flex items-center gap-0.5", className)}
        onMouseLeave={() => setHovered(null)}
        {...props}
      >
        {Array.from({ length: max }, (_, i) => {
          const n = i + 1;
          const filled = n <= display;
          const star = (
            <Star
              aria-hidden
              className={cn(
                starVariants({ size }),
                filled ? "fill-warning text-warning" : "fill-transparent text-muted-foreground",
              )}
            />
          );
          // A rating that is shown, not given: no control, and the stars are decoration behind the
          // group's own "Rated 3 out of 5".
          if (readOnly) {
            return (
              <span key={n} className="rounded-[2px]">
                {star}
              </span>
            );
          }
          return (
            <label
              key={n}
              className="cursor-pointer rounded-[2px] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
              onMouseEnter={() => setHovered(n)}
            >
              <input
                type="radio"
                name={name}
                value={n}
                checked={n === current}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                onChange={() => set(n)}
                onKeyDown={onKeyDown}
                // sr-only rather than hidden or display:none: an input the pointer cannot see is
                // still focusable, still in the accessibility tree, and still the browser's radio.
                className="sr-only"
              />
              {star}
            </label>
          );
        })}
      </div>
    );
  },
);
Rating.displayName = "Rating";

export { Rating };
