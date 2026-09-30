/**
 * The automation model.
 *
 * **This is UI state, not an engine.** Nothing here evaluates a trigger, schedules a run or sends a
 * command. It models what a product needs in order to *show* an automation: what it is called, what
 * sets it off, what it does, whether it is on, and what happened last time. A product that has an
 * engine populates these; a product that does not has nothing to show anyway.
 *
 * "Scene" and "routine" are the same shape with different emphasis — a scene is usually manual and
 * instant, a routine usually triggered and multi-step — so they are one type with a `kind`, rather
 * than two nearly-identical ones that drift apart.
 */

/** Whether this is something a user fires, or something that fires itself. */
export type KinetixAutomationKind = "scene" | "routine" | "schedule";

/**
 * What the automation is doing right now.
 *
 * `running` is worth its own state rather than being folded into `enabled`: a nightly irrigation
 * routine that is mid-run is a different thing from one that is merely switched on, and the user
 * watching the pump wants to know which.
 */
export type KinetixAutomationStatus = "idle" | "running" | "failed" | "disabled";

export type KinetixAutomation = {
  id: string;
  name: string;
  kind: KinetixAutomationKind;
  status: KinetixAutomationStatus;
  /** Whether the automation is armed. A disabled automation keeps its definition and stops firing. */
  enabled: boolean;
  /** Human summary of what sets it off — "Sunset", "Soil below 30%", "Weekdays 06:30". */
  trigger?: string;
  /** Human summary of what it does — "4 lights, 1 blind". Not a machine-readable action list. */
  actions?: string;
  lastRunAt?: string | Date;
  /** Only where the product genuinely knows. A guessed next-run is worse than none. */
  nextRunAt?: string | Date;
  /** Why the last run failed, when it did. */
  errorMessage?: string;
};

// ---------------------------------------------------------------------------------------------
// Automation rules (v2): a structured, data-only description of "when this, if that, do those".
// ---------------------------------------------------------------------------------------------
//
// Still **not an engine**. Nothing below is evaluated against live data or scheduled. It is what a
// rule *editor* edits and a rule *summary* reads, so a product with an engine can round-trip it and a
// product without one can still show a person what a rule says. It coexists with
// {@link KinetixAutomation}, which is the read-only card model, and does not replace it.

/**
 * The comparison a trigger or condition makes. Deliberately small:
 *
 * - `lt` `lte` `gt` `gte` — numeric comparison (`value` is a number)
 * - `eq` `neq` — equal / not equal (`value` is a string, number or boolean)
 * - `between` — inside an inclusive range (`value` is `[min, max]`)
 * - `changes-to` — the subject's state becomes `value` (an edge, not a level)
 * - `is-detected` — a presence-style subject is active (no value)
 * - `after-time` `before-time` — time of day, `value` is `"HH:MM"` in 24-hour form
 */
export type KinetixAutomationOperator =
  | "lt"
  | "lte"
  | "gt"
  | "gte"
  | "eq"
  | "neq"
  | "between"
  | "changes-to"
  | "is-detected"
  | "after-time"
  | "before-time";

export const KINETIX_AUTOMATION_OPERATORS: readonly KinetixAutomationOperator[] = [
  "lt",
  "lte",
  "gt",
  "gte",
  "eq",
  "neq",
  "between",
  "changes-to",
  "is-detected",
  "after-time",
  "before-time",
] as const;

export type KinetixAutomationValue = string | number | boolean | readonly [number, number];

/** What sets the rule off. `type` is the product's own word ("metric", "device-state", "schedule"). */
export type KinetixAutomationTrigger = {
  type: string;
  /** What is watched: a metric key, a device id, a state name. Resolved to a name by the summary callback. */
  subject: string;
  /** Where, as a space id. Optional. */
  scope?: string;
  operator: KinetixAutomationOperator;
  value?: KinetixAutomationValue;
  unit?: string;
};

/** An extra requirement. `join` links it to the item before it and is ignored on the first. */
export type KinetixAutomationCondition = {
  id: string;
  subject: string;
  scope?: string;
  operator: KinetixAutomationOperator;
  value?: KinetixAutomationValue;
  unit?: string;
  join: "and" | "or";
};

export type KinetixAutomationAction = {
  id: string;
  /** A device, group or space id. */
  target: string;
  /** The product's verb: "open", "turn-off", "notify". */
  command: string;
  value?: string | number | boolean;
  durationMinutes?: number;
};

export type KinetixAutomationRule = {
  id: string;
  name: string;
  enabled: boolean;
  /** Optional in the type so a half-built draft can be represented; validation reports it. */
  trigger?: KinetixAutomationTrigger;
  conditions: KinetixAutomationCondition[];
  actions: KinetixAutomationAction[];
};

export type KinetixAutomationIssueCode =
  | "missing-id"
  | "missing-name"
  | "missing-trigger"
  | "missing-action"
  | "duplicate-id"
  | "missing-subject"
  | "unknown-operator"
  | "missing-value"
  | "invalid-value"
  | "invalid-range"
  | "invalid-time"
  | "invalid-join"
  | "empty-target"
  | "missing-command"
  | "invalid-duration";

export type KinetixAutomationIssue = {
  /** Where, e.g. `trigger.value`, `conditions[1].subject`, `actions[0].durationMinutes`. */
  path: string;
  code: KinetixAutomationIssueCode;
  message: string;
};
