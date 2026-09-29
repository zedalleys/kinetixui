/**
 * The energy model — application-supplied numbers only.
 *
 * This package reads no meter and knows no tariff. A product that has per-device consumption for a
 * period hands it over; these types carry it to a summary. There is no billing, cost, carbon or
 * forecast here, all of which are claims that need data this module does not have.
 */

export type KinetixEnergyBreakdownItem = {
  id: string;
  /** Display name. Falls back to the id. */
  label?: string;
  deviceId?: string;
  /** Consumption for the period, in the summary's unit. Negative and non-finite values are ignored. */
  value: number;
};

/** A flag on a summary. Open-ended for growth; `high-consumption` is the only one produced today. */
export type KinetixEnergyFlag = "high-consumption";

export type KinetixEnergyShare = {
  id: string;
  label: string;
  deviceId?: string;
  value: number;
  /** `value / total`, 0–1. 0 when the total is 0, never NaN. */
  share: number;
  /** 1 = biggest consumer. */
  rank: number;
};

export type KinetixEnergySummary = {
  total: number;
  unit: string;
  /** Every valid item, biggest first; ties keep input order. */
  items: KinetixEnergyShare[];
  /** The first `topCount` of `items`. */
  top: KinetixEnergyShare[];
  /** Items dropped for a negative or non-finite value. */
  ignored: number;
  baseline?: number;
  limit?: number;
  /** `total - baseline`, when a baseline was given. */
  deltaFromBaseline?: number;
  /** `total / baseline`, when a positive baseline was given. */
  ratioToBaseline?: number;
  flags: KinetixEnergyFlag[];
};

export type KinetixEnergyTrendDirection = "rising" | "falling" | "steady" | "unknown";

export type KinetixEnergyTrend = {
  direction: KinetixEnergyTrendDirection;
  /** Late-half mean relative to early-half mean, minus 1 (`0.2` = 20% higher). `null` when undefined. */
  changeRatio: number | null;
  total: number;
  average: number | null;
  /** Number of days with a usable value. */
  days: number;
  /** Index into the input of the highest day, or `null`. */
  peakIndex: number | null;
};
