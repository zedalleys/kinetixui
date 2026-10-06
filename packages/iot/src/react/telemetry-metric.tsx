import * as React from "react";
import type { KinetixCapabilitySupport } from "../types/device-state";
import type { KinetixFreshness } from "../types/monitoring";
import type { KinetixMetricThresholds, KinetixReadingState, KinetixTelemetryQuality } from "../types/telemetry";
import { describeMetric, getMetricDefinition } from "../functions/metrics";
import { describeReadingAge, describeTelemetryReading, resolveReadingDelta } from "../functions/reading";
import { describeReadingState, evaluateReading, formatTelemetryValue } from "../functions/telemetry";
import { LastSync } from "./last-sync";
import { MetricStatus } from "./metric-status";
import { Glyph } from "./glyph";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * TelemetryMetric — one reading: label, value, unit, how fresh, and whether to believe it.
 *
 * The label, unit and decimal places default from the metric registry, and the status comes from
 * `evaluateReading`, so a product that supplies only `metric="soil-moisture"` and a value gets a
 * sensible tile. Everything can be overridden.
 *
 * **A number is only shown as current when it is.**
 * - `unavailable` (no usable value, or quality `missing`/`error`): the value slot reads "—", never 0.
 * - `stale` (older than `staleAfterMs`, or undated): the number is kept but labelled "Last known" and
 *   set in the muted tone — useful, but not presented as the present. The trend arrow is dropped for
 *   both, because a direction is a claim about now.
 *
 * The state is a glyph and a word (`MetricStatus`); the trend is an arrow and a word ("Rising").
 *
 * **M3: generic readings.** `metric` is optional: a product with a reading the registry has never heard
 * of (glucose, RPM, a pump's line pressure) passes `label`, `value` and `unit` and gets the same rules.
 *
 * - **Four kinds of "no number".** `unknown` (no value reported: "Unknown"), `unavailable` (quality
 *   `missing`/`error`, or `unavailable`: "Unavailable"), `unsupported` (`support="unsupported"`: "Not
 *   supported by this device") and a value that is there but stale. None of them renders a 0.
 * - **Delta only with evidence.** `previous` draws "+0.4 °C vs previous reading" only when both readings
 *   are numbers and the current one is current; one sample has no change, and none is invented.
 * - **No interpretation.** A reference range (`range`) is printed, never judged; status comes from
 *   thresholds the product passes or from `severity` / `statusLabel`. No unit is assumed, no decimals are
 *   assumed (`formatValue` owns the number's text), and nothing is read medically.
 * - **One phrase.** Screen readers get one sentence ("Glucose 5.8 mmol/L, normal, measured 2 minutes
 *   ago"); the visual parts are hidden from them, so nothing is read twice. `unitLabel` speaks a unit
 *   ("degrees Celsius") where the symbol would be read badly.
 */
export interface TelemetryMetricProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Metric key. Supplies the default label, unit, precision and thresholds from the registry. Optional since M3. */
  metric?: string;
  /** Display name, already localised. Defaults to the registry label for `metric`. */
  label?: string;
  value: number | null | undefined;
  unit?: string;
  /** The unit as spoken, e.g. "degrees Celsius" for `°C`. Defaults to `unit`. Screen readers only. */
  unitLabel?: string;
  quality?: KinetixTelemetryQuality;
  precision?: number;
  /** The number's text, e.g. a locale formatter or a fixed format. Overrides `precision`. Not called without a value. */
  formatValue?: (value: number) => string;
  /** When the value was measured. Drives the freshness stamp and, with `staleAfterMs`, staleness. */
  timestamp?: string | Date | number | null;
  /** Older than this, or undated, is `stale`. Omit to skip the age check. */
  staleAfterMs?: number;
  /** An answer the product already has. `stale` marks the value stale; `fresh` skips the age check. */
  freshness?: KinetixFreshness;
  thresholds?: KinetixMetricThresholds | null;
  /** The product's own verdict for a current reading. Wins over thresholds. */
  severity?: "normal" | "warning" | "critical";
  /** The word for the status, e.g. "In range". Defaults to the package word for the state. */
  statusLabel?: string;
  /** The previous reading, for a delta. No delta is drawn without one. */
  previous?: number | null;
  /** What `previous` was. Defaults to "previous reading". */
  previousLabel?: string;
  /** A reference range, printed as given and never judged. `label` defaults to "Reference". */
  range?: { min?: number | null; max?: number | null; label?: string };
  /** From `resolveCapabilitySupport`. `unsupported` renders "Not supported by this device", never a value. */
  support?: KinetixCapabilitySupport;
  /** The source says it cannot give a value right now (sensor fault, out of range). */
  unavailable?: boolean;
  /** Direction of change, from `summarizeSeries`. Shown as an arrow and a word, only for a current reading. */
  trend?: "rising" | "falling" | "steady" | "unknown";
  /** Reference instant. Pass a fixed value for deterministic rendering. */
  now?: string | Date | number | null;
  /** Hide the status glyph and word for a plain `normal` reading. Attention states always show. */
  quietWhenNormal?: boolean;
  /**
   * `md` (default) is a compact tile; `lg` and `xl` draw the value as a hero numeral
   * (`text-headline-lg` / `text-display-sm`) with the unit smaller and muted. The status glyph and word
   * are kept at every size.
   */
  size?: "md" | "lg" | "xl";
}

const VALUE_SIZE = { md: "text-title-lg", lg: "text-headline-lg", xl: "text-display-sm" } as const;

const TREND: Record<"rising" | "falling" | "steady", { glyph: "trend-up" | "trend-down" | "trend-flat"; word: string }> = {
  rising: { glyph: "trend-up", word: "Rising" },
  falling: { glyph: "trend-down", word: "Falling" },
  steady: { glyph: "trend-flat", word: "Steady" },
};

const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

const TelemetryMetric = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, TelemetryMetricProps>(
  (
    {
      metric,
      label,
      value,
      unit,
      unitLabel,
      quality,
      precision,
      formatValue,
      timestamp,
      staleAfterMs,
      freshness,
      thresholds,
      severity,
      statusLabel,
      previous,
      previousLabel = "previous reading",
      range,
      support,
      unavailable: unavailableProp = false,
      trend,
      now,
      quietWhenNormal = false,
      size = "md",
      className,
      ...props
    },
    ref,
  ) => {
    const definition = metric ? getMetricDefinition(metric) : undefined;
    const name = label ?? (metric ? describeMetric(metric) : "Reading");
    const shownUnit = unit ?? definition?.unit;
    const digits = precision ?? definition?.decimals;
    const unsupported = support === "unsupported";
    // An explicit freshness answer replaces the age check; `fresh` and `unknown` skip it.
    const evaluation = evaluateReading({
      value: unsupported || unavailableProp ? null : value,
      quality,
      timestamp,
      metric,
      thresholds,
      now,
      staleAfterMs: freshness === undefined ? staleAfterMs : undefined,
    });
    let state: KinetixReadingState = evaluation.state;
    if (state !== "unavailable" && freshness === "stale") state = "stale";
    if (state !== "unavailable" && state !== "stale" && severity) state = severity;
    const noValue = state === "unavailable";
    const availability = unsupported
      ? "unsupported"
      : !noValue
        ? "known"
        : unavailableProp || quality === "missing" || quality === "error"
          ? "unavailable"
          : "unknown";
    const stale = state === "stale";
    const numberText = (v: number) => (formatValue ? formatValue(v) : formatTelemetryValue({ value: v }, { precision: digits }));
    const valueText = !noValue && finite(value) ? numberText(value) : null;
    const shown = valueText === null ? "—" : shownUnit ? `${valueText} ${shownUnit}` : valueText;
    // A hero numeral prints its unit separately so the unit can be smaller. Never after "—".
    const heroUnit = size !== "md" && valueText !== null ? shownUnit : undefined;
    const trendInfo = !noValue && !stale && trend && trend !== "unknown" ? TREND[trend] : null;
    // A delta is a comparison of two real readings; it is drawn only for a current value.
    const delta = !noValue && !stale ? resolveReadingDelta(value, previous) : null;
    const deltaText = delta
      ? `${delta.direction === "up" ? "+" : delta.direction === "down" ? "−" : "±"}${numberText(Math.abs(delta.value))}${shownUnit ? ` ${shownUnit}` : ""}`
      : null;
    const rangeMin = finite(range?.min) ? numberText(range!.min as number) : null;
    const rangeMax = finite(range?.max) ? numberText(range!.max as number) : null;
    const rangeText = rangeMin !== null || rangeMax !== null
      ? `${range?.label ?? "Reference"} ${rangeMin !== null && rangeMax !== null ? `${rangeMin}–${rangeMax}` : rangeMin !== null ? `≥ ${rangeMin}` : `≤ ${rangeMax}`}${shownUnit ? ` ${shownUnit}` : ""}`
      : null;
    const spokenRange =
      rangeMin !== null && rangeMax !== null
        ? `${rangeMin} to ${rangeMax}`
        : rangeMin !== null
          ? `at least ${rangeMin}`
          : `at most ${rangeMax}`;
    const statusWord =
      availability === "unknown" ? "Unknown" : availability === "unsupported" ? "Not supported" : state === "stale" || noValue ? undefined : statusLabel;
    const hideStatus = quietWhenNormal && state === "normal" && !statusLabel;
    const hasTimestamp = timestamp !== undefined && timestamp !== null;

    const spokenUnit = unitLabel ?? shownUnit;
    const sentence = describeTelemetryReading({
      label: name,
      availability,
      valueText: valueText ?? undefined,
      unitText: spokenUnit,
      status: hideStatus ? undefined : (statusLabel ?? describeReadingState(state)).toLowerCase(),
      stale,
      deltaText: delta
        ? delta.direction === "none"
          ? `unchanged from ${previousLabel}`
          : `${delta.direction} ${numberText(Math.abs(delta.value))}${spokenUnit ? ` ${spokenUnit}` : ""} from ${previousLabel}`
        : undefined,
      // A one-sided range is spoken as one bound. "4 to any" would name a limit the product never gave.
      rangeText: rangeText ? `${(range?.label ?? "Reference").toLowerCase()} ${spokenRange}` : undefined,
      ageText: hasTimestamp && !unsupported ? describeReadingAge(timestamp, { now }) || undefined : undefined,
    });

    return (
      <div
        ref={ref}
        data-reading-state={state}
        data-value-state={availability}
        className={cn("flex min-w-0 flex-col font-sans", size === "md" ? "gap-1" : "gap-2", className)}
        {...props}
      >
        <span className="sr-only" data-reading-sentence="">
          {sentence}
        </span>
        <span aria-hidden="true" className={cn("break-words text-muted-foreground", size === "md" ? "text-label-lg" : "text-body-md")}>
          {name}
        </span>
        {unsupported ? (
          <span aria-hidden="true" data-unsupported="" className="break-words text-body-md text-muted-foreground">
            Not supported by this device
          </span>
        ) : (
          <span
            aria-hidden="true"
            className={cn(
              "break-words tabular-nums",
              VALUE_SIZE[size],
              size !== "md" && "leading-none",
              noValue || stale ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {/* A measurement is a number and its unit as one left-to-right run: in an RTL page the unit's neutral
                characters ("°C", "%", "L/min") would otherwise reorder around the digits. */}
            <bdi dir="ltr">
              {heroUnit !== undefined ? (
                <>
                  {valueText}
                  <span className={cn("text-muted-foreground", size === "xl" ? "text-title-lg" : "text-title-md")}> {heroUnit}</span>
                </>
              ) : (
                shown
              )}
            </bdi>
          </span>
        )}
        {stale ? (
          <span aria-hidden="true" data-last-known="" className="text-label-md text-muted-foreground">
            Last known value
          </span>
        ) : null}
        <span aria-hidden="true" className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {hideStatus || unsupported ? null : <MetricStatus state={state} label={statusWord} />}
          {trendInfo ? (
            <span data-trend={trend} className="inline-flex items-center gap-1 text-label-md text-muted-foreground">
              <Glyph name={trendInfo.glyph} size={14} />
              <span>{trendInfo.word}</span>
            </span>
          ) : null}
          {deltaText ? (
            <span data-delta={delta!.direction} className="inline-flex items-center gap-1 text-label-md text-muted-foreground">
              <bdi dir="ltr" className="tabular-nums">
                {deltaText}
              </bdi>{" "}
              <span>vs {previousLabel}</span>
            </span>
          ) : null}
          {hasTimestamp && !unsupported ? <LastSync value={timestamp} now={now} className="text-label-md" /> : null}
        </span>
        {rangeText && !unsupported ? (
          <span aria-hidden="true" data-range="" className="text-label-md text-muted-foreground">
            <bdi dir="ltr">{rangeText}</bdi>
          </span>
        ) : null}
      </div>
    );
  },
), "TelemetryMetric");

export { TelemetryMetric };
