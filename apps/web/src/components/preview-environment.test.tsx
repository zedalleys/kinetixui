import { act, fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@kinetixui/ui";
import { PreviewEnvironment } from "./preview-environment";

/**
 * The direction control belongs to one preview.
 *
 * It used to write `<html dir>`, so that overlays portaled to `document.body` would follow it, and a test
 * here asserted exactly that. The cost was the whole documentation site mirroring from a control inside one
 * demo, every preview on the page switching together, and the toggle jumping across the screen as the page
 * reflowed under it (PR #300, §27). Overlays now portal into the preview's `KinetixDirectionProvider` host
 * instead, so the preview can be RTL without the page being RTL. These assert that, and that the page is
 * never written.
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
  const stageDirs = () => [...document.querySelectorAll("[data-preview-stage]")].map((s) => s.getAttribute("dir"));

  it("mirrors the preview, and never writes the page's direction", () => {
    render(
      <PreviewEnvironment>
        <button>demo</button>
      </PreviewEnvironment>,
    );
    act(() => void fireEvent.click(rtl()));
    expect(stageDirs()).toEqual(["rtl"]);
    expect(document.documentElement.hasAttribute("dir")).toBe(false);
    expect(document.body.hasAttribute("dir")).toBe(false);

    act(() => void fireEvent.click(ltr()));
    expect(stageDirs()).toEqual(["ltr"]);
    expect(document.documentElement.hasAttribute("dir")).toBe(false);
  });

  it("opens a portaled overlay in the preview's direction, outside the preview", async () => {
    render(
      <PreviewEnvironment>
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Body</DialogDescription>
          </DialogContent>
        </Dialog>
      </PreviewEnvironment>,
    );
    act(() => void fireEvent.click(rtl()));
    act(() => void fireEvent.click(screen.getByRole("button", { name: "Open" })));
    const dialog = await screen.findByRole("dialog");
    expect(document.querySelector("[data-preview-stage]")!.contains(dialog)).toBe(false);
    expect(dialog.closest("[dir]")?.getAttribute("dir")).toBe("rtl");
    expect(document.documentElement.hasAttribute("dir")).toBe(false);
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

  it("says the control applies to this preview, not the page", () => {
    render(
      <PreviewEnvironment>
        <button>demo</button>
      </PreviewEnvironment>,
    );
    expect(rtl().textContent).toMatch(/this preview only/i);
    expect(rtl().textContent).not.toMatch(/whole page/i);
  });

  it("lets two previews on one page hold different directions", () => {
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
    expect(stageDirs()).toEqual(["ltr", "ltr"]);

    act(() => void fireEvent.click(screen.getAllByRole("button", { name: /right to left/i })[0]));

    expect(stageDirs()).toEqual(["rtl", "ltr"]);
    const pressed = screen.getAllByRole("button", { name: /right to left/i }).map((b) => b.getAttribute("aria-pressed"));
    expect(pressed).toEqual(["true", "false"]);
    expect(document.documentElement.hasAttribute("dir")).toBe(false);
  });

  it("starts in the page's direction, and can leave it without changing it", () => {
    // An application that sets <html dir="rtl"> globally.
    document.documentElement.setAttribute("dir", "rtl");
    render(
      <PreviewEnvironment>
        <button>demo</button>
      </PreviewEnvironment>,
    );
    expect(stageDirs()).toEqual(["rtl"]);
    expect(rtl()).toHaveAttribute("aria-pressed", "true");

    act(() => void fireEvent.click(ltr()));
    expect(stageDirs()).toEqual(["ltr"]);
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");
  });

  it("leaves nothing behind when it unmounts", () => {
    const view = render(
      <PreviewEnvironment>
        <button>demo</button>
      </PreviewEnvironment>,
    );
    act(() => void fireEvent.click(rtl()));
    act(() => view.unmount());
    expect(document.documentElement.hasAttribute("dir")).toBe(false);
    expect(document.querySelector("[data-kinetix-portal]")).toBeNull();
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
