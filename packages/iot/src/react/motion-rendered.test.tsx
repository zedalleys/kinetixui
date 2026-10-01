import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CommandLifecycle } from "./command-lifecycle";
import { DeviceLevelControl } from "./device-level-control";
import { DeviceModeControl } from "./device-mode-control";
import { DevicePowerControl } from "./device-power-control";

/** Mid-flight: some stages reached, some still ahead — the state the transitions exist for. */
const LC = { stage: "acknowledged", attempts: 1, maxAttempts: 3, requestedValue: "on", confirmedValue: "off", ackAt: Date.now() } as never;

/**
 * motion-rendered.test.tsx — the motion is on the element whose state actually changes.
 *
 * `apps/web/src/lib/motion-contract.test.ts` proves the token wiring exists. That is infrastructure
 * evidence, and it passed the whole time the command lifecycle had no transition at all: every stage
 * change — requested, pending, acknowledged, confirmed, failed — snapped, because the elements that
 * carry the stage were simply never given a transition class. A contract test that reads the Tailwind
 * config cannot see that.
 *
 * So these assert the pairing a user actually perceives: the element whose classes change between
 * states is the element that carries the transition, and each one keeps its reduced-motion escape.
 * They are deliberately about placement, not about whether a token exists.
 */

afterEach(cleanup);

/** Every stage-bearing node must animate its own change and opt out under reduced motion. */
const classOf = (el: Element) => el.getAttribute("class") ?? "";

const animates = (el: Element, property: "colors" | "opacity" = "colors") => {
  const cls = classOf(el);
  expect(cls, `expected transition-${property} on ${el.tagName.toLowerCase()}`).toContain(`transition-${property}`);
  expect(cls, "expected a token duration, not a raw value").toMatch(/duration-(instant|fast|base|slow)/);
  expect(cls, "expected a reduced-motion escape").toContain("motion-reduce:transition-none");
};

describe("CommandLifecycle animates the stage it is reporting", () => {
  it("puts the transition on the row that changes colour with the stage", () => {
    render(<CommandLifecycle lifecycle={LC} />);
    const steps = document.querySelectorAll("[data-step-state]");
    expect(steps.length).toBeGreaterThan(1);
    // The row's own colour is what says "reached" vs "still ahead".
    steps.forEach((s) => animates(s));
  });

  it("animates the marker's ring, which is a box-shadow and not a colour", () => {
    const { container } = render(<CommandLifecycle lifecycle={LC} />);
    const markers = container.querySelectorAll(".rounded-full.size-7, .size-7.rounded-full");
    expect(markers.length).toBeGreaterThan(0);
    markers.forEach((m) => {
      const cls = classOf(m);
      // `ring-*` compiles to box-shadow, which Tailwind's `transition-colors` does NOT cover — the
      // fill would fade while the ring snapped on. The property list has to name it.
      expect(cls).toContain("box-shadow");
      expect(cls).not.toMatch(/\btransition-colors\b/);
      expect(cls).toMatch(/duration-(instant|fast|base|slow)/);
      expect(cls).toContain("motion-reduce:transition-none");
    });
  });

  it("keeps the last row's DOM identity when a terminal stage replaces confirmed", () => {
    // A CSS transition needs a previous and a next computed value on the SAME node. `stepsFor` swaps
    // the third slot from `confirmed` to the terminal stage, so if the row were keyed by stage React
    // would remount it and the failure — the stage most worth seeing change — would snap.
    const acked = { stage: "acknowledged", attempts: 1, maxAttempts: 3, requestedValue: "on", ackAt: Date.now() } as never;
    const { container, rerender } = render(<CommandLifecycle lifecycle={acked} />);
    const rowBefore = container.querySelectorAll("[data-step-state]")[2];
    expect(rowBefore).toBeTruthy();

    const failed = { stage: "failed", attempts: 1, maxAttempts: 3, requestedValue: "on", ackAt: Date.now() } as never;
    rerender(<CommandLifecycle lifecycle={failed} />);
    const rowAfter = container.querySelectorAll("[data-step-state]")[2];

    expect(rowAfter.getAttribute("data-step")).toBe("failed");
    expect(rowAfter, "the terminal row must be the same node, or it mounts in its final styles").toBe(rowBefore);
  });

  it("animates the glyph that dims while a stage is still ahead", () => {
    const { container } = render(<CommandLifecycle lifecycle={LC} />);
    const dimmed = [...container.querySelectorAll("*")].filter((e) => classOf(e).includes("opacity-60"));
    expect(dimmed.length).toBeGreaterThan(0);
    dimmed.forEach((d) => animates(d, "opacity"));
  });
});

describe("the controls animate the property that actually moves", () => {
  it("DevicePowerControl moves its knob with transform, not a colour", () => {
    const { container } = render(<DevicePowerControl state="on" label="Lamp" />);
    const knob = [...container.querySelectorAll("span")].find((s) => classOf(s).includes("transition-transform"));
    expect(knob, "the knob must transition transform — a colour transition cannot move it").toBeTruthy();
    expect(classOf(knob!)).toMatch(/translate-x-/);
    expect(classOf(knob!)).toContain("motion-reduce:transition-none");
  });

  it("DeviceLevelControl transitions the fill's width", () => {
    const { container } = render(<DeviceLevelControl value={40} label="Brightness" />);
    const fill = [...container.querySelectorAll("div")].find((d) => classOf(d).includes("transition-[width]"));
    expect(fill, "the fill must transition width — the thing that changes when a level moves").toBeTruthy();
    expect(classOf(fill!)).toMatch(/duration-(instant|fast|base|slow)/);
  });

  it("DeviceModeControl transitions the selected option's colour", () => {
    render(<DeviceModeControl modes={[{ value: "auto", label: "Auto" }, { value: "heat", label: "Heat" }]} value="heat" label="Mode" />);
    const options = screen.getAllByRole("radio");
    expect(options.length).toBeGreaterThan(1);
    options.forEach((o) => animates(o));
  });
});
