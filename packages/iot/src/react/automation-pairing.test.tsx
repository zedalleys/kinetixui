import * as React from "react";
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AutomationBuilder, AutomationRuleView, PairingFailure, PairingMethodPicker, PairingStepper } from "./index";
import type { AutomationBuilderProps, KinetixBuilderSubject, KinetixBuilderTarget } from "./index";
import type { KinetixAutomationRule } from "../types/automation";
import type { KinetixPairingFailureCode, KinetixPairingMethod } from "../types/pairing";
import { KINETIX_PAIRING_FAILURES, advancePairing, startPairingFlow } from "../functions/pairing";
import { isAutomationRuleValid, summarizeAutomationRule } from "../functions/automation";

/**
 * Automation and pairing.
 *
 * What is protected: the builder is operable without a pointer (add, remove and move are buttons with
 * specific names, and focus lands somewhere sensible afterwards), it reports problems inline and in a
 * summary without shouting at a blank draft, it has exactly one polite live region that is silent on
 * first render; the method picker is a real radio group; and a pairing failure hands every recovery
 * action back to the product.
 */
afterEach(cleanup);

async function axeViolations(container: HTMLElement): Promise<string[]> {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false }, region: { enabled: false }, "landmark-one-main": { enabled: false }, "page-has-heading-one": { enabled: false } },
  });
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 120)).join(" | ")}`);
}

const PHYSICAL = /(^|[\s"])(-?(ml|mr|pl|pr)-|-?(left|right)-|text-(left|right)\b|rounded-(l|r|tl|tr|bl|br)\b|border-(l|r)\b)/;
const liveRegions = (el: HTMLElement) => el.querySelectorAll('[role="status"],[role="alert"],[aria-live]');

/* ------------------------------------------------------------------ AutomationRuleView */

const subjects: KinetixBuilderSubject[] = [
  { id: "soil-moisture", label: "Soil moisture", unit: "%" },
  { id: "air-temp", label: "Air temperature", unit: "°C" },
  { id: "door", label: "Door" },
];
const targets: KinetixBuilderTarget[] = [
  { id: "zone-3", label: "Zone 3 irrigation", commands: [{ id: "open", label: "Open" }, { id: "close", label: "Close" }] },
  { id: "alarm", label: "Alarm siren" },
];
const labelFor = (kind: "subject" | "scope" | "target", id: string) =>
  kind === "subject" ? subjects.find((s) => s.id === id)?.label : kind === "target" ? targets.find((t) => t.id === id)?.label : id === "gh-a" ? "Greenhouse A" : undefined;

const fullRule: KinetixAutomationRule = {
  id: "r1",
  name: "Irrigate when dry",
  enabled: true,
  trigger: { type: "metric", subject: "soil-moisture", scope: "gh-a", operator: "lt", value: 28, unit: "%" },
  conditions: [
    { id: "c1", subject: "air-temp", operator: "gt", value: 15, unit: "°C", join: "and" },
    { id: "c2", subject: "door", operator: "eq", value: "closed", join: "or" },
  ],
  actions: [
    { id: "a1", target: "zone-3", command: "open", durationMinutes: 12 },
    { id: "a2", target: "alarm", command: "notify" },
  ],
};

describe("AutomationRuleView", () => {
  it("stacks WHEN / IF-AND-OR / THEN-ALSO with resolved names", () => {
    const { container } = render(<AutomationRuleView rule={fullRule} labelFor={labelFor} />);
    const steps = within(screen.getByRole("list", { name: "Rule steps" })).getAllByRole("listitem");
    expect(steps.map((s) => s.getAttribute("data-part"))).toEqual(["when", "condition", "condition", "then", "then"]);
    expect(steps[0]).toHaveTextContent("When");
    expect(steps[0]).toHaveTextContent("Soil moisture falls below 28% in Greenhouse A");
    expect(steps[1]).toHaveTextContent("If");
    expect(steps[1]).toHaveTextContent("Air temperature is above 15°C");
    expect(steps[2]).toHaveTextContent("Or");
    expect(steps[2]).toHaveTextContent("Door is closed");
    expect(steps[3]).toHaveTextContent("Then");
    expect(steps[3]).toHaveTextContent("open Zone 3 irrigation");
    expect(steps[3].querySelector("[data-part='for']")).toHaveTextContent("for 12 minutes");
    expect(steps[4]).toHaveTextContent("Also");
    expect(container).toHaveTextContent("On");
  });

  it("prints the same sentence the headless summary produces", () => {
    const { container } = render(<AutomationRuleView rule={fullRule} labelFor={labelFor} />);
    expect(container.querySelector("[data-summary]")!.textContent).toBe(summarizeAutomationRule(fullRule, { label: labelFor }));
  });

  it("describes an incomplete rule as incomplete, and a disabled rule as off", () => {
    const { container } = render(<AutomationRuleView rule={{ id: "x", name: "Draft", enabled: false, conditions: [], actions: [] }} />);
    expect(container).toHaveTextContent("No trigger is set");
    expect(container).toHaveTextContent("No action is set");
    expect(container).toHaveTextContent("Off");
  });

  it("falls back to readable ids without a resolver", () => {
    const { container } = render(<AutomationRuleView rule={fullRule} />);
    expect(container).toHaveTextContent("soil moisture falls below 28%");
  });

  it("announces nothing, is axe-clean, and uses logical properties in RTL", async () => {
    const { container } = render(
      <div dir="rtl">
        <AutomationRuleView rule={fullRule} labelFor={labelFor} />
      </div>,
    );
    expect(liveRegions(container)).toHaveLength(0);
    expect(container.innerHTML).not.toMatch(PHYSICAL);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ AutomationBuilder */

const blank: KinetixAutomationRule = { id: "new-rule", name: "", enabled: true, conditions: [], actions: [] };

/** A controlled harness, since the builder is controlled. */
function Harness({ initial = blank, spy, ...rest }: { initial?: KinetixAutomationRule; spy?: (r: KinetixAutomationRule) => void } & Partial<AutomationBuilderProps>) {
  const [rule, setRule] = React.useState(initial);
  return (
    <AutomationBuilder
      subjects={subjects}
      targets={targets}
      labelFor={labelFor}
      value={rule}
      onChange={(next) => {
        spy?.(next);
        setRule(next);
      }}
      {...rest}
    />
  );
}

const fieldset = (name: RegExp | string) => screen.getByRole("group", { name }) as HTMLElement;
const status = () => screen.getByRole("status", { hidden: true });

describe("AutomationBuilder structure", () => {
  it("has Trigger, Conditions and Actions fieldsets with legends, and a Summary", () => {
    render(<Harness initial={fullRule} />);
    for (const name of ["Rule", "Trigger", "Conditions", "Actions", "Condition 1", "Condition 2", "Action 1", "Action 2"]) {
      expect(fieldset(name).tagName).toBe("FIELDSET");
    }
    expect(screen.getByRole("group", { name: "Summary" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Automation rule" })).toBeInTheDocument();
  });

  it("gives every field a real label: named selects, inputs and a checkbox", () => {
    render(<Harness initial={fullRule} />);
    const trigger = fieldset("Trigger");
    expect(within(trigger).getByRole("combobox", { name: "What to watch" })).toHaveValue("soil-moisture");
    expect(within(trigger).getByRole("combobox", { name: "Comparison" })).toHaveValue("lt");
    expect(within(trigger).getByRole("spinbutton", { name: "Value" })).toHaveValue(28);
    expect(screen.getByRole("textbox", { name: "Rule name" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Rule is on" })).toBeChecked();
    // Every control in the form has an accessible name.
    for (const control of document.querySelectorAll("input,select,button")) {
      const name = control.getAttribute("aria-label") || (control as HTMLInputElement).labels?.[0]?.textContent || control.textContent;
      expect(name, control.outerHTML).toBeTruthy();
    }
  });

  it("shows the human sentence live, and it is not a live region", () => {
    const { container } = render(<Harness initial={fullRule} />);
    const summary = container.querySelector("[data-builder-summary]")!;
    expect(summary).toHaveTextContent(summarizeAutomationRule(fullRule, { label: labelFor }));
    expect(summary.closest("[aria-live]")).toBeNull();
    expect(summary.querySelector("[role='status'],[aria-live]")).toBeNull();

    fireEvent.change(within(fieldset("Trigger")).getByRole("spinbutton", { name: "Value" }), { target: { value: "31" } });
    expect(summary).toHaveTextContent("Soil moisture falls below 31%");
  });

  it("offers only the operators it is given", () => {
    render(<Harness initial={fullRule} operators={["lt", "gt", "between"]} />);
    const options = within(within(fieldset("Trigger")).getByRole("combobox", { name: "Comparison" })).getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["falls below", "rises above", "moves into the range"]);
    // Conditions use the condition wording.
    const condOptions = within(within(fieldset("Condition 1")).getByRole("combobox", { name: "Comparison" })).getAllByRole("option").map((o) => o.textContent);
    expect(condOptions).toEqual(["is below", "is above", "is between"]);
  });

  it("draws the value input each operator needs", () => {
    const { rerender } = render(<Harness initial={{ ...fullRule, trigger: { ...fullRule.trigger!, operator: "between", value: [10, 20] } }} key="a" />);
    const t = fieldset("Trigger");
    expect(within(t).getByRole("spinbutton", { name: "Minimum" })).toHaveValue(10);
    expect(within(t).getByRole("spinbutton", { name: "Maximum" })).toHaveValue(20);
    rerender(<Harness initial={{ ...fullRule, trigger: { ...fullRule.trigger!, operator: "is-detected", value: undefined } }} key="b" />);
    expect(within(fieldset("Trigger")).queryByRole("spinbutton")).toBeNull();
    rerender(<Harness initial={{ ...fullRule, trigger: { ...fullRule.trigger!, operator: "after-time", value: "06:30" } }} key="c" />);
    expect((within(fieldset("Trigger")).getByLabelText("Time of day") as HTMLInputElement).type).toBe("time");
  });

  it("clears the value when the operator changes shape, and keeps it when it does not", () => {
    const spy = vi.fn();
    render(<Harness initial={fullRule} spy={spy} />);
    const op = within(fieldset("Trigger")).getByRole("combobox", { name: "Comparison" });
    fireEvent.change(op, { target: { value: "gt" } });
    expect(spy.mock.lastCall![0].trigger).toMatchObject({ operator: "gt", value: 28 });
    fireEvent.change(op, { target: { value: "between" } });
    expect(spy.mock.lastCall![0].trigger.value).toBeUndefined();
  });

  it("takes the unit from the subject, or from unitFor when given", () => {
    const spy = vi.fn();
    render(<Harness initial={blank} spy={spy} unitFor={(id) => (id === "door" ? "state" : undefined)} />);
    const subject = within(fieldset("Trigger")).getByRole("combobox", { name: "What to watch" });
    fireEvent.change(subject, { target: { value: "air-temp" } });
    expect(spy.mock.lastCall![0].trigger.unit).toBe("°C");
    fireEvent.change(subject, { target: { value: "door" } });
    expect(spy.mock.lastCall![0].trigger.unit).toBe("state");
  });

  it("offers a target's commands as a select, and a free-text command otherwise", () => {
    render(<Harness initial={fullRule} />);
    expect(within(fieldset("Action 1")).getByRole("combobox", { name: "Do" })).toHaveValue("open");
    const free = within(fieldset("Action 2")).getByRole("textbox", { name: "Do" });
    expect(free).toHaveValue("notify");
  });
});

describe("AutomationBuilder editing without a pointer", () => {
  it("adds a condition, focuses its first field, and announces it once", () => {
    render(<Harness initial={fullRule} />);
    expect(status()).toHaveTextContent("");
    fireEvent.click(screen.getByRole("button", { name: "Add condition" }));
    const added = fieldset("Condition 3");
    expect(within(added).getByRole("combobox", { name: "What to watch" })).toHaveFocus();
    expect(status()).toHaveTextContent("Condition 3 added. 3 in total.");
  });

  it("removes a condition, focuses the next one's Remove button, and announces it", () => {
    render(<Harness initial={fullRule} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove condition 1" }));
    expect(screen.queryByRole("group", { name: "Condition 2" })).toBeNull();
    expect(screen.getByRole("button", { name: "Remove condition 1" })).toHaveFocus(); // c2, now first
    expect(status()).toHaveTextContent("Condition 1 removed. 1 remaining.");
  });

  it("returns focus to Add condition when the last condition is removed", () => {
    render(<Harness initial={{ ...fullRule, conditions: [fullRule.conditions[0]!] }} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove condition 1" }));
    expect(screen.getByRole("button", { name: "Add condition" })).toHaveFocus();
    expect(screen.getByText(/No conditions/)).toBeInTheDocument();
  });

  it("moves a condition down and keeps focus on that item's own move button", () => {
    const spy = vi.fn();
    render(<Harness initial={{ ...fullRule, conditions: [...fullRule.conditions, { id: "c3", subject: "door", operator: "eq", value: "open", join: "and" }] }} spy={spy} />);
    fireEvent.click(screen.getByRole("button", { name: "Move condition 1 down" }));
    expect(spy.mock.lastCall![0].conditions.map((c: { id: string }) => c.id)).toEqual(["c2", "c1", "c3"]);
    // c1 is now second: its own "down" button, which is now labelled for position 2.
    expect(screen.getByRole("button", { name: "Move condition 2 down" })).toHaveFocus();
    expect(status()).toHaveTextContent("Condition moved down to position 2 of 3.");
  });

  it("moves focus to the other move button when an item reaches the end", () => {
    render(<Harness initial={fullRule} />);
    fireEvent.click(screen.getByRole("button", { name: "Move condition 1 down" }));
    // c1 is now last: "down" is disabled, so focus goes to its "up" button rather than being lost.
    expect(screen.getByRole("button", { name: "Move condition 2 down" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move condition 2 up" })).toHaveFocus();
  });

  it("disables Move up on the first item and Move down on the last", () => {
    render(<Harness initial={fullRule} />);
    expect(screen.getByRole("button", { name: "Move condition 1 up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move condition 2 down" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move action 1 up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move action 2 down" })).toBeDisabled();
  });

  it("adds, moves and removes actions the same way", () => {
    const spy = vi.fn();
    render(<Harness initial={fullRule} spy={spy} />);
    fireEvent.click(screen.getByRole("button", { name: "Add action" }));
    expect(within(fieldset("Action 3")).getByRole("combobox", { name: "Act on" })).toHaveFocus();
    expect(status()).toHaveTextContent("Action 3 added. 3 in total.");
    fireEvent.click(screen.getByRole("button", { name: "Move action 2 up" }));
    expect(spy.mock.lastCall![0].actions.map((a: { id: string }) => a.id)).toEqual(["a2", "a1", "action-3"]);
    fireEvent.click(screen.getByRole("button", { name: "Remove action 3" }));
    expect(spy.mock.lastCall![0].actions).toHaveLength(2);
    expect(status()).toHaveTextContent("Action 3 removed. 2 remaining.");
  });

  it("changes a target and clears the command that no longer applies", () => {
    const spy = vi.fn();
    render(<Harness initial={fullRule} spy={spy} />);
    fireEvent.change(within(fieldset("Action 1")).getByRole("combobox", { name: "Act on" }), { target: { value: "alarm" } });
    expect(spy.mock.lastCall![0].actions[0]).toMatchObject({ target: "alarm", command: "" });
  });

  it("does not move focus if the parent ignores the change, nor later for an unrelated one", () => {
    const props = { subjects, targets, onChange: () => {} };
    const { rerender } = render(<AutomationBuilder {...props} value={fullRule} />);
    const add = screen.getByRole("button", { name: "Add condition" });
    add.focus();
    fireEvent.click(add);
    expect(screen.queryByRole("group", { name: "Condition 3" })).toBeNull();
    expect(add).toHaveFocus();
    // An unrelated later edit from the parent: the stale request finds no target and is dropped.
    rerender(<AutomationBuilder {...props} value={{ ...fullRule, name: "Renamed" }} />);
    expect(add).toHaveFocus();
  });

  it("has one polite status region, silent on first render, and no other live region", () => {
    const { container } = render(<Harness initial={fullRule} />);
    expect(liveRegions(container)).toHaveLength(1);
    expect(status()).toHaveTextContent("");
    expect(container.querySelector("[aria-live]")).toBeNull();
  });
});

describe("AutomationBuilder validation", () => {
  it("does not shout at a blank draft on first render", () => {
    const { container } = render(<Harness />);
    expect(container.querySelector("[data-error]")).toBeNull();
    expect(container.querySelector("[data-error-summary]")).toBeNull();
    expect(container.querySelector("[aria-invalid]")).toBeNull();
  });

  it("shows a field's problem once it has been left, with aria-invalid, aria-describedby and words", () => {
    render(<Harness />);
    const name = screen.getByRole("textbox", { name: "Rule name" });
    fireEvent.blur(name);
    expect(name).toHaveAttribute("aria-invalid", "true");
    const error = document.getElementById(name.getAttribute("aria-describedby")!)!;
    expect(error).toHaveTextContent("Error: Give the rule a name.");
    expect(error.querySelector("svg")).not.toBeNull(); // a glyph, not colour alone
    fireEvent.change(name, { target: { value: "Night watering" } });
    expect(name).not.toHaveAttribute("aria-invalid");
    expect(name).not.toHaveAttribute("aria-describedby");
  });

  it("on a failed submit, lists every problem and moves focus to the summary", () => {
    const onSubmit = vi.fn();
    const { container } = render(<Harness onSubmit={onSubmit} />);
    fireEvent.submit(screen.getByRole("form", { name: "Automation rule" }));
    expect(onSubmit).not.toHaveBeenCalled();
    const summary = container.querySelector("[data-error-summary]") as HTMLElement;
    expect(summary).toHaveFocus();
    expect(summary).toHaveTextContent(/problems to fix/);
    const links = within(summary).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(expect.arrayContaining([expect.stringContaining("Name: Give the rule a name."), expect.stringContaining("Trigger: Choose what starts this rule."), expect.stringContaining("Actions: Add at least one action.")]));
  });

  it("moves focus to the offending field from a summary link", () => {
    render(<Harness onSubmit={() => {}} />);
    fireEvent.submit(screen.getByRole("form"));
    fireEvent.click(screen.getByRole("link", { name: /Name: Give the rule a name/ }));
    expect(screen.getByRole("textbox", { name: "Rule name" })).toHaveFocus();
    fireEvent.click(screen.getByRole("link", { name: /Trigger: Choose what starts this rule/ }));
    expect(within(fieldset("Trigger")).getByRole("combobox", { name: "What to watch" })).toHaveFocus();
    fireEvent.click(screen.getByRole("link", { name: /Actions: Add at least one action/ }));
    expect(screen.getByRole("button", { name: "Add action" })).toHaveFocus();
  });

  it("marks the range field invalid on both inputs' shared error", () => {
    render(<Harness initial={{ ...fullRule, trigger: { ...fullRule.trigger!, operator: "between", value: [30, 10] } }} showValidation />);
    const t = fieldset("Trigger");
    const min = within(t).getByRole("spinbutton", { name: "Minimum" });
    const max = within(t).getByRole("spinbutton", { name: "Maximum" });
    expect(min).toHaveAttribute("aria-invalid", "true");
    expect(max).toHaveAttribute("aria-invalid", "true");
    expect(t).toHaveTextContent("The minimum cannot be greater than the maximum.");
  });

  it("submits a valid rule exactly once and reports it", () => {
    const onSubmit = vi.fn();
    render(<Harness initial={fullRule} onSubmit={onSubmit} />);
    expect(isAutomationRuleValid(fullRule)).toBe(true);
    fireEvent.submit(screen.getByRole("form"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(fullRule);
    expect(document.querySelector("[data-error-summary]")).toBeNull();
  });

  it("renders Save and Cancel only when their callbacks are given", () => {
    const onCancel = vi.fn();
    const { rerender } = render(<Harness initial={fullRule} />);
    expect(screen.queryByRole("button", { name: "Save rule" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
    rerender(<Harness initial={fullRule} onSubmit={() => {}} onCancel={onCancel} submitLabel="Save" cancelLabel="Discard" />);
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(onCancel).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "submit");
  });
});

describe("AutomationBuilder states", () => {
  it("disables every control when disabled", () => {
    render(<Harness initial={fullRule} disabled onSubmit={() => {}} />);
    for (const control of document.querySelectorAll("input,select,button")) expect(control, control.outerHTML).toBeDisabled();
  });

  it("renders the read-only view instead of a form when readOnly", () => {
    render(<Harness initial={fullRule} readOnly />);
    expect(screen.queryByRole("form")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByRole("list", { name: "Rule steps" })).toHaveTextContent("Soil moisture falls below 28%");
  });

  it("is axe-clean: blank, populated, invalid, and in RTL", async () => {
    const blankRender = render(<Harness />);
    expect(await axeViolations(blankRender.container)).toEqual([]);
    blankRender.unmount();

    const full = render(<Harness initial={fullRule} onSubmit={() => {}} onCancel={() => {}} />);
    expect(await axeViolations(full.container)).toEqual([]);
    full.unmount();

    const invalid = render(<Harness onSubmit={() => {}} showValidation />);
    fireEvent.submit(screen.getByRole("form"));
    expect(await axeViolations(invalid.container)).toEqual([]);
    invalid.unmount();

    const rtl = render(
      <div dir="rtl">
        <Harness initial={fullRule} onSubmit={() => {}} />
      </div>,
    );
    expect(rtl.container.innerHTML).not.toMatch(PHYSICAL);
    expect(await axeViolations(rtl.container)).toEqual([]);
  });

  it("never claims to run anything", () => {
    const { container } = render(<Harness initial={fullRule} onSubmit={() => {}} />);
    expect(container.textContent).not.toMatch(/\b(run now|execute|deploy|active engine|test rule)\b/i);
  });
});

/* ------------------------------------------------------------------ PairingMethodPicker */

const picker = (props: Partial<React.ComponentProps<typeof PairingMethodPicker>> = {}) => {
  const onChange = vi.fn();
  const utils = render(<PairingMethodPicker value="qr" onChange={onChange} {...props} />);
  return { onChange, ...utils };
};

describe("PairingMethodPicker", () => {
  it("is a named radiogroup of radios, one per method, in registry order", () => {
    picker();
    const group = screen.getByRole("radiogroup", { name: "Pairing method" });
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((r) => r.getAttribute("data-method"))).toEqual(["bluetooth", "network", "qr", "manual-code", "cloud"]);
    expect(radios.map((r) => r.getAttribute("aria-checked"))).toEqual(["false", "false", "true", "false", "false"]);
    expect(screen.getByRole("radio", { name: /Scan QR code/ })).toBeInTheDocument();
  });

  it("is a single tab stop on the selected method", () => {
    picker();
    const stops = screen.getAllByRole("radio").filter((r) => r.getAttribute("tabindex") === "0");
    expect(stops).toHaveLength(1);
    expect(stops[0]).toHaveAttribute("data-method", "qr");
  });

  it("falls back to the first usable method as the tab stop when nothing is selected", () => {
    picker({ value: null, options: { bluetooth: { unavailable: true } } });
    const stop = screen.getAllByRole("radio").find((r) => r.getAttribute("tabindex") === "0")!;
    expect(stop).toHaveAttribute("data-method", "network");
  });

  it("moves focus and selection with the arrow keys, wrapping, Home and End", () => {
    const { onChange } = picker();
    const qr = screen.getByRole("radio", { name: /Scan QR code/ });
    fireEvent.keyDown(qr, { key: "ArrowDown" });
    expect(onChange).toHaveBeenLastCalledWith("manual-code");
    expect(screen.getByRole("radio", { name: /Enter a code/ })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("radio", { name: /Enter a code/ }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("cloud");
    fireEvent.keyDown(screen.getByRole("radio", { name: /Account/ }), { key: "ArrowDown" });
    expect(onChange).toHaveBeenLastCalledWith("bluetooth"); // wraps
    fireEvent.keyDown(screen.getByRole("radio", { name: /Bluetooth/ }), { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith("cloud");
    fireEvent.keyDown(screen.getByRole("radio", { name: /Account/ }), { key: "Home" });
    expect(onChange).toHaveBeenLastCalledWith("bluetooth");
    fireEvent.keyDown(screen.getByRole("radio", { name: /Bluetooth/ }), { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith("cloud");
  });

  it("selects on click", () => {
    const { onChange } = picker();
    fireEvent.click(screen.getByRole("radio", { name: /Bluetooth/ }));
    expect(onChange).toHaveBeenCalledWith("bluetooth");
  });

  it("shows an unavailable method with its reason, skips it with the arrows, and will not select it", () => {
    const { onChange } = picker({
      value: "network",
      options: { qr: { unavailable: true, unavailableReason: "Camera permission is off" } },
    });
    const qr = screen.getByRole("radio", { name: /Scan QR code/ });
    expect(qr).toHaveAttribute("aria-disabled", "true");
    expect(qr).toHaveTextContent("Unavailable: Camera permission is off");
    // The reason is the description, so it is announced with the name.
    expect(document.getElementById(qr.getAttribute("aria-describedby")!)).toHaveTextContent("Camera permission is off");
    fireEvent.click(qr);
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole("radio", { name: /Same network/ }), { key: "ArrowDown" });
    expect(onChange).toHaveBeenLastCalledWith("manual-code");
  });

  it("lets a product override labels and descriptions and offer a subset", () => {
    const methods: KinetixPairingMethod[] = ["bluetooth", "cloud"];
    picker({ methods, value: "bluetooth", options: { bluetooth: { label: "Nearby", description: "Hold the phone close to the hub" } } });
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    const nearby = screen.getByRole("radio", { name: /Nearby/ });
    expect(document.getElementById(nearby.getAttribute("aria-describedby")!)).toHaveTextContent("Hold the phone close");
  });

  it("marks the selection with a shape as well as a colour", () => {
    picker();
    // The selected tile carries a check glyph (a shape) and a heavier title; the others carry neither.
    const check = (name: RegExp) => screen.getByRole("radio", { name }).querySelector('svg[data-glyph="check"]');
    expect(check(/Scan QR code/)).not.toBeNull();
    expect(check(/Bluetooth/)).toBeNull();
    expect(screen.getByRole("radio", { name: /Scan QR code/ })).toHaveAttribute("data-state", "selected");
  });

  it("draws an original icon in every tile and hides it from assistive technology", () => {
    picker();
    for (const radio of screen.getAllByRole("radio")) {
      const icon = radio.querySelector("svg:not([data-glyph])");
      expect(icon).not.toBeNull();
      expect(icon).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("does nothing and takes no tab stop when disabled", () => {
    const { onChange } = picker({ disabled: true });
    for (const r of screen.getAllByRole("radio")) expect(r).toHaveAttribute("tabindex", "-1");
    fireEvent.click(screen.getByRole("radio", { name: /Bluetooth/ }));
    fireEvent.keyDown(screen.getByRole("radio", { name: /Scan QR code/ }), { key: "ArrowDown" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("announces nothing, is axe-clean and uses logical properties in RTL", async () => {
    const { container } = render(
      <div dir="rtl">
        <PairingMethodPicker value="qr" options={{ bluetooth: { unavailable: true, unavailableReason: "Bluetooth is off" }, network: { description: "Phone and hub on one Wi-Fi" } }} />
      </div>,
    );
    expect(liveRegions(container)).toHaveLength(0);
    expect(container.innerHTML).not.toMatch(PHYSICAL);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ PairingStepper */

describe("PairingStepper", () => {
  it("derives its steps from the flow and marks the current one", () => {
    let flow = advancePairing(startPairingFlow(), { type: "start", method: "qr" });
    flow = advancePairing(flow, { type: "next" });
    render(<PairingStepper flow={flow} />);
    const items = within(screen.getByRole("list", { name: "Pairing progress" })).getAllByRole("listitem");
    expect(items.map((i) => i.getAttribute("data-step"))).toEqual(["discover", "identify", "authenticate", "configure", "assign", "verify"]);
    expect(items.map((i) => i.getAttribute("data-step-status"))).toEqual(["complete", "active", "pending", "pending", "pending", "pending"]);
    expect(items.filter((i) => i.hasAttribute("aria-current")).map((i) => i.getAttribute("data-step"))).toEqual(["identify"]);
    expect(items[0]).toHaveTextContent("Done");
    expect(items[1]).toHaveTextContent("In progress");
    expect(items[2]).toHaveTextContent("Not started");
  });

  it("marks a failed step as needing attention, as the current step, with its own shape", () => {
    let flow = advancePairing(startPairingFlow(), { type: "start", method: "qr" });
    flow = advancePairing(flow, { type: "fail", code: "timeout" });
    render(<PairingStepper flow={flow} />);
    const failed = document.querySelector('[data-step-status="error"]')!;
    expect(failed).toHaveTextContent("Needs attention");
    expect(failed).toHaveAttribute("aria-current", "step");
    const glyphs = [...document.querySelectorAll("li")].map((li) => [li.getAttribute("data-step-status"), li.querySelector("svg")!.getAttribute("data-glyph")]);
    expect(new Map(glyphs).get("error")).toBe("octagon");
    expect(new Map(glyphs).get("complete") ?? "check").toBe("check");
    expect(new Set(glyphs.map((g) => g[1])).size).toBeGreaterThanOrEqual(2);
  });

  it("marks everything done when the flow is complete", () => {
    let flow = advancePairing(startPairingFlow(), { type: "start", method: "cloud" });
    for (let i = 0; i < 6; i++) flow = advancePairing(flow, { type: "next" });
    render(<PairingStepper flow={flow} />);
    expect([...document.querySelectorAll("li")].every((li) => li.getAttribute("data-step-status") === "complete")).toBe(true);
    expect(document.querySelector("[aria-current]")).toBeNull();
  });

  it("accepts explicit steps and a horizontal layout", () => {
    const { container } = render(<PairingStepper horizontal label="Setup" steps={[{ id: "a", label: "Plug in", status: "complete" }, { id: "b", label: "Connect", status: "active" }]} />);
    expect(screen.getByRole("list", { name: "Setup" })).toBeInTheDocument();
    expect(container.querySelector("ol")!.className).toMatch(/flex-row/);
  });

  it("announces nothing, is axe-clean and uses logical properties in RTL", async () => {
    const flow = advancePairing(startPairingFlow(), { type: "start", method: "qr" });
    const { container } = render(
      <div dir="rtl">
        <PairingStepper flow={flow} />
      </div>,
    );
    expect(liveRegions(container)).toHaveLength(0);
    expect(container.innerHTML).not.toMatch(PHYSICAL);
    expect(await axeViolations(container)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ PairingFailure */

describe("PairingFailure", () => {
  it("is an alert named by the failure's title and described by what was observed", () => {
    render(<PairingFailure code="device-not-found" />);
    const alert = screen.getByRole("alert");
    const info = KINETIX_PAIRING_FAILURES["device-not-found"];
    expect(alert).toHaveAccessibleName(info.title);
    expect(alert).toHaveAccessibleDescription(info.description);
    expect(alert).toHaveAttribute("data-failure-code", "device-not-found");
  });

  it("is visibly not a generic error: a glyph and the words 'Pairing problem'", () => {
    const { container } = render(<PairingFailure code="timeout" />);
    expect(container).toHaveTextContent("Pairing problem");
    expect(container.querySelector("svg")).toHaveAttribute("data-glyph", "octagon");
  });

  it.each(Object.keys(KINETIX_PAIRING_FAILURES) as KinetixPairingFailureCode[])("hands every recovery action for %s back by id", (code) => {
    const onAction = vi.fn();
    const info = KINETIX_PAIRING_FAILURES[code];
    const { unmount } = render(<PairingFailure code={code} onAction={onAction} />);
    const expected = info.recovery.filter((a) => !(a.kind === "retry" && !info.retryable));
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(expected.map((a) => a.label));
    buttons.forEach((button, i) => {
      fireEvent.click(button);
      expect(onAction).toHaveBeenLastCalledWith(expected[i]!.id, expected[i]);
    });
    expect(onAction).toHaveBeenCalledTimes(expected.length);
    unmount();
  });

  it("supports back, cancel and retry as first-class recoveries", () => {
    const kinds = new Set(Object.values(KINETIX_PAIRING_FAILURES).flatMap((f) => f.recovery.map((a) => a.kind)));
    for (const kind of ["retry", "back", "cancel"] as const) expect(kinds.has(kind)).toBe(true);
  });

  it("drops Retry for a failure that cannot be fixed by repeating the step", () => {
    const code = (Object.keys(KINETIX_PAIRING_FAILURES) as KinetixPairingFailureCode[]).find((c) => !KINETIX_PAIRING_FAILURES[c].retryable && KINETIX_PAIRING_FAILURES[c].recovery.some((a) => a.kind === "retry"));
    if (!code) return; // the registry never offers retry where it cannot help — the filter is then a guard, not an exercised path
    render(<PairingFailure code={code} />);
    expect(screen.queryByRole("button", { name: /try again|retry/i })).toBeNull();
  });

  it("says a failure can leave setup partly finished only where the registry says so", () => {
    for (const code of Object.keys(KINETIX_PAIRING_FAILURES) as KinetixPairingFailureCode[]) {
      const { container, unmount } = render(<PairingFailure code={code} />);
      expect(container.querySelector("[data-needs-cleanup]") !== null, code).toBe(KINETIX_PAIRING_FAILURES[code].needsCleanup);
      unmount();
    }
  });

  it("gives an unrecognised code a generic, usable failure rather than nothing", () => {
    render(<PairingFailure code="not-a-code" onAction={() => {}} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });

  it("takes localised title, description and actions, ignoring blank overrides", () => {
    const onAction = vi.fn();
    const { rerender } = render(<PairingFailure code="timeout" title="Tiempo agotado" description="No respondió." actions={[{ id: "again", label: "Reintentar", kind: "retry" }]} onAction={onAction} />);
    expect(screen.getByRole("alert")).toHaveAccessibleName("Tiempo agotado");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onAction).toHaveBeenCalledWith("again", { id: "again", label: "Reintentar", kind: "retry" });
    rerender(<PairingFailure code="timeout" title="  " description="" />);
    expect(screen.getByRole("alert")).toHaveAccessibleName(KINETIX_PAIRING_FAILURES.timeout.title);
  });

  it("is the only assertive region and is axe-clean, in RTL with logical properties", async () => {
    const { container } = render(
      <div dir="rtl">
        <PairingFailure code="permission-denied" onAction={() => {}} />
      </div>,
    );
    expect(container.querySelectorAll('[role="alert"]')).toHaveLength(1);
    expect(container.querySelector('[role="status"],[aria-live]')).toBeNull();
    expect(container.innerHTML).not.toMatch(PHYSICAL);
    expect(await axeViolations(container)).toEqual([]);
  });
});
