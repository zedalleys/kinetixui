/**
 * Automation formatting and state.
 *
 * `last-seen.ts` deliberately clamps future timestamps to "just now", because a device reporting a
 * time slightly ahead of the server is clock skew and never news. Scheduling is the opposite case: a
 * *next run* is legitimately in the future, and `millisecondsSince` floors at zero, so reusing it
 * here would render tomorrow's irrigation as "just now". Scheduling therefore gets its own
 * two-directional formatter rather than bending one built on a one-directional assumption.
 *
 * Same rules as the rest of `functions/`: React-free, no `Intl`, no locale data, no date library,
 * `now` injectable on everything so output is testable without mocking the clock.
 */

import type {
  KinetixAutomation,
  KinetixAutomationAction,
  KinetixAutomationCondition,
  KinetixAutomationIssue,
  KinetixAutomationOperator,
  KinetixAutomationRule,
  KinetixAutomationStatus,
  KinetixAutomationValue,
} from "../types/automation";
import { KINETIX_AUTOMATION_OPERATORS } from "../types/automation";
import { parseTimestamp, resolveNow } from "./time";

const SOON_MS = 45_000;
const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

export type RelativeTimeOptions = {
  /** Treat this as the current time. Defaults to the real clock. */
  now?: string | Date | number | null;
  /** Returned when there is no usable timestamp. Defaults to `"Unknown"`. */
  unknownLabel?: string;
};

/**
 * Signed milliseconds from `now` to the timestamp: positive is future, negative is past.
 *
 * Deliberately *not* floored at zero, which is the whole difference between this and
 * `millisecondsSince`. `null` when there is no usable timestamp.
 */
export function millisecondsUntil(
  value: string | Date | number | null | undefined,
  now?: string | Date | number | null,
): number | null {
  const at = parseTimestamp(value ?? null);
  if (!at) return null;
  return at.getTime() - resolveNow(now);
}

/**
 * Short form, both tenses: `in 4h`, `5m ago`, `now`.
 *
 * One function for both directions on purpose — a caller formatting an automation's times should not
 * have to know which side of `now` each one falls on, and a schedule that has just slipped past its
 * due time flips from `in 1m` to `1m ago` without the caller doing anything.
 *
 * Lowercase, because every caller composes it into a phrase ("Next run in 4h"). The same ladder and
 * the same day-cap as `formatLastSeen`, for the same reasons.
 */
export function formatRelativeTime(
  value: string | Date | number | null | undefined,
  options: RelativeTimeOptions = {},
): string {
  const delta = millisecondsUntil(value, options.now);
  if (delta === null) return options.unknownLabel ?? "Unknown";
  const magnitude = Math.abs(delta);
  if (magnitude < SOON_MS) return "now";

  const amount =
    magnitude < HOUR_MS
      ? `${Math.floor(magnitude / MINUTE_MS)}m`
      : magnitude < DAY_MS
        ? `${Math.floor(magnitude / HOUR_MS)}h`
        : `${Math.floor(magnitude / DAY_MS)}d`;

  return delta > 0 ? `in ${amount}` : `${amount} ago`;
}

/** Long form, for accessible labels: `in 4 hours`, `5 minutes ago`, `just now`. */
export function describeRelativeTime(
  value: string | Date | number | null | undefined,
  options: RelativeTimeOptions = {},
): string {
  const delta = millisecondsUntil(value, options.now);
  if (delta === null) return options.unknownLabel ?? "Unknown";
  const magnitude = Math.abs(delta);
  if (magnitude < SOON_MS) return "just now";

  const [count, noun] =
    magnitude < HOUR_MS
      ? ([Math.floor(magnitude / MINUTE_MS), "minute"] as const)
      : magnitude < DAY_MS
        ? ([Math.floor(magnitude / HOUR_MS), "hour"] as const)
        : ([Math.floor(magnitude / DAY_MS), "day"] as const);

  const phrase = `${count} ${noun}${count === 1 ? "" : "s"}`;
  return delta > 0 ? `in ${phrase}` : `${phrase} ago`;
}

/**
 * A sentence for an automation's current state, for accessible labels and summaries.
 *
 * `enabled` is separate from `status` because the two disagree in a state worth naming: an
 * automation can be `idle` and disarmed, which reads as "Off", not "Idle".
 */
export function describeAutomationStatus(status: KinetixAutomationStatus, enabled = true): string {
  if (!enabled) return "Off";
  switch (status) {
    case "running":
      return "Running now";
    case "failed":
      return "Last run failed";
    case "disabled":
      return "Off";
    default:
      return "Idle";
  }
}

/**
 * Whether an automation can be triggered by hand right now.
 *
 * `running` is excluded so a second press cannot queue a duplicate run. On a lighting scene that
 * would be cosmetic; on an irrigation valve or a door lock it is not.
 */
export function canRunAutomation(automation: Pick<KinetixAutomation, "status" | "enabled">): boolean {
  return automation.enabled && automation.status !== "running" && automation.status !== "disabled";
}

/**
 * Comparator putting automations that need a human first: failed, then running, then the rest.
 *
 * Returns 0 for everything within a band rather than tie-breaking on name, matching
 * `compareDeviceAttention`: `.sort` is stable in ES2019, so an equal result preserves whatever order
 * the product already chose, and a tiebreak invented here would override it.
 *
 * ```ts
 * const worstFirst = [...automations].sort(compareAutomationAttention);
 * ```
 */
export function compareAutomationAttention(
  a: Pick<KinetixAutomation, "status"> | null | undefined,
  b: Pick<KinetixAutomation, "status"> | null | undefined,
): number {
  return automationAttentionRank(a?.status) - automationAttentionRank(b?.status);
}

function automationAttentionRank(status: KinetixAutomationStatus | undefined): number {
  switch (status) {
    case "failed":
      return 0;
    case "running":
      return 1;
    default:
      return 2;
  }
}

// ---------------------------------------------------------------------------------------------
// Automation rules (v2): validation, immutable editing helpers and a plain-language summary.
// No engine: nothing here evaluates a rule against live data or runs an action.
// ---------------------------------------------------------------------------------------------

type ValueKind = "number" | "scalar" | "range" | "none" | "time";

/** What each operator needs and how it reads in a sentence. The one table; nothing else switches on an operator. */
const OPERATORS: Readonly<Record<KinetixAutomationOperator, { value: ValueKind; trigger: string; condition: string }>> = {
  lt: { value: "number", trigger: "falls below", condition: "is below" },
  lte: { value: "number", trigger: "falls to or below", condition: "is at or below" },
  gt: { value: "number", trigger: "rises above", condition: "is above" },
  gte: { value: "number", trigger: "rises to or above", condition: "is at or above" },
  eq: { value: "scalar", trigger: "becomes", condition: "is" },
  neq: { value: "scalar", trigger: "becomes anything other than", condition: "is not" },
  between: { value: "range", trigger: "moves into the range", condition: "is between" },
  "changes-to": { value: "scalar", trigger: "changes to", condition: "has changed to" },
  "is-detected": { value: "none", trigger: "is detected", condition: "is detected" },
  "after-time": { value: "time", trigger: "is after", condition: "is after" },
  "before-time": { value: "time", trigger: "is before", condition: "is before" },
};

const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d$/;

const isOperator = (value: unknown): value is KinetixAutomationOperator =>
  typeof value === "string" && (KINETIX_AUTOMATION_OPERATORS as readonly string[]).includes(value);

/** The words for an operator: "falls below" as a trigger, "is below" as a condition. Unknown → the raw string. */
export function describeOperator(operator: KinetixAutomationOperator | string, form: "trigger" | "condition" = "trigger"): string {
  return isOperator(operator) ? OPERATORS[operator][form] : String(operator);
}

const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isBlank = (v: unknown): boolean => typeof v !== "string" || v.trim().length === 0;

function validateComparison(
  item: { subject?: string; operator?: unknown; value?: unknown },
  path: string,
  issues: KinetixAutomationIssue[],
): void {
  if (isBlank(item.subject)) issues.push({ path: `${path}.subject`, code: "missing-subject", message: "Choose what this watches." });
  if (!isOperator(item.operator)) {
    issues.push({ path: `${path}.operator`, code: "unknown-operator", message: `"${String(item.operator)}" is not a supported comparison.` });
    return;
  }
  const kind = OPERATORS[item.operator].value;
  const value = item.value;
  const missing = value === undefined || value === null || value === "";
  const at = `${path}.value`;
  switch (kind) {
    case "none":
      return;
    case "number":
      if (missing) issues.push({ path: at, code: "missing-value", message: "Enter a value." });
      else if (!isFiniteNumber(value)) issues.push({ path: at, code: "invalid-value", message: "The value must be a number." });
      return;
    case "scalar":
      if (missing) issues.push({ path: at, code: "missing-value", message: "Enter a value." });
      else if (typeof value === "number" && !Number.isFinite(value)) issues.push({ path: at, code: "invalid-value", message: "The value must be a finite number." });
      else if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") issues.push({ path: at, code: "invalid-value", message: "The value must be text, a number or on/off." });
      return;
    case "time":
      if (missing) issues.push({ path: at, code: "missing-value", message: "Enter a time." });
      else if (typeof value !== "string" || !TIME_OF_DAY.test(value)) issues.push({ path: at, code: "invalid-time", message: "Enter a time as HH:MM, 24-hour." });
      return;
    case "range":
      if (missing) issues.push({ path: at, code: "missing-value", message: "Enter a minimum and a maximum." });
      else if (!Array.isArray(value) || value.length !== 2 || !isFiniteNumber(value[0]) || !isFiniteNumber(value[1])) issues.push({ path: at, code: "invalid-value", message: "The range needs two numbers." });
      else if (value[0] > value[1]) issues.push({ path: at, code: "invalid-range", message: "The minimum cannot be greater than the maximum." });
  }
}

function checkDuplicateIds(items: readonly { id?: string }[], list: string, issues: KinetixAutomationIssue[]): void {
  const seen = new Set<string>();
  items.forEach((item, i) => {
    if (isBlank(item?.id)) {
      issues.push({ path: `${list}[${i}].id`, code: "missing-id", message: "Every item needs an id." });
      return;
    }
    if (seen.has(item.id as string)) issues.push({ path: `${list}[${i}].id`, code: "duplicate-id", message: `The id "${item.id}" is used more than once.` });
    seen.add(item.id as string);
  });
}

/**
 * Every problem with a rule, as typed issues with a `path`. An empty array means the rule is
 * well-formed — not that it will do what its author hopes, which no static check can say.
 * Never throws; a malformed input is reported, not crashed on.
 */
export function validateAutomationRule(rule: KinetixAutomationRule | null | undefined): KinetixAutomationIssue[] {
  const issues: KinetixAutomationIssue[] = [];
  if (!rule) return [{ path: "", code: "missing-trigger", message: "There is no rule." }];
  if (isBlank(rule.id)) issues.push({ path: "id", code: "missing-id", message: "The rule needs an id." });
  if (isBlank(rule.name)) issues.push({ path: "name", code: "missing-name", message: "Give the rule a name." });

  if (!rule.trigger) issues.push({ path: "trigger", code: "missing-trigger", message: "Choose what starts this rule." });
  else validateComparison(rule.trigger, "trigger", issues);

  const conditions = Array.isArray(rule.conditions) ? rule.conditions : [];
  checkDuplicateIds(conditions, "conditions", issues);
  conditions.forEach((condition, i) => {
    validateComparison(condition ?? {}, `conditions[${i}]`, issues);
    if (condition && condition.join !== "and" && condition.join !== "or") {
      issues.push({ path: `conditions[${i}].join`, code: "invalid-join", message: 'Join conditions with "and" or "or".' });
    }
  });

  const actions = Array.isArray(rule.actions) ? rule.actions : [];
  if (actions.length === 0) issues.push({ path: "actions", code: "missing-action", message: "Add at least one action." });
  checkDuplicateIds(actions, "actions", issues);
  actions.forEach((action, i) => {
    if (isBlank(action?.target)) issues.push({ path: `actions[${i}].target`, code: "empty-target", message: "Choose what this acts on." });
    if (isBlank(action?.command)) issues.push({ path: `actions[${i}].command`, code: "missing-command", message: "Choose what to do." });
    const duration = action?.durationMinutes;
    if (duration !== undefined && (!isFiniteNumber(duration) || duration <= 0)) {
      issues.push({ path: `actions[${i}].durationMinutes`, code: "invalid-duration", message: "The duration must be more than zero minutes." });
    }
  });
  return issues;
}

/** Whether {@link validateAutomationRule} finds nothing. */
export function isAutomationRuleValid(rule: KinetixAutomationRule | null | undefined): boolean {
  return validateAutomationRule(rule).length === 0;
}

/** A new rule with the condition inserted at `index` (default: the end; out-of-range indexes clamp). */
export function addCondition(rule: KinetixAutomationRule, condition: KinetixAutomationCondition, index?: number): KinetixAutomationRule {
  const list = [...(rule.conditions ?? [])];
  const at = typeof index === "number" && Number.isFinite(index) ? Math.min(list.length, Math.max(0, Math.trunc(index))) : list.length;
  list.splice(at, 0, condition);
  return { ...rule, conditions: list };
}

/** A new rule without the condition. An unknown id returns the rule unchanged (same reference). */
export function removeCondition(rule: KinetixAutomationRule, conditionId: string): KinetixAutomationRule {
  const list = rule.conditions ?? [];
  if (!list.some((c) => c.id === conditionId)) return rule;
  return { ...rule, conditions: list.filter((c) => c.id !== conditionId) };
}

/** A new rule with the action appended at `index` (default: the end). */
export function addAction(rule: KinetixAutomationRule, action: KinetixAutomationAction, index?: number): KinetixAutomationRule {
  const list = [...(rule.actions ?? [])];
  const at = typeof index === "number" && Number.isFinite(index) ? Math.min(list.length, Math.max(0, Math.trunc(index))) : list.length;
  list.splice(at, 0, action);
  return { ...rule, actions: list };
}

/** A new rule without the action. An unknown id returns the rule unchanged (same reference). */
export function removeAction(rule: KinetixAutomationRule, actionId: string): KinetixAutomationRule {
  const list = rule.actions ?? [];
  if (!list.some((a) => a.id === actionId)) return rule;
  return { ...rule, actions: list.filter((a) => a.id !== actionId) };
}

/**
 * A new array with the item at `from` moved to `to`, for reordering conditions or actions.
 * Bounds-safe: an out-of-range or non-integer `from` returns the input unchanged; `to` clamps.
 */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const list = [...items];
  if (!Number.isInteger(from) || from < 0 || from >= list.length) return list;
  const target = Number.isFinite(to) ? Math.min(list.length - 1, Math.max(0, Math.trunc(to))) : from;
  if (target === from) return list;
  const [moved] = list.splice(from, 1);
  list.splice(target, 0, moved as T);
  return list;
}

export type SummarizeAutomationOptions = {
  /**
   * Turn an id into a name the person recognises: `"subject"` for what a trigger or condition
   * watches, `"scope"` for where, `"target"` for what an action acts on. Return `undefined` to fall
   * back to the id made readable. This is how the summary stays free of any domain vocabulary.
   */
  label?: (kind: "subject" | "scope" | "target", id: string) => string | undefined;
};

/** `soil-moisture` → `soil moisture`. The neutral fallback when the product supplies no label. */
const readable = (id: string) => id.trim().replace(/[-_]+/g, " ");

function formatNumberValue(value: KinetixAutomationValue | undefined, unit: string | undefined): string {
  if (value === undefined) return "";
  const text = Array.isArray(value) ? `${value[0]} and ${value[1]}` : String(value);
  if (!unit) return text;
  // "%" and "°" hug the number; word units ("kPa", "L/min") take a space.
  const tight = unit.startsWith("%") || unit.startsWith("°");
  if (Array.isArray(value)) return `${value[0]}${tight ? "" : " "}${unit} and ${value[1]}${tight ? "" : " "}${unit}`;
  return `${text}${tight ? "" : " "}${unit}`;
}

function describeComparison(
  item: { subject: string; scope?: string; operator: KinetixAutomationOperator; value?: KinetixAutomationValue; unit?: string },
  form: "trigger" | "condition",
  name: (kind: "subject" | "scope" | "target", id: string) => string,
): string {
  const subject = name("subject", item.subject);
  const operator = describeOperator(item.operator, form);
  const value = isOperator(item.operator) && OPERATORS[item.operator].value === "none" ? "" : formatNumberValue(item.value, item.unit);
  const where = item.scope ? ` in ${name("scope", item.scope)}` : "";
  return `${subject} ${operator}${value ? ` ${value}` : ""}${where}`;
}

/**
 * One sentence for a rule, e.g. "When soil moisture falls below 28% in Greenhouse A, open Zone 3
 * irrigation for 12 minutes."
 *
 * Names come from `options.label`; without it ids are made readable, so the output is neutral
 * rather than domain-flavoured. Conditions read left to right with their joins, and **no precedence
 * is implied** — "a and b or c" is reported in the order given, because claiming a grouping the rule
 * does not define would misdescribe it. An incomplete rule is described as incomplete, not guessed at.
 */
export function summarizeAutomationRule(rule: KinetixAutomationRule, options: SummarizeAutomationOptions = {}): string {
  const name = (kind: "subject" | "scope" | "target", id: string) => options.label?.(kind, id) ?? readable(id);

  const when = rule.trigger ? `When ${describeComparison(rule.trigger, "trigger", name)}` : "No trigger is set";

  const conditions = (rule.conditions ?? []).map((c, i) => {
    const text = describeComparison(c, "condition", name);
    return i === 0 ? text : `${c.join === "or" ? "or" : "and"} ${text}`;
  });
  const provided = conditions.length > 0 ? `, provided ${conditions.join(" ")}` : "";

  const actions = (rule.actions ?? []).map((a) => {
    const value = a.value === undefined ? "" : ` to ${a.value}`;
    const duration =
      isFiniteNumber(a.durationMinutes) && a.durationMinutes > 0
        ? ` for ${a.durationMinutes} ${a.durationMinutes === 1 ? "minute" : "minutes"}`
        : "";
    return `${readable(a.command)} ${name("target", a.target)}${value}${duration}`;
  });
  const then = actions.length > 0 ? `, ${actions.join(", then ")}` : ", and no action is set";

  return `${when}${provided}${then}.${rule.enabled === false ? " This rule is off." : ""}`;
}
