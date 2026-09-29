import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HeroCommandStrip } from "./hero-command-strip";
import { SIMULATION_DISCLOSURE } from "@/lib/iot-sim/labels";

/**
 * The hero device makes the page's central claim in a way a reader can check: pressing the switch changes what
 * was *requested*, and the confirmed state moves only when the (scripted) device says so.
 */
describe("HeroCommandStrip", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: false }));
  afterEach(() => vi.useRealTimers());

  const press = async () => {
    await act(async () => {
      fireEvent.click(screen.getByRole("switch", { name: "Pump 01 power" }));
    });
  };

  it("is labelled as a simulation and says nothing is contacted", () => {
    render(<HeroCommandStrip />);
    expect(screen.getByText("Simulation")).toBeInTheDocument();
    expect(screen.getByText(SIMULATION_DISCLOSURE)).toBeInTheDocument();
  });

  it("leaves aria-checked unchanged while the request is open, then confirms", async () => {
    render(<HeroCommandStrip />);
    const sw = screen.getByRole("switch", { name: "Pump 01 power" });
    expect(sw).toHaveAttribute("aria-checked", "false");

    await press();
    expect(sw).toHaveAttribute("aria-checked", "false"); // requested, not confirmed
    expect(sw).toBeDisabled(); // and a second press cannot queue a duplicate

    await act(async () => {
      vi.advanceTimersByTime(900);
    });
    expect(sw).toHaveAttribute("aria-checked", "false"); // acknowledged is still not confirmed
    expect(screen.getByRole("status").textContent).toMatch(/acknowledged.*has not confirmed/i);

    await act(async () => {
      vi.advanceTimersByTime(1300);
    });
    expect(sw).toHaveAttribute("aria-checked", "true");
    expect(sw).not.toBeDisabled();
  });

  it("times out honestly when the device stops answering, and offers a retry", async () => {
    render(<HeroCommandStrip />);
    await act(async () => {
      fireEvent.click(screen.getByRole("checkbox", { name: /stop answering/i }));
    });
    await press();
    await act(async () => {
      vi.advanceTimersByTime(2700);
    });
    expect(screen.getByRole("switch", { name: "Pump 01 power" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("status").textContent).toMatch(/timed out/i);
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
