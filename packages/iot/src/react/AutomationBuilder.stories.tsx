import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AutomationBuilder, type KinetixBuilderSubject, type KinetixBuilderTarget } from "./automation-builder";
import { AutomationRuleView } from "./automation-rule-view";
import type { KinetixAutomationRule } from "../types/automation";

/**
 * A structured form, not a canvas. Everything is a labelled field; reordering is buttons with
 * specific names ("Move condition 2 up"), and one polite status message says what an add, remove or
 * move did. Try it with the keyboard alone.
 *
 * The builder edits a rule. It does not run one.
 */
const subjects: KinetixBuilderSubject[] = [
  { id: "soil-moisture", label: "Soil moisture", unit: "%" },
  { id: "air-temp", label: "Air temperature", unit: "°C" },
  { id: "door", label: "Door" },
];
const targets: KinetixBuilderTarget[] = [
  { id: "zone-3", label: "Zone 3 irrigation", commands: [{ id: "open", label: "Open" }, { id: "close", label: "Close" }] },
  { id: "alarm", label: "Alarm siren" },
];

const meta = {
  title: "IoT/Automation",
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-[40rem] max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const filled: KinetixAutomationRule = {
  id: "rule-1",
  name: "Irrigate when dry",
  enabled: true,
  trigger: { type: "metric", subject: "soil-moisture", operator: "lt", value: 28, unit: "%" },
  conditions: [{ id: "c1", subject: "air-temp", operator: "gt", value: 15, unit: "°C", join: "and" }],
  actions: [{ id: "a1", target: "zone-3", command: "open", durationMinutes: 12 }],
};

const Builder = ({ initial, ...rest }: { initial: KinetixAutomationRule } & Partial<React.ComponentProps<typeof AutomationBuilder>>) => {
  const [rule, setRule] = React.useState(initial);
  return <AutomationBuilder subjects={subjects} targets={targets} value={rule} onChange={setRule} onSubmit={() => {}} onCancel={() => {}} {...rest} />;
};

export const Editing: Story = { render: () => <Builder initial={filled} /> };

/** Save it empty to see the problem list and the inline errors; the first link moves focus to the field. */
export const BlankWithValidation: Story = {
  render: () => <Builder initial={{ id: "rule-2", name: "", enabled: true, conditions: [], actions: [] }} />,
};

export const Disabled: Story = { render: () => <Builder initial={filled} disabled /> };

export const ReadOnlyView: Story = {
  render: () => <AutomationRuleView rule={filled} labelFor={(k, id) => (k === "subject" ? subjects : targets).find((x) => x.id === id)?.label} />,
};

export const RightToLeft: Story = { render: () => <div dir="rtl"><Builder initial={filled} /></div> };
