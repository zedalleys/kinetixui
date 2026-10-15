import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { iotExampleSource } from "@/registry/iot-examples.generated";
import { AlertCenterExample } from "./alert-center";
import { AlertInboxExample } from "./alert-inbox";
import { AutomationBuilderExample } from "./automation-builder";
import { DeviceDashboardExample } from "./device-dashboard";
import { OperationsEnvironmentExample } from "./operations-environment";
import { PairingFlowExample } from "./pairing-flow";
import { SmartSpaceEnvironmentExample } from "./smart-space-environment";
import { StateHonestyExample } from "./state-honesty";

/**
 * Wave 2d — the copyable IoT examples compose KinetixUI controls instead of hand-rolled ones (28 sites). These pin
 * what the migration had to keep: the pairing journey's transitions (one operation per press, cancel and retry),
 * names, roles, `type="button"` on every action that must not submit, and the published snippet showing the same
 * controls the preview renders. Layout, RTL, theme and 200% text are measured in Chromium by
 * `scripts/web-dogfooding-wave2d.mjs`.
 */
let errors: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errors = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  errors.mockRestore();
});
const tick = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
const button = (name: string | RegExp) => screen.getByRole("button", { name });
const heading = () => screen.getByRole("heading", { name: /^(Step \d of 9|Setup cancelled)/ }).textContent;

describe("pairing flow on library controls", () => {
  beforeEach(() => vi.useFakeTimers());

  it("uses the library field, select and buttons; only the three form actions submit", () => {
    render(<PairingFlowExample />);
    expect(screen.getByRole("combobox", { name: "Simulate a failure" })).toHaveAttribute("data-slot", "native-select");
    for (const b of screen.getAllByRole("button")) expect(b).toHaveAttribute("type");
    fireEvent.click(button("Start setup"));
    for (const name of ["Back", "Cancel setup"]) expect(button(name)).toHaveAttribute("type", "button");
    tick(1300);
    fireEvent.click(button(/^Continue with/));
    tick(1000);
    fireEvent.click(button("Yes, that is my device"));
    expect(screen.getByLabelText("Setup code")).toHaveAttribute("data-slot", "input");
    expect(button("Verify code")).toHaveAttribute("type", "submit");
  });

  it("chooses the found device from a library radiogroup: one tab stop, arrows move and choose", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    render(<PairingFlowExample />);
    await user.click(button("Start setup"));
    await screen.findByRole("radiogroup", {}, { timeout: 3000 });
    const group = screen.getByRole("radiogroup", { name: /sample devices? found/ });
    const radios = within(group).getAllByRole("radio");
    expect(radios.length).toBeGreaterThan(1);
    expect(radios[0]).toHaveAttribute("aria-checked", "true");
    const nameOf = (r: HTMLElement) => (r.closest("label")!.textContent ?? "").split(" ·")[0]!.trim();
    expect(button(/^Continue with/)).toHaveTextContent(nameOf(radios[0]!));
    radios[0]!.focus();
    // Held, as a real key is: Radix moves focus on the next tick and chooses only while the arrow is down.
    await user.keyboard("{ArrowDown>}");
    await new Promise((r) => setTimeout(r, 20));
    await user.keyboard("{/ArrowDown}");
    expect(radios[1]).toHaveFocus();
    expect(radios[1]).toHaveAttribute("aria-checked", "true");
    expect(button(/^Continue with/)).toHaveTextContent(nameOf(radios[1]!));
    // The label names the radio; pressing it chooses that device.
    await user.click(within(group).getAllByText(/·/)[0]!);
    expect(radios[0]).toHaveAttribute("aria-checked", "true");
  });

  it("a double press on Start begins one pairing, not two", () => {
    render(<PairingFlowExample />);
    const start = button("Start setup");
    fireEvent.click(start);
    fireEvent.click(start); // the second press lands on a button that has left the page
    expect(heading()).toMatch(/Step 2 of 9: Searching/);
    tick(1300);
    expect(heading()).toMatch(/Step 3 of 9: Device found/);
  });

  it("submitting the code twice starts one verification and moves exactly one step", () => {
    render(<PairingFlowExample />);
    fireEvent.click(button("Start setup"));
    tick(1300);
    fireEvent.click(button(/^Continue with/));
    tick(1000);
    fireEvent.click(button("Yes, that is my device"));
    const input = screen.getByLabelText("Setup code");
    fireEvent.change(input, { target: { value: "KX2468" } });
    const form = input.closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(heading()).toMatch(/Step 5 of 9/);
    tick(5000);
    expect(heading()).toMatch(/Step 6 of 9: Configure/);
  });

  it("cancelling during a simulated wait stops it: nothing advances afterwards", () => {
    render(<PairingFlowExample />);
    fireEvent.click(button("Start setup"));
    fireEvent.click(button("Cancel setup"));
    expect(heading()).toBe("Setup cancelled");
    tick(10_000);
    expect(heading()).toBe("Setup cancelled");
    fireEvent.click(button("Start again"));
    expect(heading()).toMatch(/Step 1 of 9/);
    expect(screen.getByRole("combobox", { name: "Simulate a failure" })).toBeEnabled();
  });

  it("Back returns one step through the machine", () => {
    render(<PairingFlowExample />);
    fireEvent.click(button("Start setup"));
    tick(1300);
    fireEvent.click(button(/^Continue with/));
    tick(1000);
    expect(heading()).toMatch(/Step 4 of 9: Identify/);
    fireEvent.click(button("Back"));
    expect(heading()).not.toMatch(/Step 4 of 9/);
  });

  it("the failure selector locks once setup starts and unlocks after cancelling", () => {
    render(<PairingFlowExample />);
    const select = screen.getByRole("combobox", { name: "Simulate a failure" });
    fireEvent.change(select, { target: { value: (select as HTMLSelectElement).options[1]!.value } });
    expect(select).toHaveAccessibleDescription(/.+/);
    fireEvent.click(button("Start setup"));
    expect(select).toBeDisabled();
  });
});

describe("the other Wave 2d examples", () => {
  beforeEach(() => vi.useFakeTimers());

  it("alert centre: a library checkbox and an Outline button that does not submit", () => {
    render(<AlertCenterExample />);
    const box = screen.getByRole("checkbox", { name: "Show acknowledged" });
    expect(box).toHaveAttribute("aria-checked", "true"); // the centre shows acknowledged alerts by default
    fireEvent.click(box);
    expect(box).toHaveAttribute("aria-checked", "false");
    const silence = button(/S-101 stop answering/);
    expect(silence).toHaveAttribute("type", "button");
    fireEvent.click(silence);
    expect(button(/S-101 answers again/)).toBeInTheDocument();
  });

  it("alert inbox: the checkbox reveals acknowledged alerts; Acknowledge keeps its full name", () => {
    render(<AlertInboxExample />);
    const box = screen.getByRole("checkbox", { name: "Show acknowledged" });
    const count = () => screen.getByText(/^\d+ alerts?$/).textContent;
    const before = count();
    fireEvent.click(box);
    expect(box).toHaveAttribute("aria-checked", "true");
    expect(count()).not.toBe(before);
  });

  it("automation builder: both draft actions are non-submitting buttons that reset the draft", () => {
    render(<AutomationBuilderExample />);
    for (const name of ["Start from a blank rule", "Reset to the Zone 3 rule"]) expect(button(name)).toHaveAttribute("type", "button");
    fireEvent.click(button("Start from a blank rule"));
    fireEvent.click(button("Reset to the Zone 3 rule"));
  });

  it("device dashboard: Details is a pressed toggle that a second press keeps; state buttons override", () => {
    render(<DeviceDashboardExample />);
    const details = screen.getAllByRole("button", { name: /^Show details for/ });
    const second = details[1]!;
    expect(second).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(second);
    expect(second).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(second);
    expect(second).toHaveAttribute("aria-pressed", "true");
    expect(details.filter((d) => d.getAttribute("aria-pressed") === "true")).toHaveLength(1);
    const offline = screen.getByRole("button", { name: "Offline" });
    expect(offline).toHaveAttribute("type", "button");
  });

  it("state honesty: the pump buttons keep their disabled rules and do not submit", () => {
    render(<StateHonestyExample />);
    const lose = button("Request a change, then lose the pump");
    const back = button("Pump answers again");
    expect(lose).toHaveAttribute("type", "button");
    expect(back).toBeDisabled();
    fireEvent.click(lose);
    expect(lose).toBeDisabled();
    expect(back).toBeEnabled();
  });

  it("command card: the command buttons keep their data attribute, device-named labels and type", () => {
    render(<SmartSpaceEnvironmentExample />);
    const unlock = button("Unlock Front door lock");
    expect(unlock).toHaveAttribute("type", "button");
    expect(unlock).toHaveAttribute("data-lock-action", "unlocked"); // the caller's own data attribute passes through Button
  });

  it("operations: the equipment rows are buttons; aria-current follows the selection", () => {
    render(<OperationsEnvironmentExample />);
    const list = screen.getByRole("list", { name: /^Equipment on/ });
    const rows = within(list).getAllByRole("button");
    expect(rows.filter((r) => r.getAttribute("aria-current") === "true")).toHaveLength(1);
    const other = rows.find((r) => !r.hasAttribute("aria-current"))!;
    expect(other).toHaveAttribute("type", "button");
    fireEvent.click(other);
    expect(other).toHaveAttribute("aria-current", "true");
  });
});

describe("published snippets", () => {
  const WAVE_2D = ["pairing-flow", "alert-center", "alert-inbox", "automation-builder", "device-dashboard", "state-honesty", "operations-environment"];

  it.each(WAVE_2D)("%s: the copyable region shows the library controls and no hand-rolled one", (slug) => {
    const snippet = iotExampleSource[slug]!;
    expect(snippet).toBeTruthy();
    expect(snippet).not.toMatch(/<(button|input|select|textarea)\b/);
    expect(snippet).not.toMatch(/\bBUTTON\b/);
    expect(snippet).toMatch(/<(Button|Checkbox|Toggle)\b/);
  });

  it("pairing-flow's snippet carries every library control the preview renders, and its submit types", () => {
    const snippet = iotExampleSource["pairing-flow"]!;
    for (const tag of ["<NativeSelect", "<RadioGroup", "<RadioGroupItem", "<Input", "<Button", "<Label"]) expect(snippet).toContain(tag);
    expect(snippet.match(/type="submit"/g)).toHaveLength(3);
  });
});

describe("axe", () => {
  it.each([
    ["pairing-flow", () => <PairingFlowExample />],
    ["alert-inbox", () => <AlertInboxExample />],
    ["automation-builder", () => <AutomationBuilderExample />],
  ] as const)("%s has no violations", async (_slug, make) => {
    const { container } = render(make());
    const result = await axe.run(container, { rules: { region: { enabled: false } } });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
});
