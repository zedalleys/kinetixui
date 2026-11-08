"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "../lib/utils";
import { Calendar, type CalendarProps } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

/**
 * DatePicker — a text-field trigger + calendar popover. Composes the
 * existing `Popover` + `Calendar`; single-date only — for a range, compose
 * `Calendar mode="range"` directly.
 *
 *   naming        the trigger's accessible name is the label plus the shown date, the contract
 *                 `DateRangeInput` already states. `label` renders as a `<span>` referenced by
 *                 `aria-labelledby` rather than as a `<label for>`: a `<button>` is labelable, so
 *                 a `<label>` would name the trigger with the label ALONE and drop the selected
 *                 date out of the name, and clicking the label would open the calendar
 *   description   `helperText` is referenced by `aria-describedby`, so the hint and the error
 *                 reach a screen reader instead of only a sighted reader
 */
export interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: boolean;
  disabled?: boolean;
  className?: string;
  formatStr?: string;
  calendarProps?: Omit<CalendarProps, "mode" | "selected" | "onSelect">;
}

const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  ({ value, onChange, placeholder = "Select date", label, helperText, error, disabled, className, formatStr = "PP", calendarProps }, ref) => {
    const [open, setOpen] = React.useState(false);
    const id = React.useId();
    const labelId = `${id}-label`;
    const valueId = `${id}-value`;
    const helperId = `${id}-helper`;

    return (
      <div className={cn("flex flex-col gap-1.5 font-sans", className)}>
        {label && (
          <span id={labelId} className="text-label-md font-medium text-foreground">
            {label}
          </span>
        )}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            {/* A field, not a button: the text-entry contract (TOKENS.md, "Text entry and navigation") as
                DateRangeInput's trigger draws it, so the two date fields and Input share one edge, radius and
                height. It was an Outline Button, whose `--input` edge is 2.2:1 and whose focus left the edge alone. */}
            <button
              ref={ref}
              type="button"
              disabled={disabled}
              aria-labelledby={label ? `${labelId} ${valueId}` : undefined}
              aria-describedby={helperText ? helperId : undefined}
              aria-invalid={error || undefined}
              className={cn(
                "flex min-h-11 w-full min-w-0 items-center gap-2 rounded-field border border-muted-foreground/80 bg-background px-3 py-3 text-start text-body-md text-foreground outline-none transition-[border-color,box-shadow] duration-instant ease-standard focus-visible:border-action focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-disabled [@media(hover:hover)]:hover:border-muted-foreground",
                "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:shadow-focus-destructive",
              )}
            >
              <CalendarIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <span id={valueId} className={cn("min-w-0 [overflow-wrap:anywhere]", !value && "text-muted-foreground")}>
                {value ? format(value, formatStr) : placeholder}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start" aria-labelledby={label ? labelId : undefined}>
            <Calendar
              mode="single"
              selected={value}
              onSelect={(d) => {
                onChange?.(d);
                setOpen(false);
              }}
              {...calendarProps}
            />
          </PopoverContent>
        </Popover>
        {helperText && (
          <p id={helperId} className={cn("text-body-sm", error ? "text-destructive" : "text-muted-foreground")}>
            {helperText}
          </p>
        )}
      </div>
    );
  },
);
DatePicker.displayName = "DatePicker";

export { DatePicker };
