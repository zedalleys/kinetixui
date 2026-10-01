import { act, fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PreviewEnvironment } from "./preview-environment";

/**
 * These cover the two things that went wrong while building this, both of which a class-name test would
 * have reported as fine.
 *
 * The direction switch applies to the document, not to the preview box. With `dir` on the box alone a
 * Radix overlay — portaled to `document.body`, outside it — kept `direction: ltr` while the box said
 * `rtl`, so the RTL control made the library look broken instead of demonstrating it. The assertion is
 * therefore on `documentElement`, because that is the thing whose value portaled content inherits.
 *
 * And a page can hold several previews. Per-preview state let two toolbars disagree about a value only one
 * of them could actually own.
 */
function setMotion(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

describe("PreviewEnvironment", () => {
  beforeEach(() => setMotion(false));
  afterEach(() => {
    cleanup();
    document.documentElement.removeAttribute("dir");
  });

  const rtl = () => screen.getAllByRole("button", { name: /right to left/i })[0];
  const ltr = () => screen.getAllByRole("button", { name: /left to right/i })[0];

  it("mirrors the document, not just the preview box, so portaled overlays follow", () => {
    render(
      <PreviewEnvironment>
        <button>demo</button>
      </PreviewEnvironment>,
    );
    expect(document.documentElement.getAttribute("dir")).not.toBe("rtl");

    act(() => void fireEvent.click(rtl()));
    // The assertion that matters: a Radix overlay portals to document.body and inherits from here.
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");

    act(() => void fireEvent.click(ltr()));
    expect(document.documentElement.getAttribute("dir")).toBe("ltr");
  });

  it("reports the direction through aria-pressed rather than styling alone", () => {
    render(
      <PreviewEnvironment>
        <button>demo</button>
      </PreviewEnvironment>,
    );
    expect(ltr()).toHaveAttribute("aria-pressed", "true");
    expect(rtl()).toHaveAttribute("aria-pressed", "false");

    act(() => void fireEvent.click(rtl()));
    expect(rtl()).toHaveAttribute("aria-pressed", "true");
    expect(ltr()).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps every preview on a page agreeing — they share one document to control", () => {
    render(
      <>
        <PreviewEnvironment>
          <button>one</button>
        </PreviewEnvironment>
        <PreviewEnvironment>
          <button>two</button>
        </PreviewEnvironment>
      </>,
    );
    const stages = () => document.querySelectorAll("[data-preview-stage]");
    expect(stages()).toHaveLength(2);

    act(() => void fireEvent.click(screen.getAllByRole("button", { name: /right to left/i })[0]));

    for (const s of stages()) expect(s.getAttribute("dir")).toBe("rtl");
    for (const b of screen.getAllByRole("button", { name: /right to left/i })) {
      expect(b).toHaveAttribute("aria-pressed", "true");
    }
  });

  it("restores the document when the last preview unmounts", () => {
    const view = render(
      <PreviewEnvironment>
        <button>demo</button>
      </PreviewEnvironment>,
    );
    act(() => void fireEvent.click(rtl()));
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");

    // Navigating away must not leave the rest of the site mirrored.
    act(() => view.unmount());
    expect(document.documentElement.getAttribute("dir")).toBe("ltr");
  });

  it("reports the reader's real reduced-motion setting instead of offering a fake switch", () => {
    setMotion(true);
    render(
      <PreviewEnvironment>
        <button>demo</button>
      </PreviewEnvironment>,
    );
    expect(screen.getByText(/reduced motion/i).textContent).toMatch(/on/i);
    // It is a status, not a control: nothing here claims to change it.
    expect(screen.queryByRole("button", { name: /reduced motion/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: /motion/i })).not.toBeInTheDocument();
  });
});
