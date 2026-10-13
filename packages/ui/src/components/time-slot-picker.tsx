"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Check } from "lucide-react";
import { cn } from "../lib/utils";

/**
 * TimeSlotPicker — choose one time from the slots a product offers: an appointment, a table, a pickup or
 * delivery window, a service booking.
 *
 * It is a radio group, because that is what choosing one of several is: Radix's RadioGroup, with each slot
 * a radio drawn as a tile. That gives the keyboard model for free — Tab enters the group at the selected
 * slot (or the first), arrow keys move through every available slot across groups and wrap, Space selects —
 * and a screen reader hears "11:30, radio button, 3 of 12, checked".
 *
 *   available     a tile
 *   selected      the filled tile, plus a check mark — not colour alone
 *   unavailable   `unavailable: true`: disabled, skipped by the arrow keys, struck through, and its spoken name
 *                 ends with the `unavailableLabel` word ("Unavailable"), so it is not only greyed
 *   limited       `note: "2 left"` — an available slot with a qualifier, shown under the time and read with it
 *   periods       `groups` with a `label` ("Morning", "Afternoon") render as labelled groups inside the one
 *                 radio group, so the arrow keys still cross between them
 *   empty         no available slot at all shows `emptyMessage` instead of a grid of disabled tiles
 *   time zone     `timeZoneLabel` ("Times in Riyadh (GMT+3)") is shown and describes the group. The component
 *                 never converts times; the labels are shown exactly as given
 *
 * Tiles wrap: as many columns as fit at a minimum width in rem, so 200% text or a phone gets fewer, wider
 * tiles instead of overflow. The grid is logical and mirrors under RTL.
 *
 * Availability is the product's business — slots and their states arrive as data; nothing here fetches,
 * holds or releases a slot.
 */
export interface TimeSlot {
  /** Stable value reported to `onValueChange`, e.g. an ISO datetime or a slot id. */
  value: string;
  /** What is shown — "09:30", "9:30 AM", "14:00–16:00". */
  label: string;
  /** The slot cannot be chosen. */
  unavailable?: boolean;
  /** A qualifier under the label — "2 left", "+SAR 15". */
  note?: string;
}

export interface TimeSlotGroup {
  /** Optional period heading — "Morning". */
  label?: string;
  slots: TimeSlot[];
}

export interface TimeSlotPickerProps
  extends Omit<React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>, "children" | "orientation"> {
  /** Names the group — "Pickup time". Required: an unnamed radio group is announced as just "group". */
  label: React.ReactNode;
  groups: TimeSlotGroup[];
  /** Shown when no slot is available. Default "No times are available." */
  emptyMessage?: React.ReactNode;
  /** The time zone the labels are in. Shown, and used as the group's description. */
  timeZoneLabel?: React.ReactNode;
  /** Spoken after an unavailable slot's label. Default "Unavailable". */
  unavailableLabel?: string;
}

const TimeSlotPicker = React.forwardRef<React.ElementRef<typeof RadioGroupPrimitive.Root>, TimeSlotPickerProps>(
  (
    {
      className,
      label,
      groups,
      emptyMessage = "No times are available.",
      timeZoneLabel,
      unavailableLabel = "Unavailable",
      ...props
    },
    ref,
  ) => {
    const id = React.useId();
    const labelId = `${id}-label`;
    const zoneId = `${id}-zone`;
    const hasAvailable = groups.some((g) => g.slots.some((s) => !s.unavailable));

    return (
      <div className={cn("flex min-w-0 flex-col gap-3 font-sans", className)}>
        <div className="flex flex-col gap-0.5">
          <span id={labelId} className="text-label-md font-medium text-foreground">
            {label}
          </span>
          {timeZoneLabel && (
            <span id={zoneId} className="text-body-sm text-muted-foreground">
              {timeZoneLabel}
            </span>
          )}
        </div>
        {hasAvailable ? (
          <RadioGroupPrimitive.Root
            ref={ref}
            aria-labelledby={labelId}
            aria-describedby={timeZoneLabel ? zoneId : undefined}
            loop
            className="flex flex-col gap-4"
            {...props}
          >
            {groups.map((group, gi) => {
              const groupLabelId = `${id}-group-${gi}`;
              return (
                <div
                  key={gi}
                  role={group.label ? "group" : undefined}
                  aria-labelledby={group.label ? groupLabelId : undefined}
                  className="flex flex-col gap-2"
                >
                  {group.label && (
                    <span id={groupLabelId} className="text-label-sm font-medium text-muted-foreground">
                      {group.label}
                    </span>
                  )}
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-2">
                    {group.slots.map((slot) => (
                      <RadioGroupPrimitive.Item
                        key={slot.value}
                        value={slot.value}
                        disabled={slot.unavailable}
                        data-unavailable={slot.unavailable || undefined}
                        className={cn(
                          "group flex min-h-11 min-w-0 flex-col items-center justify-center rounded-md border border-muted-foreground/80 bg-background px-2 py-2 text-center text-foreground outline-none",
                          "transition-[border-color,background-color,box-shadow] duration-instant ease-standard motion-reduce:transition-none",
                          "focus-visible:shadow-focus [@media(hover:hover)]:enabled:hover:border-muted-foreground [@media(hover:hover)]:enabled:hover:bg-muted",
                          "data-[state=checked]:border-action data-[state=checked]:bg-action data-[state=checked]:text-action-foreground [@media(hover:hover)]:data-[state=checked]:enabled:hover:bg-action",
                          "disabled:cursor-not-allowed disabled:border-dashed disabled:border-border disabled:bg-muted disabled:text-muted-foreground",
                        )}
                      >
                        <span className="flex items-center gap-1 text-body-md font-medium tabular-nums group-disabled:line-through">
                          <RadioGroupPrimitive.Indicator aria-hidden>
                            <Check className="size-4 shrink-0" strokeWidth={2.5} />
                          </RadioGroupPrimitive.Indicator>
                          {slot.label}
                        </span>
                        {slot.note && !slot.unavailable && <span className="sr-only">,</span>}
                        {slot.note && !slot.unavailable && " "}
                        {slot.note && !slot.unavailable && (
                          <span className="text-body-sm text-muted-foreground group-data-[state=checked]:text-action-foreground">
                            {slot.note}
                          </span>
                        )}
                        {slot.unavailable && <span className="sr-only">, {unavailableLabel}</span>}
                      </RadioGroupPrimitive.Item>
                    ))}
                  </div>
                </div>
              );
            })}
          </RadioGroupPrimitive.Root>
        ) : (
          <p role="status" className="rounded-md border border-dashed border-border px-4 py-6 text-center text-body-md text-muted-foreground">
            {emptyMessage}
          </p>
        )}
      </div>
    );
  },
);
TimeSlotPicker.displayName = "TimeSlotPicker";

export { TimeSlotPicker };
