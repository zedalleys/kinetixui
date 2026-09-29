import type { KinetixAutomationOperator, KinetixAutomationValue } from "../types/automation";
import { describeOperator } from "../functions/automation";

/**
 * Internal helpers shared by `AutomationRuleView` and `AutomationBuilder`.
 *
 * The value *shape* each operator takes (a number, a range, a time of day, …) lives in the headless
 * validator and is not exported, so it is restated here for the two things a UI needs it for: which
 * input to draw, and how to print a value. `validateAutomationRule` remains the source of truth for
 * what is *valid*; this only decides what to show.
 */
export type ValueKind = "number" | "scalar" | "range" | "none" | "time";

export const OPERATOR_VALUE: Readonly<Record<KinetixAutomationOperator, ValueKind>> = {
  lt: "number",
  lte: "number",
  gt: "number",
  gte: "number",
  eq: "scalar",
  neq: "scalar",
  between: "range",
  "changes-to": "scalar",
  "is-detected": "none",
  "after-time": "time",
  "before-time": "time",
};

export const valueKindOf = (operator: string | undefined): ValueKind =>
  operator !== undefined && operator in OPERATOR_VALUE ? OPERATOR_VALUE[operator as KinetixAutomationOperator] : "none";

/** `soil-moisture` → `soil moisture`, the neutral fallback when the product supplies no name. */
export const readable = (id: string): string => id.trim().replace(/[-_]+/g, " ");

const withUnit = (text: string, unit: string | undefined): string => {
  if (!unit) return text;
  // "%" and "°" hug the number; word units ("kPa", "L/min") take a space.
  return `${text}${unit.startsWith("%") || unit.startsWith("°") ? "" : " "}${unit}`;
};

/** A comparison's value as text: `28%`, `10 and 20 kPa`, `06:30`, `on`. Empty for value-less operators. */
export function describeValue(operator: string, value: KinetixAutomationValue | undefined, unit: string | undefined): string {
  if (valueKindOf(operator) === "none" || value === undefined || value === null) return "";
  if (Array.isArray(value)) return `${withUnit(String(value[0]), unit)} and ${withUnit(String(value[1]), unit)}`;
  return withUnit(String(value), unit);
}

export { describeOperator };
