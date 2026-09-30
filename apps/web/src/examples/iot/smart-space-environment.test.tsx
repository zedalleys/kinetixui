import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SmartSpaceEnvironmentExample } from "./smart-space-environment";

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
});
