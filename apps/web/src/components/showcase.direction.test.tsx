import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { Showcase } from "./showcase";

/**
 * The direction contract of the /blocks and /charts shell (Showcase):
 *
 *   - the preview follows the page's direction, so an RTL page shows the block in RTL
 *   - the controls around it (the preview / code strip, the platform strip) follow the page too
 *   - the source stays LTR — code reads left to right whatever the page around it does
 *
 * It used to force all three LTR: Radix `Tabs.Root` with no `dir` and no DirectionProvider stamps
 * `dir="ltr"` on its own root, so on an RTL page every block preview was an LTR subtree (measured in the
 * built site, Visual Slice 4: 20 of 20 showcases on /blocks). jsdom has no layout, so these are attribute
 * assertions — which is exactly where the defect lived: direction is inherited from the nearest `dir`.
 */
const sources = { React: "const a = 1;", SwiftUI: "let a = 1" };
const nearestDir = (el: Element) => el.closest("[dir]")?.getAttribute("dir") ?? null;

afterEach(() => document.documentElement.removeAttribute("dir"));

describe("Showcase direction", () => {
  it("keeps an LTR page LTR", () => {
    document.documentElement.setAttribute("dir", "ltr");
    render(<Showcase title="Sign in" sources={sources}><div data-testid="preview">preview</div></Showcase>);
    expect(nearestDir(screen.getByTestId("preview"))).toBe("ltr");
    expect(nearestDir(screen.getByRole("tablist", { name: /preview or source/ }))).toBe("ltr");
  });

  it("shows the preview and its controls in the page's direction on an RTL page", () => {
    document.documentElement.setAttribute("dir", "rtl");
    render(<Showcase title="Sign in" sources={sources}><div data-testid="preview">preview</div></Showcase>);
    expect(nearestDir(screen.getByTestId("preview"))).toBe("rtl");
    expect(nearestDir(screen.getByRole("tablist", { name: /preview or source/ }))).toBe("rtl");
  });

  it("keeps the source LTR inside an RTL page, with the platform strip following the page", async () => {
    document.documentElement.setAttribute("dir", "rtl");
    render(<Showcase title="Sign in" sources={sources}><div>preview</div></Showcase>);
    await userEvent.click(screen.getByRole("tab", { name: /code/i }));
    expect(nearestDir(screen.getByRole("tablist", { name: /implementation platform/ }))).toBe("rtl");
    expect(nearestDir(screen.getByLabelText(/React source/))).toBe("ltr");
  });

  it("follows the page when its direction changes after render", async () => {
    document.documentElement.setAttribute("dir", "ltr");
    render(<Showcase title="Sign in" sources={sources}><div data-testid="preview">preview</div></Showcase>);
    await act(async () => {
      document.documentElement.setAttribute("dir", "rtl");
      await new Promise((r) => setTimeout(r, 0)); // MutationObserver delivers on a microtask
    });
    expect(nearestDir(screen.getByTestId("preview"))).toBe("rtl");
  });
});
