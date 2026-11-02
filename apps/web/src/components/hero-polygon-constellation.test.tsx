import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HeroPolygonConstellation } from "./hero-polygon-constellation";

let intersect: (entries: { isIntersecting: boolean }[]) => void;
let onPreferenceChange: () => void;
let reduced = false;
let hidden = false;
const disconnected = vi.fn();

beforeEach(() => {
  reduced = false;
  hidden = false;
  vi.clearAllMocks();
  localStorage.clear();
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: typeof intersect) { intersect = callback; }
    observe() {}
    disconnect = disconnected;
  });
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  window.matchMedia = vi.fn().mockImplementation(() => ({
    get matches() { return reduced; },
    addEventListener: (_: string, callback: () => void) => { onPreferenceChange = callback; },
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe("original SVG hero and KinetixUI brand contract", () => {
  it("renders an editable vector network without the uploaded geometry or alternate brand colors", () => {
    const { container } = render(<HeroPolygonConstellation />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
    expect(svg).toHaveAttribute("viewBox", "0 0 640 480");
    expect(svg?.querySelectorAll(".kx-hero-facets polygon").length).toBeGreaterThan(12);
    expect(svg?.querySelectorAll(".kx-hero-links line").length).toBeGreaterThan(20);
    expect(svg?.querySelectorAll(".kx-hero-traces path")).toHaveLength(3);
    expect(svg?.querySelector("stop")).toHaveAttribute("stop-color", "hsl(var(--primary))");
  });

  it("only animates while visible and motion is permitted, and retains a keyboard pause", () => {
    const { container, unmount } = render(<HeroPolygonConstellation />);
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute("data-polygon-running", "false");
    act(() => intersect([{ isIntersecting: true }]));
    expect(root).toHaveAttribute("data-polygon-running", "true");
    act(() => { reduced = true; onPreferenceChange(); });
    expect(root).toHaveAttribute("data-polygon-running", "false");
    act(() => { reduced = false; onPreferenceChange(); });
    expect(root).toHaveAttribute("data-polygon-running", "true");
    fireEvent.click(screen.getByRole("button", { name: "Pause polygon animation" }));
    expect(root).toHaveAttribute("data-polygon-running", "false");
    expect(screen.getByRole("button", { name: "Resume polygon animation" })).toHaveAttribute("aria-pressed", "true");
    act(() => { hidden = true; document.dispatchEvent(new Event("visibilitychange")); });
    expect(root).toHaveAttribute("data-polygon-running", "false");
    unmount();
    expect(disconnected).toHaveBeenCalledOnce();
  });
});
