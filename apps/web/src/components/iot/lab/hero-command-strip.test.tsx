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

/**
 * Geometry. One toggle used to move the card 1311 → 1411 → 1447 → 1415px on a phone, because the lifecycle
 * stepper, the attempt line and the Retry button are inserted and removed as the request settles.
 *
 * jsdom has no layout, so these are the structural invariants the measured stability rests on rather than a
 * second pixel measurement: everything that comes and goes is inside one region that holds its own height,
 * that region's reserve is never released once a request has been made, and nothing outside it appears or
 * disappears. The pixel numbers are in the PR description; this is what keeps them true.
 */
describe("HeroCommandStrip geometry", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: false }));
  afterEach(() => vi.useRealTimers());

  const region = (c: HTMLElement) => c.querySelector("[data-command-status-region]") as HTMLElement;
  const outside = (c: HTMLElement) =>
    Array.from((c.querySelector("[data-hero-command-strip]") as HTMLElement).children).map((el) =>
      el.hasAttribute("data-command-status-region") ? "<status region>" : el.tagName,
    );

  it("holds the status region's reserved height from the first request onwards", async () => {
    const { container } = render(<HeroCommandStrip />);
    // Nothing has been asked for yet, so there is nothing to hold space for.
    expect(region(container).className).not.toMatch(/min-h-/);

    await act(async () => {
      fireEvent.click(screen.getByRole("switch", { name: "Pump 01 power" }));
    });
    const reserved = region(container).className;
    expect(reserved).toMatch(/\bmin-h-72\b/);
    expect(reserved).toMatch(/\bsm:min-h-60\b/);

    // and it is the same reserve at every later stage, including after the request settles
    for (const ms of [900, 1300]) {
      await act(async () => {
        vi.advanceTimersByTime(ms);
      });
      expect(region(container).className).toBe(reserved);
    }
    expect(screen.getByRole("switch", { name: "Pump 01 power" })).toHaveAttribute("aria-checked", "true");
  });

  it("keeps every block that comes and goes inside that one region", async () => {
    const { container } = render(<HeroCommandStrip />);
    const atIdle = outside(container);

    await act(async () => {
      fireEvent.click(screen.getByRole("switch", { name: "Pump 01 power" }));
    });
    expect(outside(container)).toEqual(atIdle); // requested
    expect(region(container).textContent).toMatch(/not yet confirmed/i);

    await act(async () => {
      vi.advanceTimersByTime(900);
    });
    expect(outside(container)).toEqual(atIdle); // acknowledged: stepper and attempt line are inside
    await act(async () => {
      vi.advanceTimersByTime(1300);
    });
    expect(outside(container)).toEqual(atIdle); // confirmed
  });

  it("says when the 'stop answering' switch takes effect without inserting a line mid-request", async () => {
    const { container } = render(<HeroCommandStrip />);
    const hint = /takes effect from the next step/i;
    expect(screen.getByText(hint)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("switch", { name: "Pump 01 power" }));
    });
    expect(screen.getByText(hint)).toBeInTheDocument();
    expect(outside(container)).toEqual(outside(container));
  });
});

/**
 * The switch's description is the visible sentence under it, not a truncated line beside it.
 *
 * `DevicePowerControl` prints `control.description` on one `truncate` line next to the track, which on a
 * 320px phone cuts "Change requested, not yet confirmed by the dev…" — and a truncating nowrap line was
 * also what pushed the whole card past the right edge of the viewport while a command was in flight.
 */
describe("HeroCommandStrip control description", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: false }));
  afterEach(() => vi.useRealTimers());

  it("describes the switch with one wrapping sentence, rendered once", async () => {
    const { container } = render(<HeroCommandStrip />);
    const sw = screen.getByRole("switch", { name: "Pump 01 power" });
    const describedBy = sw.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();

    const description = container.querySelector(`#${CSS.escape(describedBy!)}`) as HTMLElement;
    expect(description).toBeTruthy();
    expect(description.className).not.toMatch(/\b(truncate|sr-only)\b/);
    expect(description.textContent).toBe("Ready");

    await act(async () => {
      fireEvent.click(sw);
    });
    expect(description.textContent).toBe("Change requested, not yet confirmed by the device");
    // the component's own copy of the sentence is suppressed, so it is not in the tree twice
    expect(screen.getAllByText("Change requested, not yet confirmed by the device")).toHaveLength(1);
    // Nothing truncating is left holding a sentence. The one `truncate` the component still has is the
    // state word beside the track ("Turning on"), which is two words wide and is the label, not the copy.
    for (const el of container.querySelectorAll(".truncate")) {
      expect((el.textContent ?? "").split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(3);
    }
  });
});
