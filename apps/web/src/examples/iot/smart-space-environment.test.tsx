import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SmartSpaceEnvironmentExample } from "./smart-space-environment";
import { smartSpaceAlerts, smartSpaceAutomations, smartSpaceSpaces } from "./scenarios/smart-space";

/** The scenario's own alerts, split the way the aside splits them. Real data, never a typed-in number. */
const openAlerts = smartSpaceAlerts.filter((a) => !a.acknowledgedAt && !a.resolvedAt);
const handledAlerts = smartSpaceAlerts.filter((a) => a.acknowledgedAt || a.resolvedAt);
const scenes = smartSpaceAutomations.filter((a) => a.kind === "scene");
const selfRunning = smartSpaceAutomations.filter((a) => a.kind !== "scene");

/** The `<details>` whose summary starts with this title, and that summary as one normalised string. */
const groupNamed = (title: string) =>
  [...document.querySelectorAll("details")].find((d) => summaryOf(d).startsWith(title))!;
const summaryOf = (group: HTMLDetailsElement) => group.querySelector("summary")!.textContent!.replace(/\s+/g, " ").trim();

const tick = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
const rail = () => within(screen.getByRole("list", { name: "Home and rooms" }));

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("smart space: connected space", () => {
  it("starts on the hallway, the richest room, with the selected rail item marked", () => {
    render(<SmartSpaceEnvironmentExample />);
    expect(screen.getByRole("heading", { name: "Hallway" })).toBeInTheDocument();
    expect(rail().getByRole("button", { name: /Hallway/ })).toHaveAttribute("aria-current", "true");
    expect(rail().getByRole("button", { name: /Living room/ })).not.toHaveAttribute("aria-current");
  });

  it("switches rooms from the rail and shows only what that room has", () => {
    render(<SmartSpaceEnvironmentExample />);
    expect(screen.getByRole("radiogroup", { name: /Front door lock/ })).toBeInTheDocument();
    fireEvent.click(rail().getByRole("button", { name: /Living room/ }));
    expect(screen.getByRole("heading", { name: "Living room" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /Living room lamp power/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Air · Living room/ })).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: /Front door lock/ })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Hallway thermostat" })).toBeNull();
    expect(rail().getByRole("button", { name: /Living room/ })).toHaveAttribute("aria-current", "true");
  });

  it("keeps a request unconfirmed and worded until the device reports it", () => {
    render(<SmartSpaceEnvironmentExample />);
    fireEvent.click(rail().getByRole("button", { name: /Living room/ }));
    const power = screen.getByRole("switch", { name: /Living room lamp power/ });
    expect(power).toBeChecked();
    fireEvent.click(power);
    // Confirmed value unchanged, the request is words, and the plan marker says so too.
    expect(screen.getByRole("switch", { name: /Living room lamp power/ })).toBeChecked();
    expect(document.body.textContent).toMatch(/requested Off/i);
    expect(screen.getByRole("button", { name: /Living room lamp, 60%, requested Off, not yet confirmed/ })).toHaveAttribute("data-state", "pending");
    tick(2000);
    expect(screen.getByRole("switch", { name: /Living room lamp power/ })).not.toBeChecked();
  });

  it("selects a device from its hotspot and narrows the focus to it", () => {
    render(<SmartSpaceEnvironmentExample />);
    fireEvent.click(screen.getByRole("button", { name: /^Living room lamp,/ }));
    expect(screen.getByRole("heading", { name: "Living room" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Living room lamp,/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("heading", { name: /Air · Living room/ })).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Whole room" }));
    expect(screen.getByRole("heading", { name: /Air · Living room/ })).toBeInTheDocument();
  });

  it("marks the offline lamp as offline, in words, on the plan and keeps its last settings", () => {
    render(<SmartSpaceEnvironmentExample />);
    fireEvent.click(rail().getByRole("button", { name: /Bedroom/ }));
    expect(screen.getByRole("button", { name: /Bedroom lamp.*offline/ })).toHaveAttribute("data-state", "offline");
    expect(screen.getAllByText(/Offline\. Showing the last known settings/).length).toBeGreaterThan(0);
  });

  it("shows the whole home as device tiles and puts the lock control only in its room", () => {
    render(<SmartSpaceEnvironmentExample />);
    fireEvent.click(rail().getByRole("button", { name: /Whole home/ }));
    expect(screen.getAllByRole("heading", { name: "Demo home" }).length).toBe(2);
    expect(screen.getAllByRole("button", { name: /Hallway thermostat/, pressed: false }).length).toBe(2);
    expect(screen.queryByRole("radiogroup", { name: /Front door lock/ })).toBeNull();
  });

  it("is reachable and operable by keyboard: rail item by Enter, device pills by arrow keys", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<SmartSpaceEnvironmentExample />);
    const office = rail().getByRole("button", { name: /Office/ });
    office.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("heading", { name: "Office" })).toBeInTheDocument();
    await user.click(rail().getByRole("button", { name: /Hallway/ }));
    const group = screen.getByRole("radiogroup", { name: /Devices in Hallway/ });
    const whole = within(group).getByRole("radio", { name: "Whole room" });
    whole.focus();
    await user.keyboard("{ArrowRight}");
    expect(within(group).getByRole("radio", { name: /Hallway thermostat/ })).toBeChecked();
  });

  it("keeps alerts visible, acknowledges without hiding them, and jumps to them from the header", () => {
    render(<SmartSpaceEnvironmentExample />);
    const region = document.getElementById("space-alerts")!;
    const before = within(region).getAllByRole("button", { name: /acknowledge/i }).length;
    fireEvent.click(within(region).getAllByRole("button", { name: /acknowledge/i })[0]!);
    expect(within(region).getAllByRole("button", { name: /acknowledge/i }).length).toBe(before - 1);
    const scroll = vi.fn();
    region.scrollIntoView = scroll;
    fireEvent.click(screen.getByRole("button", { name: /Jump to alerts/ }));
    expect(scroll).toHaveBeenCalled();
    expect(document.activeElement).toBe(region);
  });

  it("labels scenes as shown, not executed, and energy as simulated", () => {
    render(<SmartSpaceEnvironmentExample />);
    expect(screen.getByText(/Shown, not executed/)).toBeInTheDocument();
    expect(screen.getAllByText(/Simulated/).length).toBeGreaterThan(0);
  });

  // ---- the aside is ranked: open alerts always expanded, everything below grouped behind a real count ----

  it("keeps every open alert expanded, never behind a disclosure", () => {
    render(<SmartSpaceEnvironmentExample />);
    const region = document.getElementById("space-alerts")!;
    expect(openAlerts.length).toBeGreaterThan(0);
    for (const alert of openAlerts) {
      const row = screen.getByText(alert.message);
      expect(row).toBeInTheDocument();
      expect(row.closest("details")).toBeNull();
      expect(region.contains(row)).toBe(true);
    }
  });

  it("groups acknowledged alerts behind their real count without dropping them", () => {
    render(<SmartSpaceEnvironmentExample />);
    expect(handledAlerts.length).toBeGreaterThan(0);
    const group = groupNamed("Acknowledged");
    expect(group.open).toBe(false);
    expect(summaryOf(group)).toBe(`Acknowledged${handledAlerts.length} acknowledged alerts`);
    for (const alert of handledAlerts) expect(within(group).getByText(alert.message)).toBeInTheDocument();
  });

  it("moves an alert into the acknowledged group when it is acknowledged, and the count follows", () => {
    render(<SmartSpaceEnvironmentExample />);
    const region = document.getElementById("space-alerts")!;
    expect(summaryOf(groupNamed("Acknowledged"))).toMatch(/^Acknowledged1 acknowledged alerts$/);
    fireEvent.click(within(region).getAllByRole("button", { name: /acknowledge/i })[0]!);
    expect(summaryOf(groupNamed("Acknowledged"))).toMatch(/^Acknowledged2 acknowledged alerts$/);
  });

  it("shows the three latest events of the day and keeps the rest behind their real count", () => {
    render(<SmartSpaceEnvironmentExample />);
    const events = (name: string) => within(screen.getByRole("list", { name })).getAllByRole("listitem").filter((li) => li.hasAttribute("data-kind"));
    expect(events("Activity").length).toBe(3);
    const earlier = groupNamed("Earlier on this day");
    expect(earlier.open).toBe(false);
    const rest = events("Earlier activity").length;
    expect(rest).toBeGreaterThan(0);
    expect(summaryOf(earlier)).toBe(`Earlier on this day${rest} earlier events`);
  });

  it("leads with the scenes and groups the routines that run themselves behind their real count", () => {
    render(<SmartSpaceEnvironmentExample />);
    expect(scenes.length).toBeGreaterThan(0);
    expect(selfRunning.length).toBeGreaterThan(0);
    const group = groupNamed("Runs on its own");
    expect(group.open).toBe(false);
    expect(summaryOf(group)).toBe(`Runs on its own${selfRunning.length} routines and schedules`);
    // Scenes lead, outside the group; the self-firing ones are inside it. Nothing is dropped.
    for (const scene of scenes) expect(group.contains(screen.getByText(scene.name))).toBe(false);
    for (const routine of selfRunning) expect(within(group).getByText(routine.name)).toBeInTheDocument();
    // The honesty line covers both groups and stays outside them.
    expect(group.contains(screen.getByText(/Shown, not executed/))).toBe(false);
  });

  // ---- the phone header is ranked: one summary line, quiet metadata, then the rooms ----

  it("says how much is online and how much needs attention in ONE summary line, not two chips", () => {
    render(<SmartSpaceEnvironmentExample />);
    const summary = screen.getByText(/^\d+ of \d+ online · \d+ needs? attention$/);
    expect(summary).toBeInTheDocument();
    // The attention count no longer stands as its own labelled chip beside the title.
    expect(screen.queryByText("Attention", { selector: "span" })).toBeNull();
    // The attention half of the line is the scenario's own open alerts, not a typed-in number.
    expect(summary.textContent).toMatch(new RegExp(`· ${openAlerts.length} needs? attention$`));
  });

  it("prints the fabricated address in full, quietly, and never behind an ellipsis", () => {
    render(<SmartSpaceEnvironmentExample />);
    const address = screen.getByText("12 Example Lane, Sample City (fabricated)");
    expect(address.className).not.toMatch(/truncate/);
    expect(address.closest(".truncate")).toBeNull();
    expect(address.closest("p")!.className).toMatch(/text-body-sm/);
  });

  it("keeps the clock labelled as simulated even though it is demoted to metadata", () => {
    render(<SmartSpaceEnvironmentExample />);
    expect(screen.getByText(/^Simulated clock \d\d:\d\d UTC$/)).toBeInTheDocument();
  });

  it("gives each floor a labelled list of its rooms, one room per row below `sm`", () => {
    render(<SmartSpaceEnvironmentExample />);
    const floors = smartSpaceSpaces.filter((s) => s.kind === "floor");
    expect(floors.length).toBeGreaterThan(0);
    for (const floor of floors) {
      const list = screen.getByRole("list", { name: floor.name });
      // A two-column grid at phone width clipped the names and left a dead cell beside an odd room count.
      expect(list.className).not.toMatch(/(^|\s)grid(\s|$)|grid-cols-2/);
      expect(list.className).toMatch(/flex flex-col/);
      expect(list.className).toMatch(/sm:grid-cols-3/);
      const rooms = smartSpaceSpaces.filter((s) => s.parentId === floor.id);
      expect(within(list).getAllByRole("button").length).toBe(rooms.length);
      for (const room of rooms) expect(within(list).getByRole("button", { name: new RegExp(room.name) })).toBeInTheDocument();
    }
  });

  it("breaks a room name that is wider than its tile instead of letting it spill", () => {
    render(<SmartSpaceEnvironmentExample />);
    for (const button of rail().getAllByRole("button")) expect(button.className).toMatch(/break-words/);
  });

  it("marks the selected room with more than a tint below `sm`, and moves the mark when the room changes", () => {
    render(<SmartSpaceEnvironmentExample />);
    const selectedRing = /ring-2 ring-inset ring-primary sm:ring-0/;
    expect(rail().getByRole("button", { name: /Hallway/ }).className).toMatch(selectedRing);
    expect(rail().getByRole("button", { name: /Office/ }).className).not.toMatch(selectedRing);
    fireEvent.click(rail().getByRole("button", { name: /Office/ }));
    expect(rail().getByRole("button", { name: /Office/ }).className).toMatch(selectedRing);
    expect(rail().getByRole("button", { name: /Hallway/ }).className).not.toMatch(selectedRing);
  });

  it("keeps stale and warning wording in the rail rather than trading truth for compactness", () => {
    render(<SmartSpaceEnvironmentExample />);
    // `RailItem` renders the state line as one nowrap span per "·"-separated segment, so that a
    // measurement never breaks between its number and its unit. The words are therefore spread across
    // sibling elements and a single-element text matcher cannot see them — assert on the row's text.
    const bedroom = rail().getByRole("button", { name: /Bedroom/ });
    expect(bedroom.textContent?.replace(/\s+/g, " ")).toContain("18.9 °C · stale");
    expect(rail().getByRole("button", { name: /Bedroom/ }).textContent).toMatch(/needs attention|offline/);
    expect(rail().getByRole("button", { name: /Bedroom/ })).toHaveAccessibleName(/offline/);
  });

  it("keeps the room name larger than the room temperature on a phone, and the temperature as it was from `sm`", () => {
    render(<SmartSpaceEnvironmentExample />);
    const temperature = screen.getByText(/Room temperature ·/).previousElementSibling!;
    expect(temperature.className).toMatch(/text-headline-sm/);
    expect(temperature.className).toMatch(/sm:text-display-sm/);
    expect(screen.getByRole("heading", { name: "Hallway" }).className).toMatch(/text-headline-lg/);
  });

  it("opens a group on click and its contents stay operable", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<SmartSpaceEnvironmentExample />);
    const group = groupNamed("Runs on its own");
    await user.click(group.querySelector("summary")!);
    expect(group.open).toBe(true);
    const toggle = within(group).getByRole("switch", { name: /Away mode enabled/ });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    await user.click(toggle);
    expect(within(group).getByRole("switch", { name: /Away mode enabled/ })).toHaveAttribute("aria-checked", "true");
  });
});
