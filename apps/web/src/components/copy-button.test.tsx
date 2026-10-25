import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CopyButton } from "./copy-button";

/**
 * The reset timer's lifetime, which is a different question from what the button does.
 *
 * `setCopied(true)` is undone 1500ms later by a timer. A timer started in a handler and never cleared
 * outlives the component that started it: the reader navigates away inside that window and the callback
 * still runs, holding the closure and calling `setCopied` on something that is gone. Under vitest the same
 * orphan is worse than untidy — it can fire after jsdom has been torn down, and then surfaces as
 * `ReferenceError: window is not defined` in whichever test file happens to be running at the time, which
 * is not this one. That is how it was found: a red CI job on an unrelated PR.
 *
 * `vi.getTimerCount()` is the measurement, because it asks the question directly: is anything still pending
 * once the component is gone? React 18 made the louder symptom silent — setting state on an unmounted
 * component is a no-op and no longer warns — so a test that waited for a warning would pass on broken code.
 *
 * `fireEvent` rather than `userEvent`: `userEvent` drives its own delays through the timer system, and under
 * fake timers the click never settles. The defect is about what the handler schedules, not about how the
 * pointer got there, so the plainer event is the right tool and keeps the clock entirely under this test.
 */
describe("CopyButton reset timer", () => {
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  /** Click, then drain the microtask queue so the clipboard promise's `.then` has set state and scheduled
   *  the timer — without moving the clock into the 1500ms reset. */
  const copy = async () => {
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await act(async () => {});
  };

  it("leaves nothing pending when the button unmounts inside the 1500ms window", async () => {
    const { unmount } = render(<CopyButton value="x" />);
    await copy();
    expect(writeText).toHaveBeenCalledWith("x");
    expect(screen.getByText("Copied")).toBeInTheDocument();

    /* The reader navigates away well inside the window. */
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });

  it("still resets itself when the button stays mounted", async () => {
    render(<CopyButton value="x" />);
    await copy();
    expect(screen.getByText("Copied")).toBeInTheDocument();

    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(screen.queryByText("Copied")).not.toBeInTheDocument();
  });

  /**
   * Failure injection. The assertion above is only worth anything if it can actually see an uncleared
   * timer, and `getTimerCount` reads 0 for two different reasons: nothing was scheduled, or fake timers
   * were never installed. This schedules the defect deliberately — the exact shape the component had — and
   * requires the same measurement to report it. If this ever reads 0, the test above is measuring nothing
   * and the two fail together rather than going quietly green.
   */
  it("the measurement can see an uncleared timer (control)", () => {
    function Unguarded() {
      const [, setCopied] = React.useState(false);
      React.useEffect(() => {
        setTimeout(() => setCopied(false), 1500); // deliberately unguarded
      }, []);
      return null;
    }
    const { unmount } = render(<Unguarded />);
    unmount();
    expect(vi.getTimerCount()).toBe(1);
  });
});
