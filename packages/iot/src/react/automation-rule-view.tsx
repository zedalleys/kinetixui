import * as React from "react";
import type { KinetixAutomationRule, KinetixAutomationValue } from "../types/automation";
import { summarizeAutomationRule } from "../functions/automation";
import { describeOperator, describeValue, readable } from "./automation-text";
import { Glyph } from "./glyph";
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
 *
 * Visually it reads as a sentence being built: a labelled row per part (When, If/And/Or, Then/Also) joined
 * by a hairline connector on one surface, then the plain-language sentence as a quote-like block.
 */
export interface AutomationRuleViewProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  rule: KinetixAutomationRule;
  labelFor?: (kind: "subject" | "scope" | "target", id: string) => string | undefined;
  /** Drop the sentence and keep the stack. */
  hideSummary?: boolean;
}

const KEYWORD = "inline-flex w-16 justify-center rounded-full bg-background px-2.5 py-0.5 text-label-md uppercase tracking-wide text-muted-foreground";

/** One labelled row of the stack; the connector runs from its label to the next row's. */
function Step({ part, keyword, last, children }: { part: string; keyword: string; last: boolean; children: React.ReactNode }) {
  return (
    <li data-part={part} className="flex gap-3">
      <span className="flex shrink-0 flex-col items-center">
        <span className={KEYWORD}>{keyword}</span>
        {last ? null : <span aria-hidden="true" className="mt-1 w-px flex-1 bg-border" />}
      </span>
      <span className={cn("min-w-0 flex-1 break-words text-body-md", last ? "" : "pb-4")}>{children}</span>
    </li>
  );
}

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

    const conditions = rule.conditions ?? [];
    const actions = rule.actions ?? [];
    // Rows in reading order, so "last" (no connector) is known before rendering.
    const rows: { key: string; part: string; keyword: string; body: React.ReactNode }[] = [
      {
        key: "when",
        part: "when",
        keyword: "When",
        body: rule.trigger ? <span className="text-foreground">{compare(rule.trigger, "trigger")}</span> : <span className="text-muted-foreground">No trigger is set</span>,
      },
      ...conditions.map((condition, index) => ({
        key: condition.id,
        part: "condition",
        keyword: index === 0 ? "If" : condition.join === "or" ? "Or" : "And",
        body: <span className="text-foreground">{compare(condition, "condition")}</span>,
      })),
      ...(actions.length === 0
        ? [{ key: "then", part: "then", keyword: "Then", body: <span className="text-muted-foreground">No action is set</span> }]
        : actions.map((action, index) => ({
            key: action.id,
            part: "then",
            keyword: index === 0 ? "Then" : "Also",
            body: (
              <span className="text-foreground">
                {readable(action.command)} {name("target", action.target)}
                {action.value !== undefined ? ` to ${String(action.value)}` : ""}
                {typeof action.durationMinutes === "number" && action.durationMinutes > 0 ? (
                  <span data-part="for" className="text-muted-foreground">
                    {" "}
                    for {action.durationMinutes} {action.durationMinutes === 1 ? "minute" : "minutes"}
                  </span>
                ) : null}
              </span>
            ),
          }))),
    ];

    return (
      <div ref={ref} data-enabled={rule.enabled ? "" : undefined} className={cn("flex min-w-0 flex-col gap-4 rounded-container bg-muted/40 p-5 font-sans", className)} {...props}>
        <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="break-words text-title-md text-foreground">{rule.name}</span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-label-md",
              rule.enabled ? "bg-primary/10 text-primary" : "border border-dashed border-muted-foreground text-muted-foreground",
            )}
          >
            <Glyph name={rule.enabled ? "check" : "dash"} size={12} />
            {rule.enabled ? "On" : "Off"}
          </span>
        </p>

        <ol aria-label="Rule steps" className="m-0 flex list-none flex-col p-0">
          {rows.map((row, index) => (
            <Step key={row.key} part={row.part} keyword={row.keyword} last={index === rows.length - 1}>
              {row.body}
            </Step>
          ))}
        </ol>

        {hideSummary ? null : (
          <p data-summary="" className="m-0 border-s-4 border-primary/40 ps-4 text-body-md text-foreground">
            {summarizeAutomationRule(rule, { label: labelFor })}
          </p>
        )}
      </div>
    );
  },
), "AutomationRuleView");

export { AutomationRuleView };
