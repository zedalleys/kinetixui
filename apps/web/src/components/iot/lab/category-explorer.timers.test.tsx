import * as React from "react";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryExplorer } from "./category-explorer";

/**
 * The alignment correction's lifetime.
 *
 * `alignPanel` arms a 1500ms timer and two window listeners to finish a scroll that may land short. It is a
 * `useCallback`, not an effect, so React collects nothing it returns: the teardown has to be held in a ref and
 * run by hand. Codex caught exactly that on this PR's first commit, where the cleanup was returned from the
 * callback and both callers discarded it, leaving the leak the change claimed to fix.
 *
 * Driven through the `#hash` route rather than by clicking a tab: Radix's trigger does not change value from a
 * bare `fireEvent.click` under jsdom, so a click-driven test arms nothing and its assertions pass vacuously —
 * which is what the first draft of this file did. jsdom also zeroes every `getBoundingClientRect`, so without
 * the stub below the alignment never reaches its arming branch at all. The first assertion in each test exists
 * to prove the setup really armed something before anything is concluded from a count.
 */
const CATEGORIES = [
  { id: "alpha", label: "Alpha", panel: <p>alpha panel</p> },
  { id: "beta", label: "Beta", panel: <p>beta panel</p> },
] as const;

/** `fromHash` defers through two nested frames; neither is close to the 1500ms correction. */
const frames = () =>
  act(() => {
    vi.advanceTimersByTime(32);
  });

describe("CategoryExplorer alignment cleanup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.location.hash = "";
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    // Place every panel 500px above the sticky bar's resting edge, which is what makes `alignPanel` arm.
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      top: -500, height: 0, bottom: 0, left: 0, right: 0, width: 0, x: 0, y: 0, toJSON: () => ({}),
    } as DOMRect);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.location.hash = "";
  });

  const goTo = (id: string) => {
    window.location.hash = `#${id}`;
    act(() => {
      window.dispatchEvent(new Event("hashchange"));
    });
    frames();
  };

  it("arms a correction when a panel is reached by its hash", () => {
    window.location.hash = "#beta";
    const { unmount } = render(<CategoryExplorer categories={CATEGORIES} label="Explore" />);
    frames();
    // Proves the setup reaches the arming branch; without this the assertions below would be vacuous.
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
  });

  it("leaves nothing pending when the explorer unmounts inside the window", () => {
    window.location.hash = "#beta";
    const { unmount } = render(<CategoryExplorer categories={CATEGORIES} label="Explore" />);
    frames();
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not leave the first correction running when a second one supersedes it", () => {
    window.location.hash = "#beta";
    const { unmount } = render(<CategoryExplorer categories={CATEGORIES} label="Explore" />);
    frames();
    const armed = vi.getTimerCount();
    expect(armed).toBeGreaterThan(0);

    goTo("alpha");
    // Replaced, not stacked: a second alignment must not leave the first one's timer running.
    expect(vi.getTimerCount()).toBe(armed);
    unmount();
  });
});
