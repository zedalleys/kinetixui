import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { useTransientState } from "./use-transient-state";
import { CopyButton } from "@/components/copy-button";

function Probe({ ms = 1000 }: { ms?: number }) {
  const [value, show] = useTransientState("idle", ms);
  return (
    <button type="button" onClick={() => show("shown")}>
      {value}
    </button>
  );
}

describe("useTransientState", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it("returns to its initial value after the delay", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Probe ms={1000} />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveTextContent("shown");

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole("button")).toHaveTextContent("idle");
  });

  it("extends the window instead of letting an earlier timer cut the last one short", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Probe ms={1000} />);
    await user.click(screen.getByRole("button"));

    // 900ms in, press again: the first timer must not fire at 1000 and clear a value set at 900.
    await act(async () => {
      vi.advanceTimersByTime(900);
    });
    await user.click(screen.getByRole("button"));
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByRole("button")).toHaveTextContent("shown");

    await act(async () => {
      vi.advanceTimersByTime(800);
    });
    expect(screen.getByRole("button")).toHaveTextContent("idle");
  });

  it("does not run its reset after the component has gone", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { unmount } = render(<Probe ms={1000} />);
    await user.click(screen.getByRole("button"));
    unmount();

    // The regression this guards: an uncleared timer resolves into a teardown environment. Under jsdom that
    // surfaces as `ReferenceError: window is not defined` inside whichever test is running by then, which is
    // why the original failure looked unrelated to the component that caused it and vanished on a re-run.
    expect(vi.getTimerCount()).toBe(0);
    expect(() =>
      act(() => {
        vi.advanceTimersByTime(5000);
      }),
    ).not.toThrow();
  });

  /**
   * Failure injection, adopted from #469, which found this defect independently and guarded it better than
   * the first draft of this file did.
   *
   * `getTimerCount()` reads 0 for two different reasons: nothing is pending, or fake timers were never
   * installed. A test that cannot tell those apart passes on broken code. This schedules the exact defect
   * the components had and requires the same measurement to report it, so if the measurement ever stops
   * working these fail together instead of going quietly green.
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

describe("CopyButton", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it("leaves no timer behind when it is unmounted straight after a copy", async () => {
    // `setup()` installs the clipboard stub jsdom lacks; without it the write is treated as blocked and no
    // timer is ever started, so the test would pass for the wrong reason.
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { unmount } = render(<CopyButton value="npm i @kinetixui/ui" />);

    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(await screen.findByText("Copied")).toBeInTheDocument();

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  // The positive case the whole fix exists to preserve. The hook's own test covers the value
  // returning to its initial state, but only this one proves CopyButton is actually wired to it:
  // a component that showed "Copied" and never went back would satisfy every other test here.
  it("goes back to Copy on its own while it stays mounted", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CopyButton value="npm i @kinetixui/ui" />);

    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(await screen.findByText("Copied")).toBeInTheDocument();

    await act(async () => void vi.advanceTimersByTime(1600));

    expect(screen.queryByText("Copied")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });
});
