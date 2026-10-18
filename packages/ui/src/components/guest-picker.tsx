"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";
import { NumberInput } from "./number-input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

/**
 * GuestPicker — several counts chosen together and summarised in one field: guests for a hotel (adults,
 * children, infants), travellers for a flight, attendees by ticket type, rooms and guests, seniors and
 * students.
 *
 * It is a composition, not a new control. Each category is a `NumberInput` — the catalogue's quantity
 * contract, with its bounds, `aria-disabled` steppers and announced value — in a `Popover` opened from a
 * trigger that shows the summary. The categories are YOURS: nothing in the base says "adults", because a
 * clinic, a museum and an airline count different people, and a fixed adults/children/infants model is the
 * first thing a second product would have to fork.
 *
 *   per type    `min`, `max` and a description per category ("Ages 2–12", "Under 2, on a lap")
 *   aggregate   `maxTotal` caps the sum (an airline's 9 travellers); every increment is unavailable once it
 *               is reached, and `totalHint` can say why
 *   summary     the trigger shows `formatSummary(value)` — supply it to get "2 adults, 1 child", because
 *               only the product knows its plural rules. The default lists the non-zero categories as
 *               "Adults: 2, Children: 1", which needs no plural rules to be correct
 *   naming      each stepper is named after its category ("Decrease Adults"), so a screen reader user
 *               knows what they are changing; the trigger's name is the field label plus the summary
 *
 * It owns no business rules beyond the bounds you give it — "an infant needs an adult" is a rule for your
 * form's validation, expressed through `min`/`max` you recompute, or an error you show.
 */
export interface GuestCategory {
  /** Stable key in `value`. */
  id: string;
  /** What is counted — "Adults", "Children", "Rooms". Shown and used to name the steppers. */
  label: string;
  /** A qualifier — "Ages 13 or above", "Under 2". */
  description?: string;
  /** Default 0. */
  min?: number;
  /** No upper bound by default (only `maxTotal`). */
  max?: number;
}

export interface GuestPickerProps {
  /** The field's visible label — "Guests", "Travellers". Also names the trigger. */
  label: React.ReactNode;
  categories: GuestCategory[];
  /** Counts keyed by category id. Missing ids read as that category's `min`. */
  value: Record<string, number>;
  onValueChange: (value: Record<string, number>) => void;
  /** Cap on the sum of all categories. */
  maxTotal?: number;
  /** Shown in the panel once `maxTotal` is reached — "You can book up to 9 travellers." */
  totalHint?: React.ReactNode;
  /** Trigger text for the current counts. */
  formatSummary?: (value: Record<string, number>, categories: GuestCategory[]) => string;
  /** Stepper names, for localisation. Defaults: (label) => `Decrease ${label}` / `Increase ${label}`. */
  decrementLabel?: (category: GuestCategory) => string;
  incrementLabel?: (category: GuestCategory) => string;
  disabled?: boolean;
  className?: string;
  /** Extra content at the end of the panel — a "Done" button, a policy note. */
  footer?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const defaultSummary = (value: Record<string, number>, categories: GuestCategory[]) =>
  categories
    .filter((c) => (value[c.id] ?? 0) > 0)
    .map((c) => `${c.label}: ${value[c.id]}`)
    .join(", ");

const GuestPicker = React.forwardRef<HTMLButtonElement, GuestPickerProps>(
  (
    {
      label,
      categories,
      value,
      onValueChange,
      maxTotal,
      totalHint,
      formatSummary = defaultSummary,
      decrementLabel = (c) => `Decrease ${c.label}`,
      incrementLabel = (c) => `Increase ${c.label}`,
      disabled,
      className,
      footer,
      open,
      onOpenChange,
    },
    ref,
  ) => {
    const id = React.useId();
    const labelId = `${id}-label`;
    const summaryId = `${id}-summary`;
    const countOf = (c: GuestCategory) => value[c.id] ?? c.min ?? 0;
    const total = categories.reduce((sum, c) => sum + countOf(c), 0);
    const totalReached = maxTotal != null && total >= maxTotal;

    return (
      <div className={cn("flex min-w-0 flex-col gap-1.5 font-sans", className)}>
        <span id={labelId} className="text-label-md font-medium text-foreground">
          {label}
        </span>
        <Popover open={open} onOpenChange={onOpenChange}>
          <PopoverTrigger asChild>
            <button
              ref={ref}
              type="button"
              disabled={disabled}
              aria-labelledby={`${labelId} ${summaryId}`}
              className="flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-field border border-muted-foreground/80 bg-background px-3 py-3 text-start text-body-md text-foreground outline-none transition-[border-color,box-shadow] duration-instant ease-standard focus-visible:border-action focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-disabled [@media(hover:hover)]:hover:border-muted-foreground"
            >
              <span id={summaryId} className="min-w-0 [overflow-wrap:anywhere]">
                {formatSummary(Object.fromEntries(categories.map((c) => [c.id, countOf(c)])), categories)}
              </span>
              <ChevronDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            // At 2x text the rows can be taller than the room below the trigger; the panel scrolls within
            // the height Radix measured instead of running off screen.
            className="max-h-[var(--radix-popover-content-available-height)] w-80 overflow-y-auto p-0"
            aria-labelledby={labelId}
          >
            <ul className="flex flex-col divide-y divide-border">
              {categories.map((c) => {
                const count = countOf(c);
                // The per-type max, tightened by what the total cap still allows.
                const room = maxTotal != null ? count + Math.max(0, maxTotal - total) : undefined;
                const max = c.max != null && room != null ? Math.min(c.max, room) : (c.max ?? room);
                const descriptionId = `${id}-${c.id}-description`;
                return (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
                    <div className="flex min-w-0 grow basis-32 flex-col">
                      <span className="text-body-md font-medium text-foreground">{c.label}</span>
                      {c.description && (
                        <span id={descriptionId} className="text-body-sm text-muted-foreground">
                          {c.description}
                        </span>
                      )}
                    </div>
                    <NumberInput
                      className="w-32 shrink-0"
                      aria-label={c.label}
                      aria-describedby={c.description ? descriptionId : undefined}
                      value={count}
                      min={c.min ?? 0}
                      max={max}
                      decrementLabel={decrementLabel(c)}
                      incrementLabel={incrementLabel(c)}
                      formatAnnouncement={(n) => `${c.label}: ${n}`}
                      onChange={(n) => onValueChange({ ...value, [c.id]: n })}
                    />
                  </li>
                );
              })}
            </ul>
            {/* Always rendered, so the hint is announced when the cap is reached rather than inserted silently. */}
            <p
              role="status"
              className={cn(
                "text-body-sm text-muted-foreground",
                totalReached && totalHint ? "border-t border-border px-4 py-3" : "sr-only",
              )}
            >
              {totalReached ? totalHint : null}
            </p>
            {footer && <div className="flex flex-col gap-3 border-t border-border px-4 py-3">{footer}</div>}
          </PopoverContent>
        </Popover>
      </div>
    );
  },
);
GuestPicker.displayName = "GuestPicker";

export { GuestPicker };
