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
 * - **Today** and **Now** are hero numbers with units (today leads when both are given), or not shown
 *   when not supplied.
 * - **Last N days** is a bar chart: day labels under the bars, bars proportional to the value, the
 *   `todayIndex` bar (default: the last) solid and earlier days as tints, the peak and today labelled with
 *   their numbers. A day with no reading is a hollow dashed stub with the words "No data" in the table —
 *   never a zero-height bar passed off as a measurement. `dailyBaseline` draws a dashed reference line with
 *   a label. `comparison` (e.g. last week's days) adds a ghost tick per day and one sentence — "12% above
 *   last week" — with an arrow and words. The chart is decorative (`aria-hidden`): a text summary and a
 *   real `<table>` in a `<details>` carry the same numbers, and colour is never the only cue.
 * - **Top contributors** are a list — numeric share (`42%`), value and a bar. The number is the data;
 *   the bar is `aria-hidden` decoration.
 * - **High consumption** appears when `summary.flags` says so, as a triangle and words, quoting only
 *   what the summary carries (the limit, or the percentage over baseline).
 *
 * The bars flow with the writing direction, so under RTL the oldest day is at the right — the same way a
 * timeline reads in that locale — and every offset is logical.
 */
export interface EnergySummaryProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** `summarizeEnergy(...)` for the period the breakdown covers. */
  summary: KinetixEnergySummary;
  /** Instantaneous draw, e.g. `{ value: 1.2, unit: "kW" }`. */
  current?: { value: number; unit: string };
  /** Today's total, in `summary.unit`. */
  today?: number;
  /** Daily totals, oldest first; `null` for a day with no data. Drives the chart. */
  days?: readonly (number | null | undefined)[];
  /** Names for the days, same order as `days`. Defaults to "Day 1", "Day 2", … */
  dayLabels?: readonly string[];
  /** Heading for the breakdown. Defaults to "Top contributors". */
  breakdownLabel?: string;
  /** Decimal places for values. Defaults to 1. */
  precision?: number;
  /** Index in `days` that is "today" and drawn solid. Defaults to the last day. Pass -1 to emphasise none. */
  todayIndex?: number;
  /** A typical day's value, in `summary.unit`. Draws a dashed reference line across the chart. */
  dailyBaseline?: number;
  /** Label for the reference line. Defaults to "Typical day". */
  dailyBaselineLabel?: string;
  /**
   * A comparison period, day for day — e.g. `{ label: "last week", days: [...] }`. Each day gets a ghost
   * tick at the comparison value, and a sentence says how the totals compare. Days where either side has
   * no data are left out of the comparison rather than counted as zero.
   */
  comparison?: { label: string; days: readonly (number | null | undefined)[] };
}

const usable = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;

const EnergySummary = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, EnergySummaryProps>(
  (
    { summary, current, today, days, dayLabels, breakdownLabel = "Top contributors", precision = 1, todayIndex, dailyBaseline, dailyBaselineLabel, comparison, className, ...props },
    ref,
  ) => {
    // `toFixed` throws a RangeError outside 0–100 and on NaN-derived counts; a public prop must not be able to take the card down.
    const digits = Number.isFinite(precision) ? Math.min(20, Math.max(0, Math.trunc(precision))) : 1;
    const fmt = (n: number) => n.toFixed(digits);
    const unit = summary.unit;
    const high = summary.flags.includes("high-consumption");
    const usableDays = Array.isArray(days) ? days : [];
    const trend = usableDays.length > 0 ? energyTrend(usableDays) : null;
    const label = (i: number) => dayLabels?.[i] ?? `Day ${i + 1}`;
    const peak = trend?.peakIndex ?? null;
    const todayAt = usableDays.length === 0 ? -1 : todayIndex !== undefined ? todayIndex : usableDays.length - 1;

    const other = comparison && Array.isArray(comparison.days) ? comparison.days : [];
    const baseline = usable(dailyBaseline) ? dailyBaseline : null;
    // One scale for bars, ghost ticks and the reference line, so they can be read against each other.
    const scaleMax = Math.max(0, ...usableDays.filter(usable), ...other.filter(usable), baseline ?? 0);
    const pctOf = (v: number) => (scaleMax === 0 ? 0 : (v / scaleMax) * 100);

    // Compare like with like: only days where both sides measured something.
    let now = 0;
    let before = 0;
    let paired = 0;
    if (comparison) {
      usableDays.forEach((v, i) => {
        const o = other[i];
        if (usable(v) && usable(o)) {
          now += v;
          before += o;
          paired += 1;
        }
      });
    }
    const change = paired > 0 && before > 0 ? Math.round((now / before - 1) * 100) : null;
    const compareText =
      comparison && change !== null
        ? change === 0
          ? `About the same as ${comparison.label}`
          : `${Math.abs(change)}% ${change > 0 ? "above" : "below"} ${comparison.label}`
        : null;

    const chartSummary =
      (trend && trend.days > 0
        ? `Last ${usableDays.length} days: ${fmt(trend.total)} ${unit} in total, ${fmt(trend.average ?? 0)} ${unit} a day on average` +
          (peak !== null ? `, highest on ${label(peak)} at ${fmt(usableDays[peak] as number)} ${unit}` : "") +
          (trend.direction !== "unknown" ? `, ${trend.direction}` : "") +
          (trend.days < usableDays.length ? `. ${usableDays.length - trend.days} ${usableDays.length - trend.days === 1 ? "day has" : "days have"} no data` : "") +
          "."
        : `Last ${usableDays.length} days: no data.`) + (compareText ? ` ${compareText}.` : "");

    const hero = today !== undefined ? "today" : current ? "current" : null;

    return (
      <div ref={ref} data-high={high ? "" : undefined} className={cn("flex min-w-0 flex-col gap-6 font-sans", className)} {...props}>
        {current || today !== undefined ? (
          <dl className="m-0 flex flex-wrap items-end gap-x-10 gap-y-4">
            {current ? (
              <div data-current="" className="flex flex-col gap-1">
                <dt className="text-label-lg text-muted-foreground">Now</dt>
                <dd className={cn("m-0 tabular-nums leading-none text-foreground", hero === "current" ? "text-display-sm" : "text-headline-sm")}>
                  {fmt(current.value)}
                  <span className="text-title-md text-muted-foreground"> {current.unit}</span>
                </dd>
              </div>
            ) : null}
            {today !== undefined ? (
              <div data-today="" className="flex flex-col gap-1">
                <dt className="text-label-lg text-muted-foreground">Today</dt>
                <dd className="m-0 text-display-sm tabular-nums leading-none text-foreground">
                  {fmt(today)}
                  <span className="text-title-md text-muted-foreground"> {unit}</span>
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {high ? (
          <p data-flag="high-consumption" className="m-0 flex items-start gap-2 rounded-xl bg-warning/10 px-3 py-2.5 text-body-md text-foreground">
            <Glyph name="triangle" size={16} className="mt-0.5" />
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
          <div data-chart="" className="flex flex-col gap-3 rounded-2xl bg-muted/40 p-4">
            {compareText ? (
              <p data-comparison="" className="m-0 flex items-center gap-2 text-title-sm text-foreground">
                <Glyph name={change === 0 ? "trend-flat" : (change ?? 0) > 0 ? "trend-up" : "trend-down"} size={16} />
                <span>{compareText}</span>
              </p>
            ) : null}

            {/* Decorative: the sentence below and the table are the accessible form of the same numbers.
                No `dir` override — the bars flow with the page, so RTL mirrors the order of the days. */}
            <div aria-hidden="true" className="flex flex-col gap-1.5">
              <div className="relative flex h-36 items-stretch gap-1.5 sm:gap-2">
                {baseline !== null ? (
                  <div data-baseline="" className="pointer-events-none absolute inset-x-0" style={{ bottom: `${pctOf(baseline)}%` }}>
                    <div className="border-t-2 border-dashed border-foreground/50" />
                  </div>
                ) : null}
                {usableDays.map((v, i) => {
                  const ok = usable(v);
                  const isToday = i === todayAt;
                  const ghost = comparison ? other[i] : undefined;
                  const showValue = ok && (isToday || peak === i);
                  return (
                    <div key={i} className="relative flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                      {showValue ? <span className="text-label-md tabular-nums text-foreground">{fmt(v as number)}</span> : null}
                      <span
                        data-day={i}
                        data-is-today={isToday ? "" : undefined}
                        data-peak={peak === i ? "" : undefined}
                        className={cn(
                          "w-full rounded-t-md",
                          ok ? (isToday ? "bg-primary" : "bg-primary/30") : "h-6 rounded-md border-2 border-dashed border-muted-foreground/60 bg-transparent",
                        )}
                        style={ok ? { height: `${Math.max(4, pctOf(v as number))}%` } : undefined}
                      />
                      {usable(ghost) ? (
                        <span
                          data-ghost={i}
                          className="pointer-events-none absolute inset-x-0 mx-auto h-1 w-3/4 rounded-full bg-foreground/50"
                          style={{ bottom: `calc(${pctOf(ghost)}% - 2px)` }}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-1.5 sm:gap-2">
                {usableDays.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "min-w-0 flex-1 truncate text-center text-label-md",
                      i === todayAt ? "font-semibold text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {label(i)}
                  </span>
                ))}
              </div>
            </div>

            <p aria-hidden="true" className="m-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-label-md text-muted-foreground">
              {todayAt >= 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-primary" />
                  Today
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-primary/30" />
                Earlier days
              </span>
              {comparison && change !== null ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1 w-3 rounded-full bg-foreground/60" />
                  {comparison.label}
                </span>
              ) : null}
              {baseline !== null ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0 w-4 border-t-2 border-dashed border-foreground/50" />
                  {dailyBaselineLabel ?? "Typical day"} {fmt(baseline)} {unit}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm border-2 border-dashed border-muted-foreground/60" />
                No data
              </span>
            </p>

            <p className="m-0 text-body-sm text-muted-foreground">{chartSummary}</p>
            <details data-data-table="" className="text-label-md">
              <summary className="min-h-11 cursor-pointer py-2.5 text-label-lg text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-9 md:py-1.5">
                View data
              </summary>
              <table className="w-full border-collapse text-label-md">
                <caption className="sr-only">Daily energy in {unit}</caption>
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th scope="col" className="py-1 pe-3 text-start font-normal">Day</th>
                    <th scope="col" className="py-1 pe-3 text-start font-normal">Energy</th>
                    {comparison ? <th scope="col" className="py-1 text-start font-normal">{comparison.label}</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {usableDays.map((v, i) => (
                    <tr key={i} className="border-b border-border/60 text-foreground">
                      <th scope="row" className="py-1 pe-3 text-start font-normal">{label(i)}</th>
                      <td className="py-1 pe-3 tabular-nums">{usable(v) ? `${fmt(v)} ${unit}` : "No data"}</td>
                      {comparison ? <td className="py-1 tabular-nums">{usable(other[i]) ? `${fmt(other[i] as number)} ${unit}` : "No data"}</td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          <p className="m-0 text-title-md text-foreground">{breakdownLabel}</p>
          {summary.top.length === 0 ? (
            <p data-empty="" className="m-0 flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-3 text-body-md text-muted-foreground">
              <Glyph name="dash" size={16} />
              No consumption to break down.
            </p>
          ) : (
            <ol aria-label={breakdownLabel} className="m-0 flex list-none flex-col gap-3 p-0">
              {summary.top.map((item) => (
                <li key={item.id} data-share={item.id} className="flex min-w-0 flex-col gap-1.5">
                  <span className="flex items-baseline justify-between gap-3 text-body-md text-foreground">
                    <span className="min-w-0 break-words">{item.label}</span>
                    <span className="shrink-0 tabular-nums">
                      {Math.round(item.share * 100)}% <span className="text-label-md text-muted-foreground">· {fmt(item.value)} {unit}</span>
                    </span>
                  </span>
                  <span aria-hidden="true" className="block h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-primary/70" style={{ width: `${Math.round(item.share * 100)}%` }} />
                  </span>
                </li>
              ))}
            </ol>
          )}
          {summary.ignored > 0 ? (
            <p data-ignored="" className="m-0 text-label-md text-muted-foreground">
              {summary.ignored} {summary.ignored === 1 ? "entry was" : "entries were"} left out because the value was not a usable number.
            </p>
          ) : null}
        </div>
      </div>
    );
  },
), "EnergySummary");

export { EnergySummary };
