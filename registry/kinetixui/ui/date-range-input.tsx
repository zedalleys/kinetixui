"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Calendar, type CalendarProps } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * DateRangeInput — a start and an end CALENDAR DATE in one field: a stay, a rental, a report period, a
 * leave request. A trigger that shows the range, and the existing `Calendar` in range mode in a `Popover`.
 * DatePicker stays single-date; this is its range sibling, built from the same two primitives rather than
 * a second calendar.
 *
 * ── Values are calendar dates, not instants ─────────────────────────────────
 *
 * `value` is `{ start?: "YYYY-MM-DD"; end?: "YYYY-MM-DD" }`. A check-in date is the same date for a guest in
 * Riyadh and a hotel system in UTC; a `Date` object is an instant, and converting one across a time zone
 * moves a check-in to the previous day — the classic booking bug. So the API never hands you a `Date`, and
 * nothing here converts between time zones. Internally a string becomes a local-midnight `Date` only to
 * talk to the calendar, and comes straight back as the same string. If you need times, that is a
 * different field (DateTimeRangeInput is a separate roadmap row).
 *
 *   constraints   `min` / `max` (ISO dates, inclusive) and `isDateDisabled(iso)` for closed or sold-out days.
 *                 Disabled days are announced as unavailable by the calendar, not only greyed
 *   ordering      the calendar keeps start ≤ end; a click before the start moves the start
 *   open-ended    `start` without `end` is a valid in-progress value. Whether your form ACCEPTS it is your
 *                 validation; the trigger shows it as "14 Mar 2026 – …" (`openEndLabel`)
 *   display       formatted with `Intl.DateTimeFormat` in `locale` (default: the reader's), or your own
 *                 `formatDate`. The two dates are separate bidi runs, so the range reads in the page's
 *                 direction and neither date's digits are reordered
 *   naming        the trigger's accessible name is the label plus the shown range
 */
export interface DateRangeValue {
  /** Inclusive start, "YYYY-MM-DD". */
  start?: string;
  /** Inclusive end, "YYYY-MM-DD". */
  end?: string;
}

export interface DateRangeInputProps {
  label: React.ReactNode;
  value: DateRangeValue;
  onValueChange: (value: DateRangeValue) => void;
  /** Earliest selectable date, inclusive. */
  min?: string;
  /** Latest selectable date, inclusive. */
  max?: string;
  /** Return true for a date that cannot be chosen. */
  isDateDisabled?: (iso: string) => boolean;
  /** BCP 47 locale for the default display format. */
  locale?: string;
  /** Replaces the default `Intl.DateTimeFormat` display of one date. */
  formatDate?: (iso: string) => string;
  /** Trigger text with no selection. Default "Select dates". */
  placeholder?: string;
  /** Shown in place of a missing end date. Default "…". */
  openEndLabel?: string;
  /** Months shown side by side. Default 1. */
  numberOfMonths?: number;
  disabled?: boolean;
  /** Marks the trigger invalid; pair it with a visible message referenced by `aria-describedby`. */
  invalid?: boolean;
  "aria-describedby"?: string;
  className?: string;
  /** Passed to the Calendar, e.g. `weekStartsOn`. Selection props are owned by this component. */
  calendarProps?: Omit<CalendarProps, "mode" | "selected" | "onSelect" | "disabled" | "numberOfMonths" | "required">;
}

/** "YYYY-MM-DD" → a local-midnight Date. Only for talking to the calendar. */
function isoToLocalDate(iso: string): Date {
  const [y = 0, m = 1, d = 1] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** A local Date → "YYYY-MM-DD", from its local calendar fields (never toISOString, which is UTC). */
function localDateToIso(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

const DateRangeInput = React.forwardRef<HTMLButtonElement, DateRangeInputProps>(
  (
    {
      label,
      value,
      onValueChange,
      min,
      max,
      isDateDisabled,
      locale,
      formatDate,
      placeholder = "Select dates",
      openEndLabel = "…",
      numberOfMonths = 1,
      disabled,
      invalid,
      "aria-describedby": describedBy,
      className,
      calendarProps,
    },
    ref,
  ) => {
    const id = React.useId();
    const labelId = `${id}-label`;
    const valueId = `${id}-value`;
    const [open, setOpen] = React.useState(false);

    const format = React.useMemo(() => {
      if (formatDate) return formatDate;
      const f = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" });
      return (iso: string) => f.format(isoToLocalDate(iso));
    }, [formatDate, locale]);

    const selected: DateRange | undefined = value.start
      ? { from: isoToLocalDate(value.start), to: value.end ? isoToLocalDate(value.end) : undefined }
      : undefined;

    const disabledMatchers = [
      ...(min ? [{ before: isoToLocalDate(min) }] : []),
      ...(max ? [{ after: isoToLocalDate(max) }] : []),
      ...(isDateDisabled ? [(date: Date) => isDateDisabled(localDateToIso(date))] : []),
    ];

    return (
      <div className={cn("flex min-w-0 flex-col gap-1.5 font-sans", className)}>
        <span id={labelId} className="text-label-md font-medium text-foreground">
          {label}
        </span>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              ref={ref}
              type="button"
              disabled={disabled}
              aria-labelledby={`${labelId} ${valueId}`}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              className={cn(
                "flex min-h-11 w-full min-w-0 items-center gap-2 rounded-md border border-muted-foreground/80 bg-background px-3 py-2 text-start text-body-md outline-none transition-[border-color,box-shadow] duration-instant ease-standard focus-visible:border-action focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-disabled [@media(hover:hover)]:hover:border-muted-foreground",
                "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:shadow-focus-destructive",
              )}
            >
              <CalendarIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <span id={valueId} className={cn("min-w-0 [overflow-wrap:anywhere]", !value.start && "text-muted-foreground")}>
                {value.start ? (
                  <>
                    <bdi data-slot="date-range-start">{format(value.start)}</bdi>
                    {" – "}
                    <bdi data-slot="date-range-end">{value.end ? format(value.end) : openEndLabel}</bdi>
                  </>
                ) : (
                  placeholder
                )}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0" aria-labelledby={labelId}>
            <Calendar
              mode="range"
              numberOfMonths={numberOfMonths}
              selected={selected}
              defaultMonth={selected?.from ?? (min ? isoToLocalDate(min) : undefined)}
              startMonth={min ? isoToLocalDate(min) : undefined}
              endMonth={max ? isoToLocalDate(max) : undefined}
              disabled={disabledMatchers}
              onSelect={(range) => {
                const start = range?.from ? localDateToIso(range.from) : undefined;
                let end = range?.to ? localDateToIso(range.to) : undefined;
                // react-day-picker answers a first click with from = to = that day. Reported as is, the field
                // would claim a finished one-day range before the reader picked an end, so a first click is an
                // open range; clicking the same day again is what makes a one-day range.
                if (start && end === start && !(value.start === start && !value.end)) end = undefined;
                onValueChange({ start, end });
                if (start && end) setOpen(false);
              }}
              {...calendarProps}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  },
);
DateRangeInput.displayName = "DateRangeInput";

export { DateRangeInput };
