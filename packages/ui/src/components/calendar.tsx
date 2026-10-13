"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { useDirection } from "@radix-ui/react-direction";
import { cn } from "../lib/utils";
import { buttonVariants } from "./button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * Direction: the navigation buttons sit on the inline start/end and range ends round their inline-start/end
 * corners, so the grid, the buttons and a selected range mirror together under RTL. Inside a
 * `KinetixDirectionProvider dir="rtl"` the calendar also swaps the chevrons and passes `dir` to
 * react-day-picker, which makes ArrowLeft/ArrowRight follow the mirrored grid. Without a provider the
 * direction is only known from the DOM, so `dir` is left unset rather than forced to "ltr" — the library's
 * RTL rule (RTL.md) is to wrap the app in the provider.
 */
function Calendar({ className, classNames, showOutsideDays = true, dir, ...props }: CalendarProps) {
  const contextDir = useDirection();
  const resolvedDir = dir ?? (contextDir === "rtl" ? "rtl" : undefined);
  return (
    <DayPicker
      dir={resolvedDir}
      showOutsideDays={showOutsideDays}
      className={cn("p-3 font-sans", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-4",
        month_caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1",
        // Resting-dim/hover-brighten nav icons — numerically the disabled
        // value (0.5) but not a disabled state, so left as a literal rather
        // than forced into --opacity-disabled or --opacity-muted (0.7, which
        // would change the rendered value).
        button_previous: cn(
          buttonVariants({ variant: "Outline", size: "icon" }),
          "absolute start-1 size-7 bg-transparent p-0 opacity-50 hover:opacity-visible",
        ),
        button_next: cn(
          buttonVariants({ variant: "Outline", size: "icon" }),
          "absolute end-1 size-7 bg-transparent p-0 opacity-50 hover:opacity-visible",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
        week: "flex w-full mt-2",
        // Selection state (aria-selected/data-selected) lands on the day cell
        // itself in v10 (not a nested button), so the cell owns the
        // accent background + corner rounding and hands the primary-colored
        // "selected" circle down to `day_button` via a `group` class.
        day: cn(
          "group relative p-0 text-center text-sm focus-within:relative focus-within:z-focus aria-selected:bg-accent",
          props.mode === "range" ? "" : "aria-selected:rounded-md",
        ),
        day_button: cn(
          buttonVariants({ variant: "Ghost", size: "icon" }),
          "size-8 p-0 font-normal group-aria-selected:opacity-visible group-data-[selected=true]:bg-action group-data-[selected=true]:text-action-foreground group-data-[selected=true]:hover:bg-action group-data-[selected=true]:hover:text-action-foreground group-data-[selected=true]:focus:bg-action group-data-[selected=true]:focus:text-action-foreground",
        ),
        range_start: "day-range-start rounded-s-md",
        range_end: "day-range-end rounded-e-md",
        range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        today: "bg-accent text-accent-foreground",
        outside: "day-outside text-muted-foreground aria-selected:text-muted-foreground",
        disabled: "text-muted-foreground opacity-disabled",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        // react-day-picker's default Nav always asks for "left" on previous and "right" on next; under RTL the
        // previous button is on the right, so its chevron must point right (toward the inline start).
        Chevron: ({ orientation, className: chevronClassName }) =>
          (orientation === "right") !== (resolvedDir === "rtl") ? (
            <ChevronRight className={cn("size-4", chevronClassName)} />
          ) : (
            <ChevronLeft className={cn("size-4", chevronClassName)} />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
