"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 font-sans", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-4",
        month_caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1",
        button_previous: cn(
          buttonVariants({ variant: "Outline", size: "icon" }),
          "absolute left-1 size-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        button_next: cn(
          buttonVariants({ variant: "Outline", size: "icon" }),
          "absolute right-1 size-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        month_grid: "w-full border-collapse space-x-1",
        weekdays: "flex",
        weekday: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
        week: "flex w-full mt-2",
        // Selection state (aria-selected/data-selected) lands on the day cell
        // itself in v10 (not a nested button), so the cell owns the
        // accent background + corner rounding and hands the primary-colored
        // "selected" circle down to `day_button` via a `group` class.
        day: cn(
          "group relative p-0 text-center text-sm focus-within:relative focus-within:z-20 aria-selected:bg-accent",
          props.mode === "range" ? "" : "aria-selected:rounded-md",
        ),
        day_button: cn(
          buttonVariants({ variant: "Ghost", size: "icon" }),
          "size-8 p-0 font-normal group-aria-selected:opacity-100 group-data-[selected=true]:bg-primary group-data-[selected=true]:text-primary-foreground group-data-[selected=true]:hover:bg-primary group-data-[selected=true]:hover:text-primary-foreground group-data-[selected=true]:focus:bg-primary group-data-[selected=true]:focus:text-primary-foreground",
        ),
        range_start: "day-range-start rounded-l-md",
        range_end: "day-range-end rounded-r-md",
        range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        today: "bg-accent text-accent-foreground",
        outside: "day-outside text-muted-foreground aria-selected:text-muted-foreground",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClassName }) =>
          orientation === "right" ? (
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
