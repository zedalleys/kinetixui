import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { IotHeroArt } from "./iot-hero-art";
import { IOT_HERO_ART_SVG } from "./iot-hero-art-svg";

/**
 * What jsdom can prove about the /iot hero illustration: that it is safe to inline and silent to assistive technology,
 * that the animation hooks exist in the counts the CSS assumes, and that the pause control works. Whether the loops
 * run, stop under reduced motion and leave the page in place is browser work.
 */
describe("IotHeroArt", () => {
  beforeEach(() => window.localStorage.clear());

  it("inlines nothing that runs or fetches, and nothing that names the page's global CSS", () => {
    expect(IOT_HERO_ART_SVG).not.toMatch(/<script|<foreignObject|<image|\son[a-z]+=/i);
    // Only same-document references: `href="#…"` and `url(#…)`.
    expect(IOT_HERO_ART_SVG).not.toMatch(/href="[^#]/);
    expect(IOT_HERO_ART_SVG).not.toMatch(/url\([^#]/);
    // An inline SVG's <style> and ids are document-global. The editor's `.cls-N` rules would have leaked.
    expect(IOT_HERO_ART_SVG).not.toMatch(/<style|class="cls-/);
    // Ids are document-global too, and nothing in the illustration needs one.
    expect(IOT_HERO_ART_SVG).not.toMatch(/\sid="/);
  });

  it("maps every colour in the artwork onto a site token, so nothing keeps the stock palette", () => {
    const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
    const fills = new Set([...IOT_HERO_ART_SVG.matchAll(/\sfill="(#[0-9a-f]+)"/gi)].map((m) => m[1]));
    expect(fills.size).toBeGreaterThan(0);
    for (const fill of fills) expect(css, `${fill} has no token mapping`).toContain(`.kx-iot-art [fill="${fill}"]`);
  });

  it("is decorative: hidden from assistive technology, with no name and no role of its own", () => {
    const { container } = render(<IotHeroArt svg={IOT_HERO_ART_SVG} />);
    const svg = container.querySelector("svg.kx-iot-art")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("focusable")).toBe("false");
    expect(screen.queryByRole("img")).toBeNull();
    // The pause button is the frame's only accessible content.
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("carries the animation hooks globals.css is written against", () => {
    const { container } = render(<IotHeroArt svg={IOT_HERO_ART_SVG} />);
    const count = (selector: string) => container.querySelectorAll(selector).length;
    expect(count(".kx-iot-art-pin")).toBe(24); // 4.8s ÷ 0.2s per pin
    expect(count(".kx-iot-art-pin > :nth-child(3)")).toBe(24);
    expect(count(".kx-iot-art-data")).toBe(10); // 4.8s ÷ 0.48s per column
    expect(count(".kx-iot-art-layer")).toBe(10);
    expect(count(".kx-iot-art-glyph")).toBe(1);
    expect(count(".kx-iot-art-cloud")).toBe(1);
    // No background: the chip sits on the page.
    expect(IOT_HERO_ART_SVG).not.toMatch(/<rect/);
  });

  it("pauses and resumes from a keyboard-operable toggle, and remembers the choice", () => {
    const { container, unmount } = render(<IotHeroArt svg={IOT_HERO_ART_SVG} />);
    const frame = container.querySelector("[data-iot-hero-art]")!;
    const button = screen.getByRole("button", { name: "Pause the illustration's animation" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(frame.hasAttribute("data-paused")).toBe(false);

    fireEvent.click(button);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(frame.hasAttribute("data-paused")).toBe(true);
    unmount();

    const again = render(<IotHeroArt svg={IOT_HERO_ART_SVG} />);
    expect(again.container.querySelector("[data-iot-hero-art]")!.hasAttribute("data-paused")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Pause the illustration's animation" }));
    expect(again.container.querySelector("[data-iot-hero-art]")!.hasAttribute("data-paused")).toBe(false);
  });
});
