import * as React from "react";
import type { KinetixAutomationRule, KinetixAutomationValue } from "../types/automation";
import { summarizeAutomationRule } from "../functions/automation";
import { describeOperator, describeValue, readable } from "./automation-text";
import { cn } from "./cn";
import { withDisplayName } from "./display-name";

/**
 * AutomationRuleView — a rule, read-only: WHEN, AND/OR, THEN [for N minutes].
 *
 * A stacked list of the rule's parts followed by the plain-language sentence
 * (`summarizeAutomationRule`), so a person can check the structure against the prose. `labelFor` is
 * the same resolver `summarizeAutomationRule` takes — `"subject"` for what is watched, `"scope"` for
 * where, `"target"` for what an action acts on — and without it ids are made readable. That is how
 * this stays free of any domain vocabulary.
 *
 * This shows a rule. It does not evaluate one; nothing here watches a value or runs an action.
 * Conditions are listed in the order given with their joins and **no precedence is implied**.
 */
export interface AutomationRuleViewProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  rule: KinetixAutomationRule;
  labelFor?: (kind: "subject" | "scope" | "target", id: string) => string | undefined;
  /** Drop the sentence and keep the stack. */
  hideSummary?: boolean;
}

const KEYWORD = "w-12 shrink-0 text-label-sm uppercase tracking-wide text-muted-foreground";

const AutomationRuleView = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ React.forwardRef<HTMLDivElement, AutomationRuleViewProps>(
  ({ rule, labelFor, hideSummary = false, className, ...props }, ref) => {
    const name = (kind: "subject" | "scope" | "target", id: string) => labelFor?.(kind, id) ?? readable(id);
    const compare = (
      item: { subject: string; scope?: string; operator: string; value?: KinetixAutomationValue; unit?: string },
      form: "trigger" | "condition",
    ) => {
      const value = describeValue(item.operator, item.value, item.unit);
      return `${name("subject", item.subject)} ${describeOperator(item.operator, form)}${value ? ` ${value}` : ""}${item.scope ? ` in ${name("scope", item.scope)}` : ""}`;
    };

    return (
      <div ref={ref} data-enabled={rule.enabled ? "" : undefined} className={cn("flex min-w-0 flex-col gap-3 font-sans", className)} {...props}>
        <p className="flex flex-wrap items-baseline gap-x-2 text-label-md text-foreground">
          <span className="break-words">{rule.name}</span>
          <span className="text-label-sm text-muted-foreground">{rule.enabled ? "On" : "Off"}</span>
        </p>

        <ol aria-label="Rule steps" className="m-0 flex list-none flex-col gap-2 p-0">
          <li data-part="when" className="flex items-baseline gap-2">
            <span className={KEYWORD}>When</span>
            <span className="min-w-0 break-words text-label-md text-foreground">{rule.trigger ? compare(rule.trigger, "trigger") : "No trigger is set"}</span>
          </li>
          {(rule.conditions ?? []).map((condition, index) => (
            <li key={condition.id} data-part="condition" className="flex items-baseline gap-2">
              <span className={KEYWORD}>{index === 0 ? "If" : condition.join === "or" ? "Or" : "And"}</span>
              <span className="min-w-0 break-words text-label-md text-foreground">{compare(condition, "condition")}</span>
            </li>
          ))}
          {(rule.actions ?? []).length === 0 ? (
            <li data-part="then" className="flex items-baseline gap-2">
              <span className={KEYWORD}>Then</span>
              <span className="min-w-0 text-label-md text-muted-foreground">No action is set</span>
            </li>
          ) : (
            (rule.actions ?? []).map((action, index) => (
              <li key={action.id} data-part="then" className="flex items-baseline gap-2">
                <span className={KEYWORD}>{index === 0 ? "Then" : "Also"}</span>
                <span className="min-w-0 break-words text-label-md text-foreground">
                  {readable(action.command)} {name("target", action.target)}
                  {action.value !== undefined ? ` to ${String(action.value)}` : ""}
                  {typeof action.durationMinutes === "number" && action.durationMinutes > 0 ? (
                    <span data-part="for" className="text-muted-foreground">
                      {" "}
                      for {action.durationMinutes} {action.durationMinutes === 1 ? "minute" : "minutes"}
                    </span>
                  ) : null}
                </span>
              </li>
            ))
          )}
        </ol>

        {hideSummary ? null : (
          <p data-summary="" className="border-t border-border pt-2 text-label-sm text-muted-foreground">
            {summarizeAutomationRule(rule, { label: labelFor })}
          </p>
        )}
      </div>
    );
  },
), "AutomationRuleView");

export { AutomationRuleView };
