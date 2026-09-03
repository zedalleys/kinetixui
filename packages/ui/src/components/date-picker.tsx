"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "../lib/utils";
import { Button } from "./button";
import { Calendar, type CalendarProps } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

/**
 * DatePicker — a text-field trigger + calendar popover. Composes the
 * existing `Popover` + `Calendar`; single-date only — for a range, compose
 * `Calendar mode="range"` directly.
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

    return (
      <div className={cn("flex flex-col gap-1.5 font-sans", className)}>
        {label && <label className="text-label-md font-medium text-foreground">{label}</label>}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              ref={ref}
              type="button"
              variant="Outline"
              disabled={disabled}
              className={cn("w-full justify-start px-3 font-normal", !value && "text-muted-foreground", error && "border-destructive text-destructive")}
            >
              <CalendarIcon className="size-4" />
              {value ? format(value, formatStr) : placeholder}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
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
        {helperText && <p className={cn("text-body-sm", error ? "text-destructive" : "text-muted-foreground")}>{helperText}</p>}
      </div>
    );
  },
);
DatePicker.displayName = "DatePicker";

export { DatePicker };
