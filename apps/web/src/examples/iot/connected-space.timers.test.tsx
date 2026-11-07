import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConnectedSpaceExample } from "./connected-space";

/**
 * The lifetime of the routine-completion timers this example starts.
 *
 * Each automation card's `onRun` sets the routine to `running` and schedules its return to `idle`
 * 1800ms later. The original code kept no handle, so a run in flight when the reader navigated away
 * left a timer holding `setRoutines` to fire into an unmounted tree. That is the defect these
 * measure, and it is deliberately NOT fixed through `useTransientState`: this is demo content with a
 * per-routine timer, not one transient value per component.
 *
 * `vi.getTimerCount()` is the instrument, and it is only unambiguous here because the example's one
 * other timer — the 1.1s command-confirmation hold — is armed by an effect that returns early while
 * `pending` is null, which it is until a device control is touched. The first assertion in every test
 * below measures the count on a fresh render to prove that, rather than assuming it.
 *
 * `fireEvent`, not `userEvent`: userEvent drives its own delays through the timer system and
 * deadlocks under `vi.useFakeTimers()`.
 */
const RUN_MS = 1800;

/** The three automations the example renders, in the order it renders them. */
const runButtons = () => screen.getAllByRole("button", { name: /^(Run now|Running…)$/ });

const advance = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

describe("ConnectedSpaceExample routine timers", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("schedules one completion timer per run, and none before", async () => {
    render(<ConnectedSpaceExample />);
    expect(vi.getTimerCount(), "a freshly rendered example schedules nothing").toBe(0);
    expect(runButtons()).toHaveLength(3);

    fireEvent.click(runButtons()[0]!);
    expect(runButtons()[0]).toHaveTextContent("Running…");
    expect(vi.getTimerCount(), "the run must be ended by a timer").toBe(1);
  });

  it("returns the routine to idle when its own deadline arrives, leaving nothing pending", async () => {
    render(<ConnectedSpaceExample />);
    fireEvent.click(runButtons()[0]!);
    expect(runButtons()[0]).toHaveTextContent("Running…");

    await advance(RUN_MS);
    expect(runButtons()[0], "the run should have finished on its own").toHaveTextContent("Run now");
    expect(vi.getTimerCount(), "and its timer must not outlive its own firing").toBe(0);
  });

  it("gives each routine its own timer, without one run ending another", async () => {
    render(<ConnectedSpaceExample />);
    fireEvent.click(runButtons()[0]!);
    await advance(RUN_MS / 2);
    fireEvent.click(runButtons()[1]!);

    expect(vi.getTimerCount(), "two routines running means two timers").toBe(2);
    expect(runButtons()[0]).toHaveTextContent("Running…");
    expect(runButtons()[1]).toHaveTextContent("Running…");

    // The first routine's deadline falls here. It must end its own run and not the second's.
    await advance(RUN_MS / 2);
    expect(runButtons()[0]).toHaveTextContent("Run now");
    expect(runButtons()[1], "the first routine's deadline ended the second routine's run").toHaveTextContent(
      "Running…",
    );
    expect(vi.getTimerCount()).toBe(1);

    await advance(RUN_MS);
    expect(runButtons()[1]).toHaveTextContent("Run now");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("leaves nothing pending when the example unmounts mid-run", async () => {
    const { unmount } = render(<ConnectedSpaceExample />);
    fireEvent.click(runButtons()[0]!);
    fireEvent.click(runButtons()[1]!);
    expect(vi.getTimerCount()).toBe(2);

    unmount();
    expect(vi.getTimerCount(), "pending routine timers survived unmount").toBe(0);
  });

  /**
   * Why there is no "a rerun replaces the previous deadline" test here.
   *
   * `RoutineCard` disables its own button while the automation is running — `canRunAutomation`
   * returns false for `status === "running"` — and the routine is `running` for exactly as long as a
   * timer is pending, because the same callback clears the status and drops the map entry. So no
   * reader can reach a second run inside the window, and the `clearTimeout(existing)` branch in
   * `onRun` is defensive rather than a path this example exercises. Asserting on it would need the
   * handler driven past the product component, which would be a test of this file's internals.
   *
   * This test records the reason as a fact instead: the second press is refused.
   */
  it("cannot start a second run of the same routine inside the window, so no timer can stack", async () => {
    render(<ConnectedSpaceExample />);
    fireEvent.click(runButtons()[0]!);
    expect(vi.getTimerCount()).toBe(1);

    const running = runButtons()[0]!;
    expect(running, "the control that would queue a duplicate run must be disabled").toBeDisabled();
    fireEvent.click(running);
    await advance(RUN_MS / 2);
    expect(vi.getTimerCount(), "a second press inside the window scheduled another timer").toBe(1);

    await advance(RUN_MS / 2);
    expect(vi.getTimerCount()).toBe(0);
  });
});
