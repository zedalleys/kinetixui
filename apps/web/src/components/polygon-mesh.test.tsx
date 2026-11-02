import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PolygonMesh } from "./polygon-mesh";

let intersect: (entries: { isIntersecting: boolean }[]) => void;
let preferenceChanged: () => void;
let reduced = false;
let hidden = false;
const disconnect = vi.fn();
const removePreferenceListener = vi.fn();

beforeEach(() => {
  window.localStorage.removeItem("kx-polygon-motion");
  reduced = false;
  hidden = false;
  vi.clearAllMocks();
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: typeof intersect) { intersect = callback; }
    observe() {}
    disconnect = disconnect;
  });
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  window.matchMedia = vi.fn().mockImplementation(() => ({
    get matches() { return reduced; },
    addEventListener: (_: string, callback: () => void) => { preferenceChanged = callback; },
    removeEventListener: removePreferenceListener,
  }));
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("polygon motion lifecycle", () => {
  it("runs only while visible and stops for background tabs and live reduced-motion changes", () => {
    const { container, unmount } = render(<PolygonMesh animated />);
    const mesh = container.firstElementChild!;
    expect(mesh).toHaveAttribute("data-polygon-running", "false");
    act(() => intersect([{ isIntersecting: true }]));
    expect(mesh).toHaveAttribute("data-polygon-running", "true");
    act(() => { hidden = true; document.dispatchEvent(new Event("visibilitychange")); });
    expect(mesh).toHaveAttribute("data-polygon-running", "false");
    act(() => { hidden = false; document.dispatchEvent(new Event("visibilitychange")); });
    expect(mesh).toHaveAttribute("data-polygon-running", "true");
    act(() => { reduced = true; preferenceChanged(); });
    expect(mesh).toHaveAttribute("data-polygon-running", "false");
    act(() => { reduced = false; preferenceChanged(); });
    act(() => intersect([{ isIntersecting: false }]));
    expect(mesh).toHaveAttribute("data-polygon-running", "false");
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(removePreferenceListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("remembers a keyboard-operable pause without removing any base geometry", () => {
    const { container, unmount } = render(<PolygonMesh animated />);
    act(() => intersect([{ isIntersecting: true }]));
    const count = container.querySelectorAll(".kx-polygon-art path, .kx-polygon-art circle").length;
    fireEvent.click(screen.getByRole("button", { name: "Pause polygon animation" }));
    expect(container.firstElementChild).toHaveAttribute("data-polygon-running", "false");
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelectorAll(".kx-polygon-art path, .kx-polygon-art circle")).toHaveLength(count);
    unmount();
    const next = render(<PolygonMesh animated />);
    act(() => intersect([{ isIntersecting: true }]));
    expect(next.container.firstElementChild).toHaveAttribute("data-polygon-running", "false");
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("uses a distinct editable SVG composition for the homepage, colored by brand tokens", () => {
    const { container } = render(<PolygonMesh animated variant="hero" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("viewBox", "0 0 980 690");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll(".kx-hero-facets polygon")).toHaveLength(27);
    expect(container.querySelectorAll(".kx-hero-trace")).toHaveLength(3);
    expect(container.querySelectorAll(".kx-hero-nodes circle")).toHaveLength(22);
    expect(container.querySelector(".kx-hero-drift")).not.toBeNull();
    expect(container.querySelectorAll(".kx-mesh-tone-1")).toHaveLength(0);
    act(() => intersect([{ isIntersecting: true }]));
    expect(container.firstElementChild).toHaveAttribute("data-polygon-running", "true");
    fireEvent.click(screen.getByRole("button", { name: "Pause polygon animation" }));
    expect(container.firstElementChild).toHaveAttribute("data-polygon-running", "false");
  });

  it("keeps decorative instances static and outside the accessibility tree", () => {
    const { container } = render(<PolygonMesh />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("svg")).toHaveAttribute("focusable", "false");
    expect(screen.queryByRole("button")).toBeNull();
    expect(container.firstElementChild).toHaveAttribute("data-polygon-running", "false");
  });
});
