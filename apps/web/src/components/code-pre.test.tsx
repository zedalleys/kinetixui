import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/docs/installation" }));
vi.mock("@/lib/analytics-surfaces", () => ({ trackFenceCopy: () => {} }));

import { CodePre } from "./code-pre";

/**
 * `CodePre`'s copy confirmation, measured at the consumer rather than at the hook.
 *
 * Adopted from PR #526, which fixed this one site on its own with a discarded-handle patch. That fix is
 * superseded by `useTransientState`, but its tests are not: `use-transient-state.test.tsx` proves the hook
 * clears its own timer, and nothing there can tell whether `CodePre` is still wired to it. Regressing this
 * component to a bare `setTimeout` passed the whole 2634-test suite before this file existed, which is
 * exactly the gap it closes.
 *
 * The assertions are deliberately written against what the page does, not against the component's
 * internals, so the shared hook satisfies them without any change to the file:
 *
 *   1. after unmount no timer is pending — `vi.getTimerCount()` is a fact about the environment;
 *   2. a second copy inside the two-second window gets its own full window rather than inheriting the
 *      first copy's deadline, so the confirmation does not vanish while the reader's latest copy is fresh.
 *
 * Both failed against the original component. (2) is the half a reader actually sees.
 *
 * `setTimeout` is the only timer here, so `getTimerCount` is unambiguous: the fences schedule no other
 * work, which the first assertion below checks by measuring the count before any click.
 *
 * **One test here is a guard, not evidence.** "does not update state after unmount" passes against the
 * original component too, because React 18 removed that warning. It is kept to catch a future regression
 * in a louder React, and it should not be counted as proof of this fix.
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
 * `fireEvent` rather than `userEvent`: userEvent drives its own delays through the timer system, and under
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
