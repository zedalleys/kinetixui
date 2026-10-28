import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ pathname: "/docs/components/button" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

import NotFound from "../app/not-found";
import { ComponentMeta } from "./component-meta";
import { ComponentPreview } from "./component-preview";
import { SiteFooter } from "./site-footer";
import { analytics } from "@/lib/analytics";
import { trackLinkClick } from "@/lib/analytics-surfaces";
import { SETUP_HREF } from "@/lib/platform-tabs";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/**
 * Measured 2026-10-28: no session reached /docs/installation in the eleven days from 2026-10-18, and
 * `cta_clicked` fired zero times. Both homepage links to installation were already instrumented, so that
 * zero is behavioural there — but four other routes into setup emitted nothing at all, so a visitor who
 * tried them was invisible. These tests hold those four routes instrumented.
 *
 * The contract is unchanged: `cta_clicked` with the existing `source` and `target` properties, no new
 * event name, no change to Qualified Evaluation. Each path also gets a scope control, because marking a
 * neighbouring link would quietly widen what `target: "installation"` means.
 */

const ctaOf = (el: Element | null) => ({
  target: el?.getAttribute("data-analytics-cta") ?? null,
  source: el?.getAttribute("data-analytics-source") ?? null,
});

describe("routes into installation are attributable", () => {
  it("marks the footer's installation link, and only it", () => {
    render(<SiteFooter />);
    expect(ctaOf(screen.getByRole("link", { name: "Installation" }))).toEqual({
      target: "installation",
      source: "footer",
    });
    // CONTROL: a neighbouring docs link in the same column stays unmarked.
    expect(ctaOf(screen.getByRole("link", { name: "Theming" }))).toEqual({ target: null, source: null });
  });

  it("marks the 404 recovery link into installation, and only it", () => {
    render(<NotFound />);
    expect(ctaOf(screen.getByRole("link", { name: "Installation" }))).toEqual({
      target: "installation",
      source: "not_found",
    });
    // CONTROL: the other recovery links are not adoption intent.
    expect(ctaOf(screen.getByRole("link", { name: "Changelog" }))).toEqual({ target: null, source: null });
  });

  it("marks the component page's React setup link, and not the other platforms'", () => {
    render(<ComponentMeta />);
    expect(ctaOf(screen.getByRole("link", { name: "React Setup →" }))).toEqual({
      target: "installation",
      source: "component_page",
    });
    // CONTROL: Angular's setup page is a different destination and a different question.
    expect(ctaOf(screen.getByRole("link", { name: "Angular Setup →" }))).toEqual({ target: null, source: null });
  });

  it("marks the preview's React setup link, and not the other platforms'", async () => {
    const user = userEvent.setup();
    render(<ComponentPreview name="button-demo" />);
    await user.click(screen.getByRole("radio", { name: "code" }));
    const react = screen.getByRole("link", { name: /React installation and setup/ });
    expect(react).toHaveAttribute("href", SETUP_HREF.React);
    expect(ctaOf(react)).toEqual({ target: "installation", source: "component_page" });
  });

  it("reports a followed footer link as cta_clicked with the existing contract", () => {
    const track = vi.spyOn(analytics, "track").mockImplementation(() => {});
    render(<SiteFooter />);
    trackLinkClick(
      screen.getByRole("link", { name: "Installation" }) as HTMLAnchorElement,
      "/docs/components/button",
      "https://kinetixui.com",
    );
    expect(track).toHaveBeenCalledWith("cta_clicked", { source: "footer", target: "installation" });
    // CONTROL: no second event, and no new event name alongside it.
    expect(track).toHaveBeenCalledTimes(1);
  });
});

/**
 * Source-level controls. A rendered assertion proves the attribute is present now; these prove the wiring
 * that puts it there has not been deleted, which is the way this regresses — a tidy-up of a link, not a
 * deliberate removal of an event.
 */
describe("the wiring that marks those routes", () => {
  const src = (f: string) => readFileSync(join(__dirname, f), "utf8");
  const page = (f: string) => readFileSync(join(__dirname, "..", "app", f), "utf8");

  it("keeps ctaAttrs on all four routes", () => {
    expect(src("site-footer.tsx")).toMatch(/ctaAttrs\("footer", l\.cta\)/);
    expect(page("not-found.tsx")).toMatch(/ctaAttrs\("not_found", l\.cta\)/);
    expect(src("component-meta.tsx")).toMatch(/ctaAttrs\("component_page", "installation"\)/);
    expect(src("component-preview.tsx")).toMatch(/ctaAttrs\("component_page", "installation"\)/);
  });

  it("keeps the React-only condition on the two platform setup links", () => {
    expect(src("component-meta.tsx")).toMatch(/SETUP_SECTION_HREF\[p\] === SETUP_HREF\.React \?/);
    expect(src("component-preview.tsx")).toMatch(/setupHref\[tab\] === SETUP_HREF\.React \?/);
  });
});
