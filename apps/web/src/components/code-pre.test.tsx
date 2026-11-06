import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/docs/installation" }));
vi.mock("@/lib/analytics-surfaces", () => ({ trackFenceCopy: () => {} }));

import { CodePre } from "./code-pre";

/**
 * The copy button's "Copied" feedback is withdrawn by a `setTimeout`. The handle was not retained, so
 * nothing could clear it: a reader who copies a snippet and navigates away leaves a timer holding the
 * component's `setCopied` closure, which then fires into an unmounted tree. Two observable consequences,
 * and these tests are each written against one of them rather than against the implementation:
 *
 *   1. after unmount a timer is still pending — measured with `vi.getTimerCount()`, which is a fact about
 *      the environment rather than about the component's internals;
 *   2. a second copy inside the two-second window inherits the FIRST copy's deadline, so the confirmation
 *      disappears early — the reader sees "Copied" vanish while their most recent copy is still fresh.
 *
 * Both failed before the fix. (2) is the one a reader would actually notice, so it is the more important
 * of the two, and it is also the reason the fix clears the previous timer rather than only clearing on
 * unmount.
 *
 * `setTimeout` is the only timer here, so `getTimerCount` is unambiguous: the fences render no other
 * scheduled work, which the first assertion below checks by measuring the count before any click.
 */
const CLEAR_AFTER_MS = 2000;

const fence = (text = "npx @kinetixui/cli add button") => (
  <CodePre data-language="bash">
    <code>
      {text.split("\n").map((line, i) => (
        <span key={i} data-line="">
          {line}
        </span>
      ))}
    </code>
  </CodePre>
);

const writeText = vi.fn(() => Promise.resolve());

beforeEach(() => {
  vi.useFakeTimers();
  writeText.mockClear();
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
});

afterEach(() => {
  vi.useRealTimers();
});

/**
 * `fireEvent` rather than `userEvent`: userEvent schedules its own work on real timers, and under
 * `vi.useFakeTimers()` every one of these tests hung for the full 5s test timeout — which proves nothing
 * about the component. A plain click is all this needs.
 */
const clickCopy = async () => {
  fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
  // The feedback is set inside the clipboard promise's resolution, not in the click handler, so the
  // microtask queue has to drain before `copied` is true.
  await act(async () => {
    await Promise.resolve();
  });
};

/** The polite live region, which holds "Copied" exactly while the confirmation stands. */
const confirmation = () => document.querySelector('[aria-live="polite"]')?.textContent;

const advance = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

describe("CodePre copy feedback timer", () => {
  it("schedules exactly one timer when the copy succeeds, and none before", async () => {
    render(fence());
    expect(vi.getTimerCount(), "a freshly rendered fence schedules nothing").toBe(0);

    await clickCopy();
    expect(confirmation()).toBe("Copied");
    expect(vi.getTimerCount(), "the confirmation must be withdrawn by a timer").toBe(1);

    await advance(CLEAR_AFTER_MS);
    expect(confirmation()).toBe("");
    expect(vi.getTimerCount(), "and that timer must not outlive its own firing").toBe(0);
  });

  it("clears the timer on teardown, so nothing is left to fire into an unmounted tree", async () => {
    const { unmount } = render(fence());
    await clickCopy();
    expect(vi.getTimerCount()).toBe(1);

    unmount();
    expect(vi.getTimerCount(), "the pending timer survived unmount").toBe(0);
  });

  it("does not update state after unmount", async () => {
    const { unmount } = render(fence());
    await clickCopy();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      unmount();
      // If a timer survived, this is where it would fire and call setCopied on a dead component.
      await advance(CLEAR_AFTER_MS * 2);
      expect(error, "React complained about an update after unmount").not.toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
  });

  it("gives a second copy its own full window instead of the first copy's leftover deadline", async () => {
    render(fence());
    await clickCopy();

    // 1.5s into the first window, copy again. The reader's most recent copy is 0ms old.
    await advance(1500);
    await clickCopy();
    expect(confirmation()).toBe("Copied");

    // The first copy's deadline falls here. The confirmation belongs to the second copy and must stand.
    await advance(600);
    expect(confirmation(), "the first copy's timer withdrew the second copy's confirmation").toBe("Copied");

    await advance(CLEAR_AFTER_MS);
    expect(confirmation()).toBe("");
  });
});
