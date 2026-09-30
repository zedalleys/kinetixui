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

  it("separates the zone's condition from the sensor's battery, so 18% never reads as a second moisture value", () => {
    render(<AgritechEnvironmentExample />);
    const condition = screen.getByRole("heading", { name: "Zone 3 soil moisture" }).closest("section")!;
    // The condition group carries the hero number and its relationship to the threshold, in words.
    expect(within(condition).getByText("34")).toBeInTheDocument();
    expect(within(condition).getByText(/points above the irrigation threshold \(28%\)/)).toBeInTheDocument();
    // …and nothing about the battery.
    expect(within(condition).queryByRole("img", { name: /battery/i })).toBeNull();
    expect(within(condition).queryByText("18%")).toBeNull();

    const attention = screen.getByRole("heading", { name: "Sensor attention" }).closest("section")!;
    expect(within(attention).getByText(/Soil Sensor 04 battery is low/)).toBeInTheDocument();
    expect(within(attention).getByText("A battery level, not a soil reading.")).toBeInTheDocument();
    expect(within(attention).getByRole("img", { name: /Soil Sensor 04 battery/ })).toBeInTheDocument();
    // The condition heading comes first in the document; attention follows it, never the other way round.
    expect(condition.compareDocumentPosition(attention) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("names the sensor attention group only when that sensor needs one", () => {
    render(<AgritechEnvironmentExample />);
    fireEvent.click(zoneButton(/Zone 2/));
    // Soil Sensor 03 is healthy and reporting, so there is nothing to raise.
    expect(screen.queryByRole("heading", { name: "Sensor attention" })).toBeNull();
    fireEvent.click(zoneButton(/Orchard block/));
    const attention = screen.getByRole("heading", { name: "Sensor attention" }).closest("section")!;
    expect(within(attention).getByText(/last known value, not the current soil moisture/)).toBeInTheDocument();
  });

  it("words the flaky valve's failure with the device's own reason and keeps the confirmed position", () => {
    render(<AgritechEnvironmentExample />);
    const detail = screen.getByRole("region", { name: "Zone 3 detail" });
    fireEvent.click(within(within(detail).getByRole("radiogroup", { name: /Irrigation Valve 03 position/ })).getByRole("radio", { name: /Open/ }));
    // In flight: the request is worded and says what the valve still reports.
    expect(within(detail).getByText(/Requested: Open, not yet confirmed\. The valve still reports closed\./)).toBeInTheDocument();

    tick(3000);
    // Failed: the reason the scenario scripted is on screen at full contrast, not only in the summary line.
    expect(within(detail).getByText(/Irrigation Valve 03 did not move — Valve position not reported\./)).toBeInTheDocument();
    // The confirmed position is still the authoritative one, and the control still reports it.
    expect(within(detail).getByText("Closed", { selector: "p" })).toBeInTheDocument();
    expect(within(detail).getByRole("radio", { name: /Closed/ })).toBeChecked();
    // Retry is offered, never taken for you.
    const retry = within(detail).getByRole("button", { name: /^Retry$/ });
    tick(5000);
    expect(within(detail).getByText("Closed", { selector: "p" })).toBeInTheDocument();
    fireEvent.click(retry);
    tick(3000);
    expect(within(detail).getByText("Open", { selector: "p" })).toBeInTheDocument();
    expect(within(detail).queryByText(/did not move/)).toBeNull();
  });

  it("selecting a zone on the pills (phone) selects the same zone as the rail", () => {
    render(<AgritechEnvironmentExample />);
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Zone" })).getByRole("radio", { name: /Zone 2/ }));
    expect(zoneButton(/Zone 2/)).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("region", { name: "Zone 2 detail" })).toBeInTheDocument();
  });
});
