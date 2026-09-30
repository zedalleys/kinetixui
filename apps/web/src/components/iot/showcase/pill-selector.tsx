"use client";

/**
 * PillSelector: a room / floor selector as a wrapped row of pills. A radiogroup with roving focus (arrow keys reverse
 * under RTL), 44px tall below `md`, wrapping instead of scrolling. The selected pill is solid primary and also carries
 * a check, so selection is never colour alone.
 */
import * as React from "react";
import { cn } from "@/lib/utils";
import { rovingKeyDown } from "./roving";

export type PillOption = { id: string; label: string; icon?: React.ReactNode; count?: number };

export const PILL_ALL_ID = "all";

export function PillSelector({
  label,
  options,
  value,
  onChange,
  showAll = false,
  allLabel = "All",
  wrap = true,
  className,
}: {
  /** Names the radiogroup. */
  label: string;
  options: readonly PillOption[];
  /** The selected option id; `"all"` selects the "All" pill when `showAll` is on. */
  value: string;
  onChange: (id: string) => void;
  showAll?: boolean;
  allLabel?: string;
  /** Wrap onto more lines (default). When false the pills stay on one line and may overflow the container. */
  wrap?: boolean;
  className?: string;
}) {
  const all: PillOption[] = showAll ? [{ id: PILL_ALL_ID, label: allLabel }, ...options] : [...options];
  const ids = all.map((o) => o.id);
  const selected = ids.includes(value) ? value : ids[0];

  return (
    <div role="radiogroup" aria-label={label} className={cn("flex gap-2", wrap ? "flex-wrap" : "flex-nowrap", className)}>
      {all.map((option) => {
        const on = option.id === selected;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            data-radio-id={option.id}
            onClick={() => onChange(option.id)}
            onKeyDown={(event) => rovingKeyDown(event, ids, selected!, onChange)}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-body-md md:min-h-10",
              "transition-colors duration-fast motion-reduce:transition-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              on ? "bg-primary font-semibold text-primary-foreground shadow-sm" : "bg-card text-foreground shadow-sm hover:bg-muted",
            )}
          >
            {on ? (
              <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
            ) : option.icon ? (
              <span aria-hidden="true" className="text-muted-foreground">
                {option.icon}
              </span>
            ) : null}
            <span>{option.label}</span>
            {option.count !== undefined ? (
              <span className={cn("min-w-5 rounded-full px-1.5 text-center text-label-md tabular-nums", on ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground")}>
                {option.count}
                <span className="sr-only"> devices</span>
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
