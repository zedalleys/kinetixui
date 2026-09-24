import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeroTokenFan } from "./hero-token-fan";
import { PLATFORMS, PLATFORM_DEFINITIONS } from "@/lib/platform-parity";
import manifest from "../../../../components.manifest.json";

/**
 * The fan is decorative, so these tests are about TRUTH and GEOMETRY, not pixels.
 *
 * It used to hard-code `["React", "SwiftUI", "Compose", "Flutter"]` and say "one token → four platforms".
 * Angular had been a real platform for weeks by then. Nothing failed, because nothing checked — the list
 * and the copy were two claims with no source behind them. These tests give them one.
 *
 * Deliberately no SVG path snapshot: that would fail on every visual tweak while still passing if the
 * diagram silently dropped a platform, which is exactly the wrong way round.
 */
function fan() {
  const { container } = render(<HeroTokenFan />);
  return container.querySelector("svg")!;
}

const labels = (svg: SVGElement) => [...svg.querySelectorAll(".kx-fan-label")].map((n) => n.textContent?.trim());

describe("HeroTokenFan — what it claims", () => {
  it("draws one row per platform in components.manifest.json, in the manifest's own order", () => {
    const svg = fan();
    // "token" is the source caption; the rest are the targets.
    expect(labels(svg).filter((l) => l !== "token")).toEqual([...PLATFORMS]);
    expect(svg.querySelectorAll(".kx-fan-node")).toHaveLength(PLATFORMS.length);
    expect(svg.querySelectorAll(".kx-fan-wire")).toHaveLength(PLATFORMS.length);
  });

  it("derives that list from the manifest rather than a copy of it", () => {
    // The manifest is the source; if someone adds a platform there and not here, the first test fails.
    expect([...PLATFORMS]).toEqual(Object.keys(manifest.platformDefinitions));
  });

  it("includes Angular", () => {
    expect(labels(fan())).toContain("Angular");
  });

  it("marks every non-stable platform with its maturity, and leaves the stable ones unqualified", () => {
    const svg = fan();
    const notes = [...svg.querySelectorAll(".kx-fan-note")].map((n) => n.textContent?.trim());
    const expected = PLATFORMS.filter((p) => PLATFORM_DEFINITIONS[p].maturity !== "stable").map(
      (p) => PLATFORM_DEFINITIONS[p].maturity,
    );
    expect(notes).toEqual(expected);
    // Today that is exactly Angular — stated so the test fails loudly if Angular is promoted silently.
    expect(expected).toEqual(["preview"]);
  });

  it("states no platform count in the copy, so the copy cannot go stale", () => {
    const { container } = render(<HeroTokenFan />);
    const eyebrow = container.querySelector(".eyebrow")!.textContent!;
    expect(eyebrow).not.toMatch(/\b(one|two|three|four|five|six|\d+)\s+platform/i);
    // ...and it does not promise the same components everywhere, which is not true.
    expect(eyebrow).not.toMatch(/same components|parity|every component/i);
  });
});

describe("HeroTokenFan — geometry and semantics", () => {
  it("sizes the viewBox to the number of rows instead of a fixed height", () => {
    const [, , width, height] = fan().getAttribute("viewBox")!.split(" ").map(Number);
    const rows = [...fan().querySelectorAll<SVGCircleElement>(".kx-fan-node")].map((c) =>
      Number(c.getAttribute("cy")),
    );
    const gap = rows[1]! - rows[0]!;

    // Evenly spaced, in order, and the box is the rows plus one matching margin at each end.
    expect(rows).toEqual([...rows].sort((a, b) => a - b));
    for (let i = 1; i < rows.length; i++) expect(rows[i]! - rows[i - 1]!).toBe(gap);
    expect(height).toBe(rows[rows.length - 1]! + rows[0]!);

    // Nothing is clipped: every row's ink and the widest label sit inside the box.
    expect(rows[0]! - 8).toBeGreaterThanOrEqual(0);
    expect(rows[rows.length - 1]! + 8).toBeLessThanOrEqual(height);
    const labelX = Number(fan().querySelector<SVGTextElement>(".kx-fan-label")!.getAttribute("x"));
    expect(labelX).toBeLessThan(width);
  });

  it("gives every node the same animated class, so the reduced-motion rule keeps covering all of them", () => {
    // globals.css disables animation for .kx-fan-wire/.kx-fan-source/.kx-fan-node under
    // prefers-reduced-motion. A node that opted out of that class would bypass the guardrail.
    const svg = fan();
    expect(svg.querySelectorAll(".kx-fan-node")).toHaveLength(PLATFORMS.length);
    expect(svg.querySelectorAll("circle:not(.kx-fan-node)")).toHaveLength(0);
    expect(svg.querySelectorAll(".kx-fan-source")).toHaveLength(1);
  });

  it("stays decorative — the hero's prose is what names the platforms to a screen reader", () => {
    const { container } = render(<HeroTokenFan />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden");
    expect(container.querySelector("svg")).toHaveAttribute("role", "presentation");
  });
});
