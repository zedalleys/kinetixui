import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Showcase } from "./showcase";
import { analytics, sanitizeProps } from "@/lib/analytics";

/**
 * Emission, not classification.
 *
 * `analytics-surfaces.test.ts` proves `/blocks` resolves to a source and that the platform mapper refuses
 * unknown values. Neither says the component actually fires anything — which is the failure mode that
 * matters here, because the gap Phase 3 closed was precisely a page where nothing was emitted at all.
 *
 * `Showcase` is shared with /charts, where a chart example is not a block. So the instrumentation is opt-in
 * and the most important test below is the one asserting silence without a slug.
 */
const track = vi.spyOn(analytics, "track").mockImplementation(() => {});
beforeEach(() => track.mockClear());

const sources = { React: "const a = 1;", SwiftUI: "let a = 1", Flutter: "final a = 1;" };

describe("Showcase analytics", () => {
  it("fires nothing on render — showing a block is not evaluating one", () => {
    render(<Showcase title="Pricing tier" sources={sources} analyticsBlock="pricing-tier">
      <div>preview</div>
    </Showcase>);
    expect(track).not.toHaveBeenCalled();
  });

  it("reports a platform switch with the block that was switched", async () => {
    render(<Showcase title="Pricing tier" sources={sources} analyticsBlock="pricing-tier">
      <div>preview</div>
    </Showcase>);
    await userEvent.click(screen.getByRole("tab", { name: /code/i }));
    await userEvent.click(screen.getByRole("tab", { name: "SwiftUI" }));

    expect(track).toHaveBeenCalledWith("platform_selected", {
      platform: "swiftui",
      block: "pricing-tier",
      location: "platform_tabs",
      source: "blocks_gallery",
    });
  });

  it("reports a copy as the block and platform it was, never the code", async () => {
    // `setup()` installs the clipboard stub jsdom lacks. Without it `CopyButton` treats the write as
    // blocked and — correctly — reports nothing, so the test would pass for the wrong reason.
    const user = userEvent.setup();
    render(<Showcase title="Pricing tier" sources={sources} analyticsBlock="pricing-tier">
      <div>preview</div>
    </Showcase>);
    await user.click(screen.getByRole("tab", { name: /code/i }));
    await user.click(screen.getByRole("button", { name: /copy/i }));

    const call = track.mock.calls.find(([name]) => name === "block_code_copied");
    expect(call, "a copy should be reported").toBeTruthy();
    expect(call![1]).toEqual({ block: "pricing-tier", platform: "react", source: "blocks_gallery" });
    // The copied source must not appear in any property of any event.
    for (const [, props] of track.mock.calls) {
      expect(JSON.stringify(props ?? {})).not.toContain("const a = 1;");
    }
  });

  it("stays silent without a block slug, so /charts reports nothing as a block", async () => {
    const user = userEvent.setup();
    render(<Showcase title="Area chart" sources={sources}>
      <div>preview</div>
    </Showcase>);
    await user.click(screen.getByRole("tab", { name: /code/i }));
    await user.click(screen.getByRole("tab", { name: "SwiftUI" }));
    await user.click(screen.getByRole("button", { name: /copy/i }));
    expect(track).not.toHaveBeenCalled();
  });

  it("emits only sanitary properties", async () => {
    render(<Showcase title="Pricing tier" sources={sources} analyticsBlock="pricing-tier">
      <div>preview</div>
    </Showcase>);
    await userEvent.click(screen.getByRole("tab", { name: /code/i }));
    await userEvent.click(screen.getByRole("tab", { name: "Flutter" }));
    for (const [, props] of track.mock.calls) {
      expect(sanitizeProps(props as object)).toEqual(props ?? {});
    }
  });
});
