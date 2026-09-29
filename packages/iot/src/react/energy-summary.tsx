import * as React from "react";
import type { KinetixEnergySummary } from "../types/energy";
import { energyTrend } from "../functions/energy";
import { Glyph } from "./glyph";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * EnergySummary — how much, where it went, and whether that is a lot.
 *
 * **Application-provided numbers only.** This package reads no meter and knows no tariff; there is no
 * cost, carbon or forecast here, because each of those needs data it does not have. Hand it a
 * `summarizeEnergy` result for the period, and optionally a current draw, today's total and a run of
 * daily totals.
 *
 * - **Current** and **Today** are stated as numbers with units, or not shown when not supplied.
 * - **Top contributors** are a list — numeric share (`42%`), value and a bar. The number is the data;
 *   the bar is `aria-hidden` decoration.
 * - **Last N days** is a mini bar chart with a text summary (total, average, peak, direction from
 *   `energyTrend`) and a real `<table>` in a `<details>`. A day with no reading is a gap with the words
 *   "No data" in the table, not a zero-height bar passed off as a measurement.
 * - **High consumption** appears when `summary.flags` says so, as a triangle and words, quoting only
 *   what the summary carries (the limit, or the percentage over baseline).
 */
export interface EnergySummaryProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** `summarizeEnergy(...)` for the period the breakdown covers. */
  summary: KinetixEnergySummary;
  /** Instantaneous draw, e.g. `{ value: 1.2, unit: "kW" }`. */
  current?: { value: number; unit: string };
  /** Today's total, in `summary.unit`. */
  today?: number;
  /** Daily totals, oldest first; `null` for a day with no data. Drives the mini chart. */
  days?: readonly (number | null | undefined)[];
  /** Names for the days, same order as `days`. Defaults to "Day 1", "Day 2", … */
  dayLabels?: readonly string[];
  /** Heading for the breakdown. Defaults to "Top contributors". */
  breakdownLabel?: string;
  /** Decimal places for values. Defaults to 1. */
  precision?: number;
}

const EnergySummary = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, EnergySummaryProps>(
  ({ summary, current, today, days, dayLabels, breakdownLabel = "Top contributors", precision = 1, className, ...props }, ref) => {
    // `toFixed` throws a RangeError outside 0–100 and on NaN-derived counts; a public prop must not be able to take the card down.
    const digits = Number.isFinite(precision) ? Math.min(20, Math.max(0, Math.trunc(precision))) : 1;
    const fmt = (n: number) => n.toFixed(digits);
    const unit = summary.unit;
    const high = summary.flags.includes("high-consumption");
    const usableDays = Array.isArray(days) ? days : [];
    const trend = usableDays.length > 0 ? energyTrend(usableDays) : null;
    const label = (i: number) => dayLabels?.[i] ?? `Day ${i + 1}`;
    const peak = trend?.peakIndex ?? null;
    const maxDay = Math.max(0, ...usableDays.map((v) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0)));

    const chartSummary =
      trend && trend.days > 0
        ? `Last ${usableDays.length} days: ${fmt(trend.total)} ${unit} in total, ${fmt(trend.average ?? 0)} ${unit} a day on average` +
          (peak !== null ? `, highest on ${label(peak)} at ${fmt(usableDays[peak] as number)} ${unit}` : "") +
          (trend.direction !== "unknown" ? `, ${trend.direction}` : "") +
          (trend.days < usableDays.length ? `. ${usableDays.length - trend.days} ${usableDays.length - trend.days === 1 ? "day has" : "days have"} no data` : "") +
          "."
        : `Last ${usableDays.length} days: no data.`;

    return (
      <div ref={ref} data-high={high ? "" : undefined} className={cn("flex min-w-0 flex-col gap-4 font-sans", className)} {...props}>
        {current || today !== undefined ? (
          <dl className="m-0 flex flex-wrap gap-x-8 gap-y-2">
            {current ? (
              <div data-current="" className="flex flex-col gap-0.5">
                <dt className="text-label-sm text-muted-foreground">Now</dt>
                <dd className="m-0 text-title-sm tabular-nums text-foreground">
                  {fmt(current.value)} {current.unit}
                </dd>
              </div>
            ) : null}
            {today !== undefined ? (
              <div data-today="" className="flex flex-col gap-0.5">
                <dt className="text-label-sm text-muted-foreground">Today</dt>
                <dd className="m-0 text-title-sm tabular-nums text-foreground">
                  {fmt(today)} {unit}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {high ? (
          <p data-flag="high-consumption" className="flex items-start gap-1.5 text-label-md text-foreground">
            <Glyph name="triangle" size={14} className="mt-0.5" />
            <span>
              High consumption
              {summary.limit !== undefined && summary.total > summary.limit ? ` — ${fmt(summary.total)} ${unit} is over the ${fmt(summary.limit)} ${unit} limit` : ""}
              {summary.limit === undefined && summary.ratioToBaseline !== undefined
                ? ` — ${Math.round((summary.ratioToBaseline - 1) * 100)}% above the baseline of ${fmt(summary.baseline ?? 0)} ${unit}`
                : ""}
              .
            </span>
          </p>
        ) : null}

        {usableDays.length > 0 ? (
          <div data-chart="" className="flex flex-col gap-1.5">
            {/* Decorative: the sentence below and the table are the accessible form of the same numbers. */}
            <div aria-hidden="true" dir="ltr" className="flex h-8 items-end gap-1 text-foreground">
              {usableDays.map((v, i) => {
                const ok = typeof v === "number" && Number.isFinite(v) && v >= 0;
                return (
                  <span
                    key={i}
                    data-day={i}
                    data-peak={peak === i ? "" : undefined}
                    className={cn(
                      "min-w-0 flex-1 rounded-sm",
                      ok ? "bg-foreground/70" : "h-1.5 border border-dashed border-muted-foreground bg-transparent",
                      peak === i && "bg-foreground",
                    )}
                    style={ok ? { height: `${Math.max(6, maxDay === 0 ? 6 : ((v as number) / maxDay) * 100)}%` } : undefined}
                  />
                );
              })}
            </div>
            <p className="text-label-sm text-muted-foreground">{chartSummary}</p>
            <details data-data-table="" className="text-label-sm">
              <summary className="min-h-9 cursor-pointer py-1.5 text-label-md text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                View data
              </summary>
              <table className="w-full border-collapse text-label-sm">
                <caption className="sr-only">Daily energy in {unit}</caption>
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th scope="col" className="py-1 pe-3 text-start font-normal">Day</th>
                    <th scope="col" className="py-1 text-start font-normal">Energy</th>
                  </tr>
                </thead>
                <tbody>
                  {usableDays.map((v, i) => (
                    <tr key={i} className="border-b border-border/60 text-foreground">
                      <th scope="row" className="py-1 pe-3 text-start font-normal">{label(i)}</th>
                      <td className="py-1 tabular-nums">{typeof v === "number" && Number.isFinite(v) && v >= 0 ? `${fmt(v)} ${unit}` : "No data"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <p className="text-label-md text-foreground">{breakdownLabel}</p>
          {summary.top.length === 0 ? (
            <p data-empty="" className="text-label-sm text-muted-foreground">No consumption to break down.</p>
          ) : (
            <ol aria-label={breakdownLabel} className="m-0 flex list-none flex-col gap-2 p-0">
              {summary.top.map((item) => (
                <li key={item.id} data-share={item.id} className="flex min-w-0 flex-col gap-1">
                  <span className="flex items-baseline justify-between gap-3 text-label-md text-foreground">
                    <span className="min-w-0 break-words">{item.label}</span>
                    <span className="shrink-0 tabular-nums">
                      {Math.round(item.share * 100)}% <span className="text-label-sm text-muted-foreground">· {fmt(item.value)} {unit}</span>
                    </span>
                  </span>
                  <span aria-hidden="true" className="block h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-foreground/70" style={{ width: `${Math.round(item.share * 100)}%` }} />
                  </span>
                </li>
              ))}
            </ol>
          )}
          {summary.ignored > 0 ? (
            <p data-ignored="" className="text-label-sm text-muted-foreground">
              {summary.ignored} {summary.ignored === 1 ? "entry was" : "entries were"} left out because the value was not a usable number.
            </p>
          ) : null}
        </div>
      </div>
    );
  },
), "EnergySummary");

export { EnergySummary };
