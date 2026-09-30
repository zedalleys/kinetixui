"use client";

/**
 * DateStrip: a seven-day selector. Deterministic: dates are ISO strings read in UTC and the caller supplies `now`, so
 * nothing here reads the clock. A radiogroup with roving focus (arrow keys reverse under RTL). Each day's accessible
 * name is words: "Thursday 14, 3 events, today".
 */
import * as React from "react";
import { cn } from "@/lib/utils";
import { rovingKeyDown } from "./roving";

export type DateStripDay = { id: string; /** ISO date, e.g. "2026-03-14" */ date: string; hasEvents?: boolean; count?: number };

const utc = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`);

export function DateStrip({
  label,
  days,
  value,
  onChange,
  locale = "en",
  now,
  className,
}: {
  /** Names the radiogroup, e.g. "Activity day". */
  label: string;
  days: readonly DateStripDay[];
  value: string;
  onChange: (id: string) => void;
  locale?: string;
  /** ISO date treated as "today" (adds the word to the name and a mark). Never read from the clock. */
  now?: string;
  className?: string;
}) {
  const ids = days.map((d) => d.id);
  const selected = ids.includes(value) ? value : ids[0]!;
  const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" });
  const short = fmt({ weekday: "short" });
  const long = fmt({ weekday: "long" });
  const num = fmt({ day: "numeric" });

  return (
    <div role="radiogroup" aria-label={label} className={cn("grid grid-cols-7 gap-1 rounded-2xl bg-muted/60 p-1", className)}>
      {days.map((day) => {
        const date = utc(day.date);
        const events = day.count ?? (day.hasEvents ? 1 : 0);
        const isToday = now !== undefined && day.date.slice(0, 10) === now.slice(0, 10);
        const on = day.id === selected;
        const name = [`${long.format(date)} ${num.format(date)}`, events ? `${events} ${events === 1 ? "event" : "events"}` : null, isToday ? "today" : null].filter(Boolean).join(", ");
        return (
          <button
            key={day.id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={name}
            tabIndex={on ? 0 : -1}
            data-radio-id={day.id}
            onClick={() => onChange(day.id)}
            onKeyDown={(event) => rovingKeyDown(event, ids, selected, onChange)}
            className={cn(
              "flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5",
              "transition-colors duration-fast motion-reduce:transition-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              on ? "bg-card font-semibold text-foreground shadow-sm" : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
            )}
          >
            <span aria-hidden="true" className="text-title-md tabular-nums">
              {num.format(date)}
            </span>
            <span aria-hidden="true" className="truncate text-label-md font-normal">
              {short.format(date)}
            </span>
            <span aria-hidden="true" className="flex min-h-4 items-center">
              {events > 1 && day.count !== undefined ? (
                <span className="rounded-full bg-primary px-1.5 text-label-md tabular-nums text-primary-foreground">{events}</span>
              ) : events ? (
                <span className="size-1.5 rounded-full bg-primary" />
              ) : isToday ? (
                <span className="h-0.5 w-3 rounded-full bg-muted-foreground/50" />
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
