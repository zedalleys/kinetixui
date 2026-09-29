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
