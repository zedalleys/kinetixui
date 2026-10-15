"use client";

/**
 * PillSelector: a room / floor / metric selector as a wrapped row of pills, on the library `ToggleGroup`
 * (`type="single"`, the `pill` variant). It is a radiogroup with one tab stop: arrow keys move between pills
 * (reversed under RTL, from the nearest `KinetixDirectionProvider`), Space or Enter chooses one, and a pill cannot
 * be un-chosen. The selected pill is solid primary and also carries a check, so selection is never colour alone.
 */
import * as React from "react";
import { ToggleGroup, ToggleGroupItem } from "@kinetixui/ui";
import { cn } from "@/lib/utils";

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
    <ToggleGroup
      type="single"
      variant="pill"
      aria-label={label}
      value={selected}
      onValueChange={(next) => {
        if (next) onChange(next);
      }}
      className={cn("gap-2", wrap ? "flex-wrap" : "flex-nowrap", className)}
    >
      {all.map((option) => {
        const on = option.id === selected;
        return (
          <ToggleGroupItem key={option.id} value={option.id} className="gap-2">
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
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
