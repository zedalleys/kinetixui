import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CrystalBrandHero } from "./crystal-brand-hero";

let intersection: (entries: { isIntersecting: boolean }[]) => void;
let notifyPreference: () => void;
let reduceMotion = false;
let tabHidden = false;
const disconnect = vi.fn();

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  reduceMotion = false;
  tabHidden = false;
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: typeof intersection) { intersection = callback; }
    observe() {}
    disconnect = disconnect;
  });
  Object.defineProperty(document, "hidden", { configurable: true, get: () => tabHidden });
  window.matchMedia = vi.fn().mockImplementation(() => ({
    get matches() { return reduceMotion; },
    addEventListener: (_: string, callback: () => void) => { notifyPreference = callback; },
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe("KinetixUI crystal rebrand hero", () => {
  it("uses custom SVG polygons, dynamic routes and semantic brand colors, not a bitmap", () => {
    const { container } = render(<CrystalBrandHero />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("viewBox", "0 0 780 700");
    expect(svg?.querySelectorAll(".kx-crystal-facets polygon")).toHaveLength(33);
    expect(svg?.querySelectorAll(".kx-crystal-edges line").length).toBeGreaterThan(40);
    expect(svg?.querySelectorAll(".kx-crystal-core-traces path")).toHaveLength(3);
    expect(svg?.querySelectorAll(".kx-crystal-orbit-signal")).toHaveLength(3);
    expect(svg?.querySelectorAll("image")).toHaveLength(0);
    expect(svg?.querySelector('stop[stop-color="var(--kx-brand-teal)"]')).not.toBeNull();
  });

  it("pauses on reduced motion, offscreen, hidden tab and persisted user choice", () => {
    const { container, unmount } = render(<CrystalBrandHero />);
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute("data-polygon-running", "false");
    act(() => intersection([{ isIntersecting: true }]));
    expect(root).toHaveAttribute("data-polygon-running", "true");
    act(() => { reduceMotion = true; notifyPreference(); });
    expect(root).toHaveAttribute("data-polygon-running", "false");
    act(() => { reduceMotion = false; notifyPreference(); });
    fireEvent.click(screen.getByRole("button", { name: "Pause polygon animation" }));
    expect(root).toHaveAttribute("data-polygon-running", "false");
    expect(screen.getByRole("button", { name: "Resume polygon animation" })).toHaveAttribute("aria-pressed", "true");
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
    render(<CrystalBrandHero />);
    act(() => intersection([{ isIntersecting: true }]));
    expect(screen.getByRole("button", { name: "Resume polygon animation" })).toHaveAttribute("aria-pressed", "true");
    act(() => { tabHidden = true; document.dispatchEvent(new Event("visibilitychange")); });
  });
});
