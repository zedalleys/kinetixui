import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HeroCommand } from "./hero-command";

/**
 * The hero's typing loop never ends, so WCAG 2.2.2 needs a control that stops it. These tests drive the real timer
 * loop with fake timers and read the typed text, so "paused" means nothing changes while time passes — not merely
 * that a button flipped its attribute. Rendered behaviour of the caret's CSS blink is outside jsdom; the attribute
 * that stops it (`data-paused`) is asserted here and the CSS rule sits next to the caret's keyframes.
 */
const reduced = (matches: boolean) => {
  window.matchMedia = vi.fn().mockReturnValue({ matches, addEventListener() {}, removeEventListener() {} }) as never;
};
const typedText = (container: HTMLElement) => container.querySelector("code")!.textContent ?? "";
/**
 * Advance in small steps so each scheduled tick runs and React commits between them, and return every text shown on
 * the way. Comparing only the first and last frame is not enough: the whole eight-word loop takes about 20s, so a
 * loop that kept running can land back on the word it started from.
 */
const advance = (ms: number, container?: HTMLElement) => {
  const seen = new Set<string>();
  for (let t = 0; t < ms; t += 50) {
    act(() => void vi.advanceTimersByTime(50));
    if (container) seen.add(typedText(container));
  }
  return seen;
};

describe("HeroCommand typing loop", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    reduced(false);
  });
  afterEach(() => vi.useRealTimers());

  it("loops by itself while nobody has paused it", () => {
    const { container } = render(<HeroCommand />);
    expect(advance(4000, container).size).toBeGreaterThan(1);
  });

  it("has a keyboard-reachable pause control that reports its state", () => {
    render(<HeroCommand />);
    const button = screen.getByRole("button", { name: "Pause typing animation" });
    expect(button.tagName).toBe("BUTTON"); // natively focusable and operable with Enter and Space
    button.focus();
    expect(document.activeElement).toBe(button);
    expect(button.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(button);
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });

  it("stops the loop while paused — nothing is typed however long it waits — and freezes the caret", () => {
    const { container } = render(<HeroCommand />);
    advance(2300); // "button" has been deleted and the next word typed
    fireEvent.click(screen.getByRole("button", { name: "Pause typing animation" }));
    const frozen = typedText(container);
    expect([...advance(20000, container)]).toEqual([frozen]);
    expect(container.querySelector(".kx-caret")!.hasAttribute("data-paused")).toBe(true);
  });

  it("resumes from where it stopped when asked", () => {
    const { container } = render(<HeroCommand />);
    advance(2300);
    const button = screen.getByRole("button", { name: "Pause typing animation" });
    fireEvent.click(button);
    const frozen = typedText(container);
    fireEvent.click(button);
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(container.querySelector(".kx-caret")!.hasAttribute("data-paused")).toBe(false);
    advance(1800); // one beat, then the next keystroke
    // The same word carries on from where it was: whatever was on screen is now being deleted, letter by letter. A
    // loop that restarted from scratch would be deleting "button" instead, which is not a prefix of the frozen word.
    const word = (t: string) => t.slice(t.indexOf("add ") + 4);
    const after = word(typedText(container));
    expect(after.length).toBeLessThan(word(frozen).length);
    expect(word(frozen).startsWith(after)).toBe(true);
  });

  it("keeps the reader's pause for the next visit", () => {
    const first = render(<HeroCommand />);
    fireEvent.click(screen.getByRole("button", { name: "Pause typing animation" }));
    first.unmount();
    const { container } = render(<HeroCommand />);
    expect(screen.getByRole("button", { name: "Pause typing animation" }).getAttribute("aria-pressed")).toBe("true");
    const shown = typedText(container);
    expect([...advance(20000, container)]).toEqual([shown]);
  });

  it("never loops under reduced motion", () => {
    reduced(true);
    const { container } = render(<HeroCommand />);
    const shown = typedText(container);
    expect([...advance(20000, container)]).toEqual([shown]);
    expect(shown).toContain("add button");
  });
});
