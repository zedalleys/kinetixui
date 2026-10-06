import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { PLATFORM_LOGOS } from "./platform-logo";
import { PlatformTicker } from "./platform-ticker";

/**
 * The homepage ticker's contract, as far as jsdom can see it: which platforms, which marks, what assistive technology
 * is given. Geometry and motion — the seamless loop, the gap at wide viewports, reduced motion wrapping, RTL, 200%
 * text — need layout and a running animation, so they are proven in a real browser by `scripts/platform-ticker.mjs`.
 *
 * The expected platforms are read from `components.manifest.json` here rather than imported through the same module
 * the component uses, so a ticker that kept a list of its own could not agree with itself and pass.
 */
const manifest = JSON.parse(readFileSync(resolve(process.cwd(), "../../components.manifest.json"), "utf8")) as {
  platformDefinitions: Record<string, { label: string }>;
};
const CANONICAL = Object.entries(manifest.platformDefinitions).map(([id, d]) => ({ id, label: d.label }));

describe("PlatformTicker", () => {
  beforeEach(() => window.localStorage.clear());

  it("names every canonical platform exactly once, in canonical order, as one labelled list", () => {
    render(<PlatformTicker />);
    const list = screen.getByRole("list", { name: "Supported platforms" });
    const items = within(list).getAllByRole("listitem");
    expect(items.map((li) => li.textContent?.trim())).toEqual(CANONICAL.map((p) => p.label));
    // Only one list reaches the accessibility tree; the loop's repeats do not.
    expect(screen.getAllByRole("list")).toHaveLength(1);
  });

  it("puts each platform's own mark beside its name, decorative, so the name is announced once", () => {
    render(<PlatformTicker />);
    const items = within(screen.getByRole("list", { name: "Supported platforms" })).getAllByRole("listitem");
    items.forEach((li, i) => {
      const svg = li.querySelector("svg");
      expect(svg, `${CANONICAL[i].label} has no mark`).not.toBeNull();
      expect(svg!.getAttribute("data-platform-logo")).toBe(CANONICAL[i].id);
      expect(svg!.getAttribute("aria-hidden")).toBe("true");
      expect(svg!.getAttribute("focusable")).toBe("false");
      expect(svg!.querySelector("title")).toBeNull();
      // Intrinsic size, so nothing shifts before CSS applies; a square box, so no mark is stretched.
      expect(svg!.getAttribute("width")).toBe(svg!.getAttribute("height"));
      expect(svg!.getAttribute("viewBox")).toBe("0 0 24 24");
    });
  });

  it("hides every repeat of the loop from assistive technology and from focus", () => {
    const { container } = render(<PlatformTicker />);
    const lists = [...container.querySelectorAll("ul")];
    expect(lists.length).toBeGreaterThanOrEqual(2);
    expect(lists.length % 2, "the strip must be two identical halves to loop seamlessly").toBe(0);
    for (const repeat of lists.slice(1)) {
      expect(repeat.getAttribute("aria-hidden")).toBe("true");
      expect(repeat.hasAttribute("inert")).toBe(true);
      expect(repeat.textContent).toBe(lists[0].textContent);
    }
  });

  it("has a mark for every canonical platform and no mark for a platform that is not canonical", () => {
    expect(Object.keys(PLATFORM_LOGOS).sort()).toEqual(CANONICAL.map((p) => p.id).sort());
    const paths = Object.values(PLATFORM_LOGOS).map((l) => l.path);
    expect(new Set(paths).size, "two platforms share a mark").toBe(paths.length);
    for (const { path } of Object.values(PLATFORM_LOGOS)) expect(path).toMatch(/^M[\d.\s,-]/);
  });

  it("offers a pause control that reports its state (WCAG 2.2.2) and pauses the strip", () => {
    const { container } = render(<PlatformTicker />);
    const button = screen.getByRole("button", { name: "Pause the platform ticker" });
    const root = container.querySelector("[data-platform-ticker]")!;
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(root.hasAttribute("data-paused")).toBe(false);
    fireEvent.click(button);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(root.hasAttribute("data-paused")).toBe(true);
    fireEvent.click(button);
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(root.hasAttribute("data-paused")).toBe(false);
  });

  it("remembers the reader's pause, so a stopped ticker stays stopped on the next visit", () => {
    const first = render(<PlatformTicker />);
    fireEvent.click(screen.getByRole("button", { name: "Pause the platform ticker" }));
    first.unmount();
    const { container } = render(<PlatformTicker />);
    expect(screen.getByRole("button", { name: "Pause the platform ticker" }).getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector("[data-platform-ticker]")!.hasAttribute("data-paused")).toBe(true);
  });
});
