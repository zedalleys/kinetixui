import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { IotExampleShowcase } from "./example-showcase";

const show = () =>
  render(
    <IotExampleShowcase slug="demo" title="Demo" description="d" uses={["DeviceCard"]} path="apps/web/src/examples/iot/demo.tsx" code="const x = 1;">
      <p>live preview</p>
    </IotExampleShowcase>,
  );

afterEach(() => {
  document.documentElement.removeAttribute("dir");
});

describe("IotExampleShowcase direction", () => {
  it("lets the live preview inherit an RTL document instead of forcing LTR", () => {
    document.documentElement.setAttribute("dir", "rtl");
    show();
    const region = screen.getByRole("region", { name: "Demo preview" });
    // the nearest element that carries a `dir` attribute above the preview decides its direction
    expect(region.closest("[dir]")?.getAttribute("dir")).toBe("rtl");
  });

  it("stays LTR in an LTR document, and keeps the source code LTR either way", () => {
    show();
    expect(screen.getByRole("region", { name: "Demo preview" }).closest("[dir]")?.getAttribute("dir")).toBe("ltr");
    document.documentElement.setAttribute("dir", "rtl");
    const { container } = show();
    expect(container.querySelector("pre")?.getAttribute("dir")).toBe("ltr");
  });

  it("follows a direction change made after mount", async () => {
    show();
    const region = screen.getByRole("region", { name: "Demo preview" });
    expect(region.closest("[dir]")?.getAttribute("dir")).toBe("ltr");
    act(() => document.documentElement.setAttribute("dir", "rtl"));
    await waitFor(() => expect(region.closest("[dir]")?.getAttribute("dir")).toBe("rtl"));
  });
});

/**
 * How much of a phone the frame is allowed to eat.
 *
 * At a 390px viewport the page gutter already takes 32px; a further 32px of preview padding left an
 * otherwise-responsive example 326px to lay itself out in, and `overflow-x: auto` turned the result into an
 * invisible horizontal scroll rather than a visible break. The inline padding halves below `sm`; `sm:p-6` is
 * the desktop framing and does not move.
 */
describe("IotExampleShowcase preview frame", () => {
  it("frames the preview tightly below sm and keeps the desktop padding", () => {
    show();
    const region = screen.getByRole("region", { name: "Demo preview" });
    expect(region.className).toMatch(/\bpx-2\b/);
    expect(region.className).toMatch(/\bpy-4\b/);
    expect(region.className).toMatch(/\bsm:p-6\b/);
    // the old, doubled-up phone padding is gone
    expect(region.className).not.toMatch(/(^|\s)p-4(\s|$)/);
    // and the tint that separates one example from the next stays
    expect(region.className).toMatch(/bg-muted\/30/);
  });

  it("keeps the scroll region keyboard-reachable and named", () => {
    show();
    const region = screen.getByRole("region", { name: "Demo preview" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region.className).toMatch(/\boverflow-x-auto\b/);
    expect(region.className).toMatch(/focus-visible:ring-2/);
  });

  it("drops the frame entirely when the preview brings its own surface", () => {
    render(
      <IotExampleShowcase slug="demo" title="Bare" description="d" uses={["DeviceCard"]} path="p.tsx" code="x" bare>
        <p>live preview</p>
      </IotExampleShowcase>,
    );
    const region = screen.getByRole("region", { name: "Bare preview" });
    expect(region.className).not.toMatch(/\bpx-2\b/);
    expect(region).toHaveAttribute("tabindex", "0");
  });
});
