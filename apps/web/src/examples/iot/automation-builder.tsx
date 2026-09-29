"use client";

import * as React from "react";
import { AutomationBuilder, AutomationRuleView, type KinetixBuilderSubject, type KinetixBuilderTarget } from "@kinetixui/iot/react";
import { summarizeAutomationRule, type KinetixAutomationRule } from "@kinetixui/iot/functions";
import { agritech, agritechRule } from "./scenarios";
import { BUTTON, SimNotice } from "./harness";

// kx-iot:start
/**
 * A rule editor wired to the farm's own vocabulary. It starts from the rule:
 *
 *   When soil moisture falls below 28% (and rain is not expected), open Zone 3 irrigation for 12 minutes.
 *
 * `AutomationBuilder` edits DATA. It validates with `validateAutomationRule`, shows problems inline,
 * and only calls `onSubmit` for a valid rule. Nothing evaluates the rule and nothing is sent: saving
 * here stores the rule in this component's state and says so.
 *
 * The rain forecast is application-provided demo data. KinetixUI fetches no forecast.
 */
const SUBJECTS: readonly KinetixBuilderSubject[] = [
  { id: "soil-moisture", label: "Soil moisture", unit: "%" },
  { id: "rain-forecast", label: "Rain forecast" },
  { id: "air-temperature", label: "Air temperature", unit: "°C" },
];

const TARGETS: readonly KinetixBuilderTarget[] = [
  { id: "zone-3", label: "Zone 3 irrigation", commands: [{ id: "open", label: "Open" }, { id: "close", label: "Close" }] },
  { id: "zone-2", label: "Zone 2 irrigation", commands: [{ id: "open", label: "Open" }, { id: "close", label: "Close" }] },
  { id: "pump-01", label: "Pump Station", commands: [{ id: "turn-on", label: "Turn on" }, { id: "turn-off", label: "Turn off" }] },
];

const BLANK: KinetixAutomationRule = { id: "rule-new", name: "", enabled: true, conditions: [], actions: [] };
const nameOf = (_kind: "subject" | "scope" | "target", id: string) =>
  SUBJECTS.find((s) => s.id === id)?.label.toLowerCase() ?? TARGETS.find((t) => t.id === id)?.label;

export function AutomationBuilderExample() {
  const [draft, setDraft] = React.useState<KinetixAutomationRule>(agritechRule);
  const [saved, setSaved] = React.useState<KinetixAutomationRule | null>(null);

  return (
    <section aria-label="Automation builder" className="flex flex-col gap-4">
      <SimNotice scenario={agritech} />

      <div className="flex flex-wrap gap-2">
        <button type="button" className={BUTTON} onClick={() => setDraft(BLANK)}>
          Start from a blank rule
        </button>
        <button type="button" className={BUTTON} onClick={() => setDraft(agritechRule)}>
          Reset to the Zone 3 rule
        </button>
      </div>

      <AutomationBuilder
        value={draft}
        onChange={setDraft}
        subjects={SUBJECTS}
        targets={TARGETS}
        labelFor={nameOf}
        submitLabel="Save as demo state"
        onSubmit={(rule) => setSaved(rule)}
      />

      {saved ? (
        <div role="status" className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
          <p className="text-label-md font-medium text-foreground">Saved as demo state — nothing is executed.</p>
          <p className="text-label-sm text-muted-foreground">
            The rule is {saved.enabled ? "enabled" : "disabled"}: {summarizeAutomationRule(saved, { label: nameOf })}
          </p>
          <AutomationRuleView rule={saved} labelFor={nameOf} hideSummary />
        </div>
      ) : null}
    </section>
  );
}
// kx-iot:end
