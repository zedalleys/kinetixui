import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiveControlPanel } from "./live-control-panel";
import { SIMULATION_DISCLOSURE } from "@/lib/iot-sim/labels";

/**
 * The panel's job is to be *used*, so these cover the thing a class-name test cannot: pressing something
 * changes state, and it changes the honest one. The page's argument is that a request is not a state, and a
 * demo that silently flipped to the requested value would be arguing the opposite in the same section.
 *
 * The motion itself is not asserted here — jsdom has no layout and no transitions, so a passing class-name
 * assertion would prove nothing about whether anything moves. That is measured in a real browser; this file
 * protects the state machine underneath it, and the reduced-motion case is the same state machine with the
 * movement removed, which is exactly what makes it testable without one.
 */
describe("LiveControlPanel", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: false }));
  afterEach(() => vi.useRealTimers());

  /**
   * Past acknowledge (260ms) and then past confirm (520ms). Two advances, not one: the confirm timer is
   * only scheduled by the effect that runs *after* React has re-rendered on the acknowledgement, so a single
   * `advanceTimersByTime` crosses the first boundary and leaves the second timer sitting unfired.
   */
  const settle = async () => {
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    await act(async () => {
      vi.advanceTimersByTime(700);
    });
  };

  const powerSwitch = () => screen.getByRole("switch", { name: "Ceiling light power" });
  const press = async (el: Element) => {
    await act(async () => {
      fireEvent.click(el);
    });
  };

  it("says it is simulated and that nothing is contacted", () => {
    render(<LiveControlPanel />);
    expect(screen.getByText("Simulated")).toBeInTheDocument();
    expect(screen.getByText(SIMULATION_DISCLOSURE)).toBeInTheDocument();
  });

  it("holds the confirmed power state while the request is open, then changes it", async () => {
    render(<LiveControlPanel />);
    expect(powerSwitch()).toHaveAttribute("aria-checked", "false");

    await press(powerSwitch());
    // The request is open: the demo must not claim the device agreed.
    expect(powerSwitch()).toHaveAttribute("aria-checked", "false");

    await settle();
    expect(powerSwitch()).toHaveAttribute("aria-checked", "true");
  });

  it("drives the lifecycle readout through its stages for the setting that was touched", async () => {
    const { container } = render(<LiveControlPanel />);
    const stage = () => container.querySelector("[data-lifecycle-stage]")?.getAttribute("data-lifecycle-stage");
    expect(stage()).toBe("idle");

    await press(powerSwitch());
    expect(stage()).toBe("requested");

    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(stage()).toBe("acknowledged");

    await settle();
    expect(stage()).toBe("confirmed");
    // Both halves of the readout describe the same setting — never "requested brightness, confirmed power".
    const readout = container.querySelector("[data-lifecycle-stage]")!;
    expect(readout.querySelector("[data-requested]")?.textContent).toBe("Light on");
    expect(readout.querySelector("[data-confirmed]")?.textContent).toBe("Light on");
  });

  it("keeps brightness unavailable while the light is off, and says why", async () => {
    render(<LiveControlPanel />);
    const brightness = screen.getByRole("slider", { name: "Brightness" });
    expect(brightness).toBeDisabled();
    expect(screen.getByText("The ceiling light is off. Turn it on to set a brightness.")).toBeInTheDocument();

    await press(powerSwitch());
    await settle();
    expect(screen.getByRole("slider", { name: "Brightness" })).toBeEnabled();
  });

  it("refuses a second setting while one is in flight", async () => {
    render(<LiveControlPanel />);
    await press(powerSwitch());

    // A mode press during the open power request must not start a second command.
    const modes = screen.getByRole("radiogroup", { name: "Climate mode" });
    await press(within(modes).getByRole("radio", { name: "Cool" }));
    await settle();

    expect(within(modes).getByRole("radio", { name: "Heat" })).toHaveAttribute("aria-checked", "true");
    expect(powerSwitch()).toHaveAttribute("aria-checked", "true");
  });

  it("lets the setting that owns the open request retarget it, so fast nudges accumulate", async () => {
    const { container } = render(<LiveControlPanel />);
    const increase = () => screen.getByRole("button", { name: /Increase Studio 2 temperature/i });

    // Three presses inside one confirmation window. A control that locked after the first would land on 21.
    await press(increase());
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    await press(increase());
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    await press(increase());
    await settle();

    expect(container.querySelector("[data-presentation='ring'] [data-confirmed]")?.textContent).toBe("22°C");
  });

  it("does not open a command for a value the device already has", async () => {
    const { container } = render(<LiveControlPanel />);
    const stage = () => container.querySelector("[data-lifecycle-stage]")?.getAttribute("data-lifecycle-stage");
    const modes = screen.getByRole("radiogroup", { name: "Climate mode" });

    // Re-picking the selected mode. The controls compare requested to confirmed to decide whether to draw
    // the pending treatment, so an equal request would lock the panel with nothing on screen explaining it.
    await press(within(modes).getByRole("radio", { name: "Heat" }));
    expect(stage(), "a no-op must not start a lifecycle").toBe("idle");
    expect(powerSwitch()).toBeEnabled();

    // Same for releasing the slider without having moved it.
    await press(powerSwitch());
    await settle();
    const brightness = screen.getByRole("slider", { name: "Brightness" });
    await act(async () => {
      fireEvent.keyUp(brightness, { key: "ArrowRight" });
    });
    expect(stage()).toBe("confirmed");
    expect(within(modes).getByRole("radio", { name: "Cool" })).not.toHaveAttribute("aria-disabled", "true");
  });

  it("cancels an open request that is refined back to the confirmed value", async () => {
    const { container } = render(<LiveControlPanel />);
    const stage = () => container.querySelector("[data-lifecycle-stage]")?.getAttribute("data-lifecycle-stage");
    const nudge = (dir: RegExp) => screen.getByRole("button", { name: dir });

    await press(nudge(/Increase Studio 2 temperature/i));
    expect(stage()).toBe("requested");

    // Back to where it started: the command now asks for nothing.
    await press(nudge(/Decrease Studio 2 temperature/i));
    expect(stage(), "a request that asks for nothing must not be left running").toBe("cancelled");

    // And the panel frees itself rather than waiting out a round trip for a command that was dropped.
    await settle();
    expect(powerSwitch()).toBeEnabled();
    expect(container.querySelector("[data-presentation='ring'] [data-confirmed]")?.textContent).toBe("20.5°C");
  });

  it("never says it is heating while the mode is Cool", async () => {
    render(<LiveControlPanel />);
    // Target 20.5 against a reported 19: heating, under Heat.
    expect(screen.getByText(/Heating/)).toBeInTheDocument();

    const modes = screen.getByRole("radiogroup", { name: "Climate mode" });
    await press(within(modes).getByRole("radio", { name: "Cool" }));
    await settle();

    // Same target, same reading — a cooling unit asked for a temperature above the room is idle, not heating.
    expect(screen.queryByText(/Heating/)).not.toBeInTheDocument();
    expect(screen.getByText(/Idle/)).toBeInTheDocument();
  });

  it("never animates a reading: the reported temperature does not move on its own", async () => {
    render(<LiveControlPanel />);
    expect(screen.getByText(/Now 19°C/)).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.getByText(/Now 19°C/)).toBeInTheDocument();
  });
});
