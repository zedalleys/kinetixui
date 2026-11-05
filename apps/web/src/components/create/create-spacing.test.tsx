import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SectionHead } from "@/components/section-head";
import { DashboardScene } from "./scenes/dashboard-scene";

/**
 * Create's two columns share one section head, and its dashboard scene does not double its shells.
 *
 * The preview column used to carry a hand-rolled copy of SectionHead that had drifted from it
 * (`items-center` and `gap-3` against the shared head's `items-baseline` and `gap-x-4`), so the two
 * columns' rules began on the same line while [08] and its label sat 11px below [01] and its label.
 * The scene wrapped each Metric — itself a bordered, padded card — in `Card` + `CardContent p-4`,
 * drawing a second border a hairline outside the first and paying for the padding twice; that cost
 * 34px of a 183px card and was half of why the value and the trend collided.
 *
 * The measured alignment and the measured content widths are asserted in a real browser by the
 * `spacing` check of `scripts/web-quality-browser.mjs`. These hold the structure that produces them.
 */
afterEach(cleanup);

describe("SectionHead actions slot", () => {
  it("end-aligns a control on the rule without leaving the shared baseline row", () => {
    render(<SectionHead index="08" label="Kinetix theme preview" actions={<button type="button">Scene</button>} />);
    const slot = document.querySelector("[data-section-actions]") as HTMLElement;
    expect(slot).not.toBeNull();
    expect(slot.className).toContain("ms-auto");
    // Centred, not baseline-aligned: a 34px control has no text baseline worth sharing with a 12px label.
    expect(slot.className).toContain("self-center");
    expect(slot.parentElement?.className).toContain("items-baseline");
    expect(screen.getByRole("button", { name: "Scene" }).parentElement).toBe(slot);
  });

  it("puts the index and the label in the same baseline row as every other head", () => {
    render(<SectionHead index="01" label="Appearance" />);
    const head = screen.getByText("[01]").parentElement as HTMLElement;
    const spans = head.querySelectorAll("span");
    expect(spans[0]).toHaveTextContent("[01]");
    expect(spans[1]).toHaveTextContent("Appearance");
    expect(head.className).toContain("items-baseline");
    expect(head.className).toContain("gap-x-4");
    expect(head.className).toContain("border-t");
  });

  it("leaves the head unchanged when no actions are given", () => {
    render(<SectionHead index="02" label="Design" meta="custom" />);
    expect(document.querySelector("[data-section-actions]")).toBeNull();
    expect(document.querySelector("[data-section-meta]")).toHaveTextContent("custom");
  });
});

describe("dashboard preview scene", () => {
  it("renders each stat as one Metric card, not a Metric inside a second card", () => {
    render(<DashboardScene />);
    const pairs = document.querySelectorAll("[data-kx-metric-pair]");
    expect(pairs).toHaveLength(3);
    for (const pair of Array.from(pairs)) {
      const metric = pair.parentElement as HTMLElement;
      // The Metric is its own card: it owns the border and the padding.
      expect(metric.className).toContain("border");
      expect(metric.className).toContain("p-4");
      // Its parent is the stats grid itself — no wrapper drawing a second border or paying for the
      // padding again.
      const parent = metric.parentElement as HTMLElement;
      expect(parent.className).toContain("grid");
      expect(parent.className).not.toContain("border");
      expect(parent.className).not.toMatch(/\bp-4\b/);
    }
  });

  it("keeps the card surface the removed wrapper used to contribute", () => {
    render(<DashboardScene />);
    for (const pair of Array.from(document.querySelectorAll("[data-kx-metric-pair]"))) {
      expect((pair.parentElement as HTMLElement).className).toContain("bg-card");
    }
  });

  it("still exercises the card surface on the sections that are genuinely cards", () => {
    render(<DashboardScene />);
    expect(screen.getByText("Traffic by source")).toBeInTheDocument();
    expect(screen.getByText("Recent runs")).toBeInTheDocument();
    expect(screen.getByText("Invite a teammate")).toBeInTheDocument();
  });
});
