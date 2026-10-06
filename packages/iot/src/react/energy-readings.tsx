import * as React from "react";
import { TelemetryMetric, type TelemetryMetricProps } from "./telemetry-metric";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * The metric form of `EnergySummary` (M3), kept in its own module and not exported from the barrel.
 *
 * A composition of `TelemetryMetric`s and nothing else: every rule about unknown, stale, unavailable,
 * unsupported, deltas and accessible phrases is TelemetryMetric's, so energy cannot drift from the rest.
 * There is no energy model here, no tariff and no arithmetic: a cost is a number the product computed
 * and formats itself (`formatValue`), and a period is the product's own words.
 */

/** One reading in an energy summary: TelemetryMetric's data props, and a key for lists. */
export type EnergyReading = Pick<
  TelemetryMetricProps,
  | "label"
  | "value"
  | "unit"
  | "unitLabel"
  | "quality"
  | "precision"
  | "formatValue"
  | "timestamp"
  | "staleAfterMs"
  | "freshness"
  | "thresholds"
  | "severity"
  | "statusLabel"
  | "previous"
  | "previousLabel"
  | "range"
  | "support"
  | "unavailable"
  | "trend"
> & { key?: string };

export type EnergyReadingsProps = Omit<React.HTMLAttributes<HTMLDivElement>, "children"> & {
  /** The period the summary covers, in the product's words: "Last 7 days", "This shift", "Since sunrise". */
  period?: string;
  /** Instantaneous draw (e.g. kW). */
  power?: EnergyReading;
  /** Energy over the period (e.g. kWh, MJ). */
  energy?: EnergyReading;
  /** Cost over the period, computed by the product. Pass `formatValue` for the currency. */
  cost?: EnergyReading;
  /** Anything else the product tracks: peak demand, runtime, power factor, solar share. */
  metrics?: readonly EnergyReading[];
  now?: string | Date | number | null;
};

const DEFAULT_LABEL = { power: "Power now", energy: "Energy", cost: "Cost" } as const;

export const EnergyReadings = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, EnergyReadingsProps>(
  ({ period, power, energy, cost, metrics, now, className, ...props }, ref) => {
    const primary = (
      [
        ["power", power],
        ["energy", energy],
        ["cost", cost],
      ] as const
    ).filter((entry): entry is readonly ["power" | "energy" | "cost", EnergyReading] => entry[1] !== undefined);
    const secondary = Array.isArray(metrics) ? metrics : [];
    return (
      <div ref={ref} data-presentation="metrics" className={cn("flex min-w-0 flex-col gap-4 font-sans", className)} {...props}>
        {period ? <p data-period="" className="m-0 text-label-lg text-muted-foreground">{period}</p> : null}
        {primary.length > 0 ? (
          <ul aria-label={period ? `Energy summary, ${period}` : "Energy summary"} className="m-0 flex list-none flex-wrap gap-x-8 gap-y-4 p-0">
            {primary.map(([slot, reading]) => {
              const rest = { ...reading };
              delete rest.key;
              return (
                <li key={slot} data-energy-slot={slot} className="min-w-0 basis-40 grow">
                  <TelemetryMetric {...rest} label={reading.label ?? DEFAULT_LABEL[slot]} now={now} size="lg" />
                </li>
              );
            })}
          </ul>
        ) : null}
        {secondary.length > 0 ? (
          <ul aria-label="More readings" className="m-0 flex list-none flex-wrap gap-x-6 gap-y-3 border-t border-border/60 p-0 pt-4">
            {secondary.map((reading, index) => {
              const { key, ...rest } = reading;
              return (
                <li key={key ?? `${reading.label ?? "reading"}-${index}`} data-energy-slot="metric" className="min-w-0 basis-32 grow">
                  <TelemetryMetric {...rest} now={now} />
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    );
  },
), "EnergyReadings");
