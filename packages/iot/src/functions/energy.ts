import type {
  KinetixEnergyBreakdownItem,
  KinetixEnergyFlag,
  KinetixEnergyShare,
  KinetixEnergySummary,
  KinetixEnergyTrend,
} from "../types/energy";

/**
 * Energy helpers over numbers the application provides. No meter, tariff, cost or forecast.
 */

export type SummarizeEnergyOptions = {
  /** Display unit for every value. Defaults to `"kWh"`. */
  unit?: string;
  /** How many top consumers to list. Defaults to 3. */
  topCount?: number;
  /** What this period normally looks like, in the same unit. */
  baseline?: number;
  /** A ceiling for the period. Exceeding it is `high-consumption`. */
  limit?: number;
  /** How far above baseline counts as high, as a fraction. Defaults to 0.1 (10%). */
  baselineTolerance?: number;
};

const positive = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;

/**
 * Total, per-device share and top consumers for a period, and whether it looks high.
 *
 * `high-consumption` is set when the total **exceeds** `limit`, or exceeds `baseline` by more than
 * `baselineTolerance`. Both are the caller's numbers; with neither, nothing is flagged, since "high"
 * is relative to something this package does not know. Invalid items (negative, `NaN`, infinite) are
 * excluded and counted in `ignored` instead of poisoning the total.
 */
export function summarizeEnergy(
  items: readonly KinetixEnergyBreakdownItem[] | null | undefined,
  options: SummarizeEnergyOptions = {},
): KinetixEnergySummary {
  const unit = options.unit ?? "kWh";
  const valid: KinetixEnergyBreakdownItem[] = [];
  let ignored = 0;
  for (const item of Array.isArray(items) ? items : []) {
    if (item && typeof item.value === "number" && Number.isFinite(item.value) && item.value >= 0) valid.push(item);
    else ignored += 1;
  }

  const total = valid.reduce((sum, item) => sum + item.value, 0);
  const ranked: KinetixEnergyShare[] = valid
    .map((item, index) => ({ item, index }))
    .sort((a, b) => b.item.value - a.item.value || a.index - b.index)
    .map(({ item }, i) => {
      const share: KinetixEnergyShare = {
        id: item.id,
        label: item.label ?? item.id,
        value: item.value,
        share: total === 0 ? 0 : item.value / total,
        rank: i + 1,
      };
      if (item.deviceId !== undefined) share.deviceId = item.deviceId;
      return share;
    });

  const topCount = typeof options.topCount === "number" && Number.isFinite(options.topCount) ? Math.max(0, Math.trunc(options.topCount)) : 3;
  const summary: KinetixEnergySummary = { total, unit, items: ranked, top: ranked.slice(0, topCount), ignored, flags: [] };

  const flags: KinetixEnergyFlag[] = [];
  if (positive(options.limit)) {
    summary.limit = options.limit;
    if (total > options.limit) flags.push("high-consumption");
  }
  if (positive(options.baseline)) {
    summary.baseline = options.baseline;
    summary.deltaFromBaseline = total - options.baseline;
    summary.ratioToBaseline = total / options.baseline;
    const tolerance = typeof options.baselineTolerance === "number" && Number.isFinite(options.baselineTolerance) && options.baselineTolerance >= 0 ? options.baselineTolerance : 0.1;
    if (total > options.baseline * (1 + tolerance) && !flags.includes("high-consumption")) flags.push("high-consumption");
  }
  summary.flags = flags;
  return summary;
}

export type EnergyTrendOptions = {
  /** Relative change below which the trend is `steady`. Defaults to 0.05 (5%). */
  tolerance?: number;
};

/**
 * The direction of a run of daily values (a 7-day array, oldest first; `null`/`NaN` for a missing day).
 *
 * Compares the mean of the earlier half against the later half — for seven days, days 1–3 against
 * 5–7, the middle day left out — so one odd day cannot flip the answer the way a first-versus-last
 * comparison would. Fewer than two usable days, or nothing on one side, is `unknown`.
 */
export function energyTrend(days: readonly (number | null | undefined)[] | null | undefined, options: EnergyTrendOptions = {}): KinetixEnergyTrend {
  const list = Array.isArray(days) ? days : [];
  const usable = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;

  let total = 0;
  let count = 0;
  let peakIndex: number | null = null;
  list.forEach((v, i) => {
    if (!usable(v)) return;
    total += v;
    count += 1;
    if (peakIndex === null || v > (list[peakIndex] as number)) peakIndex = i;
  });

  const half = Math.floor(list.length / 2);
  const mean = (values: readonly (number | null | undefined)[]) => {
    const ok = values.filter(usable);
    return ok.length === 0 ? null : ok.reduce((a, b) => a + b, 0) / ok.length;
  };
  const early = mean(list.slice(0, half));
  const late = mean(list.slice(list.length - half));

  let direction: KinetixEnergyTrend["direction"] = "unknown";
  let changeRatio: number | null = null;
  if (count >= 2 && early !== null && late !== null) {
    const tolerance = typeof options.tolerance === "number" && Number.isFinite(options.tolerance) && options.tolerance >= 0 ? options.tolerance : 0.05;
    if (early === 0) {
      direction = late > 0 ? "rising" : "steady";
    } else {
      changeRatio = late / early - 1;
      direction = changeRatio > tolerance ? "rising" : changeRatio < -tolerance ? "falling" : "steady";
    }
  }

  return { direction, changeRatio, total, average: count === 0 ? null : total / count, days: count, peakIndex };
}
