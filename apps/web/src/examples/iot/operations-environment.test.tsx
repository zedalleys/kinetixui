import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OperationsEnvironmentExample } from "./operations-environment";

/** The supervisor console: derived figures, selection, and requested-versus-confirmed honesty. */
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
const tick = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

describe("operations environment", () => {
  it("derives utilisation from confirmed power, not from typed numbers", () => {
    render(<OperationsEnvironmentExample />);
    // 12 machines, one of them (P-102) confirmed off.
    expect(screen.getByText("11 of 12 machines running")).toBeInTheDocument();
    expect(screen.getByText("92")).toBeInTheDocument();
  });

  it("puts the alert queue first and keeps an acknowledged alert on the list", () => {
    render(<OperationsEnvironmentExample />);
    const queue = screen.getByRole("list", { name: "Site 04 alerts" });
    const before = within(queue).getAllByRole("button", { name: /acknowledge/i });
    fireEvent.click(before[0]!);
    expect(within(queue).getAllByRole("listitem").length).toBe(3);
    expect(within(queue).getAllByRole("button", { name: /acknowledge/i }).length).toBe(before.length - 1);
  });

  it("selecting a line moves the inspector to the machine that needs a look", () => {
    render(<OperationsEnvironmentExample />);
    expect(screen.getByRole("region", { name: /Selected machine: Transfer pump P-201/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Line 3 · Utilities/ }));
    expect(screen.getByRole("region", { name: /Selected machine: Site gateway G-01/ })).toBeInTheDocument();
    expect(screen.getByText(/Availability is application-provided demo data/)).toBeInTheDocument();
  });

  it("shows an offline meter as offline with no live reading, and its history as stale", () => {
    render(<OperationsEnvironmentExample />);
    fireEvent.click(within(screen.getByRole("list", { name: /Equipment on Line 2/ })).getByRole("button", { name: /Line 2 meter E-201/ }));
    const inspector = screen.getByRole("region", { name: /Selected machine: Line 2 meter E-201/ });
    expect(within(inspector).getByText(/Offline\. Showing the last known settings/)).toBeInTheDocument();
    expect(within(inspector).getByText(/accepts no commands until it reconnects/)).toBeInTheDocument();
    expect(screen.getAllByText(/stale, not current readings/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/No reading/).length).toBeGreaterThan(0);
  });

  it("a run request stays requested, not confirmed, until the device reports", () => {
    render(<OperationsEnvironmentExample />);
    const inspector = screen.getByRole("region", { name: /Selected machine: Transfer pump P-201/ });
    const run = within(inspector).getByRole("switch", { name: "Transfer pump P-201 run" });
    expect(run).toHaveAttribute("aria-checked", "true");
    fireEvent.click(run);
    // Immediately after the request the confirmed value is unchanged and the request is worded.
    expect(within(inspector).getByRole("switch", { name: "Transfer pump P-201 run" })).toHaveAttribute("aria-checked", "true");
    expect(within(inspector).getAllByText(/requested off/i).length).toBeGreaterThan(0);
    expect(within(inspector).getByRole("switch", { name: "Transfer pump P-201 run" })).toBeDisabled();
    tick(5000);
    expect(within(screen.getByRole("region", { name: /Selected machine: Transfer pump P-201/ })).getByRole("switch", { name: "Transfer pump P-201 run" })).toHaveAttribute("aria-checked", "false");
  });

  it("keeps the run control in the open and telemetry, connection and the shift log behind disclosures", () => {
    render(<OperationsEnvironmentExample />);
    const inspector = screen.getByRole("region", { name: /Selected machine: Transfer pump P-201/ });
    // Primary: identity, the reported state and the control, with nothing to expand first.
    expect(within(inspector).getByRole("switch", { name: "Transfer pump P-201 run" })).toBeInTheDocument();
    expect(within(inspector).getByText("Running")).toBeInTheDocument();
    // Secondary and tertiary: present, complete, and collapsed rather than stacked beside the control.
    for (const title of ["Telemetry", "Connection and firmware", "Shift log", "Equipment"]) {
      const details = screen.getByText(title, { selector: "summary span span" }).closest("details")!;
      expect(details, title).not.toHaveAttribute("open");
    }
  });

  it("draws the duty control as a track, so its confirmed value and a pending request stay readable", () => {
    render(<OperationsEnvironmentExample />);
    const inspector = screen.getByRole("region", { name: /Selected machine: Transfer pump P-201/ });
    const duty = within(inspector).getByRole("slider", { name: /Duty/ });
    expect((duty as HTMLInputElement).value).toBe("55");
    // The confirmed level is printed beside the label, not hidden inside the track's fill.
    expect(within(inspector).getByText("55")).toBeInTheDocument();
    fireEvent.change(duty, { target: { value: "70" } });
    fireEvent.blur(duty);
    expect(within(inspector).getByText(/Requested 70%, not yet confirmed/)).toBeInTheDocument();
    expect(within(inspector).getByText("55")).toBeInTheDocument();
  });

  it("labels routines as shown, not executed", () => {
    render(<OperationsEnvironmentExample />);
    expect(screen.getByText(/Shown, not executed/)).toBeInTheDocument();
  });
});
