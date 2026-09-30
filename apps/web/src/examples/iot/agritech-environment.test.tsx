import * as React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgritechEnvironmentExample } from "./agritech-environment";

const tick = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
const rail = () => within(screen.getByRole("list", { name: "Zones" }));
const zoneButton = (name: RegExp) => rail().getByRole("button", { name });

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("agritech environment", () => {
  it("composes a field plan, a zone rail with moisture as the big number, and starts on Zone 3", () => {
    render(<AgritechEnvironmentExample />);
    expect(screen.getByRole("group", { name: "Farm plan" })).toBeInTheDocument();
    expect(rail().getAllByRole("button")).toHaveLength(4);
    expect(zoneButton(/Zone 3/)).toHaveAttribute("aria-current", "true");
    expect(within(screen.getByRole("region", { name: "Zone 3 detail" })).getByText("Zone 3 soil moisture")).toBeInTheDocument();
    // moisture is the big number of each row, and a bar sits under it
    expect(rail().getByText("41%")).toBeInTheDocument();
    expect(rail().getByText("34%")).toBeInTheDocument();
    expect(rail().getAllByRole("img", { name: /soil moisture: \d+%.*Irrigation threshold 28%/ }).length).toBeGreaterThanOrEqual(2);
  });

  it("keeps the stale orchard sensor honest: last known, never presented as current", () => {
    render(<AgritechEnvironmentExample />);
    fireEvent.click(zoneButton(/Orchard block/));
    const detail = screen.getByRole("region", { name: "Orchard block detail" });
    expect(within(detail).getByText("Last known value")).toBeInTheDocument();
    expect(within(detail).getByText(/last known value, not the current soil moisture/)).toBeInTheDocument();
    const hero = within(screen.getByRole("heading", { name: "Orchard block soil moisture" }).closest("section")!);
    expect(hero.queryByText("Normal")).toBeNull();
    // no valve is registered here, so nothing to open or close
    expect(within(detail).queryByRole("radiogroup")).toBeNull();
    expect(within(rail().getByText("Orchard block").closest("[data-variant]") as HTMLElement).getByText("Last known")).toBeInTheDocument();
  });

  it("shows a request beside the confirmed value, then a failure with Retry, never confirming the failed value", () => {
    render(<AgritechEnvironmentExample />);
    const detail = screen.getByRole("region", { name: "Zone 3 detail" });
    expect(within(detail).getByText("Closed", { selector: "p" })).toBeInTheDocument();

    fireEvent.click(within(within(detail).getByRole("radiogroup", { name: /Irrigation Valve 03 position/ })).getByRole("radio", { name: /Open/ }));
    expect(within(detail).getByText(/Requested: Open, not yet confirmed/)).toBeInTheDocument();
    expect(within(detail).getByText("Closed", { selector: "p" })).toBeInTheDocument();
    expect(within(detail).getByRole("radio", { name: /Closed/ })).toBeChecked();

    tick(3000);
    expect(within(detail).getByText("Closed", { selector: "p" })).toBeInTheDocument();
    const retry = within(detail).getByRole("button", { name: /retry/i });
    fireEvent.click(retry);
    tick(3000);
    expect(within(detail).getByText("Open", { selector: "p" })).toBeInTheDocument();
    expect(within(detail).queryByText(/Requested: Open/)).toBeNull();
  });

  it("marks the pump request as requested, not running-confirmed", () => {
    render(<AgritechEnvironmentExample />);
    fireEvent.click(zoneButton(/Utility yard/));
    const detail = screen.getByRole("region", { name: "Utility yard detail" });
    expect(within(detail).getByText("Running")).toBeInTheDocument();
    fireEvent.click(within(detail).getByRole("switch", { name: /Pump Station power/ }));
    expect(within(detail).getByText(/Requested: Off, not yet confirmed/)).toBeInTheDocument();
    expect(within(detail).getByText("Running")).toBeInTheDocument();
  });

  it("labels the irrigation rule and the forecast as shown, not executed, and application-provided", () => {
    render(<AgritechEnvironmentExample />);
    expect(screen.getByText(/Shown, not executed: KinetixUI has no automation engine/)).toBeInTheDocument();
    expect(screen.getByText(/Application-provided demo data — KinetixUI fetches no forecast/)).toBeInTheDocument();
    expect(screen.getByText(/Rain forecast: not expected \(15% chance\)/)).toBeInTheDocument();
  });

  it("derives device health and open alerts from the simulation", () => {
    render(<AgritechEnvironmentExample />);
    expect(screen.getByText(/3 open alerts/)).toBeInTheDocument();
    const health = screen.getByRole("heading", { name: "Device health" }).closest("section")!;
    expect(within(health).getByText("9")).toBeInTheDocument();
    expect(within(health).getAllByRole("img", { name: /battery/i }).length).toBeGreaterThanOrEqual(4);
  });

  it("selecting a zone on the pills (phone) selects the same zone as the rail", () => {
    render(<AgritechEnvironmentExample />);
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Zone" })).getByRole("radio", { name: /Zone 2/ }));
    expect(zoneButton(/Zone 2/)).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("region", { name: "Zone 2 detail" })).toBeInTheDocument();
  });
});
