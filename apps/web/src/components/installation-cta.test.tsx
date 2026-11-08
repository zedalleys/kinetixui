import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const nav = { pathname: "/docs/components/button" };
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

import { AnalyticsProvider } from "./analytics-provider";
import { SiteFooter } from "./site-footer";
import { ComponentMeta } from "./component-meta";
import { ComponentPreview } from "./component-preview";
import NotFound from "@/app/not-found";
import { analytics, resetAnalyticsForTests } from "@/lib/analytics";

/**
 * The regression control for IA-5.7 P1: the four internal paths to `/docs/installation` that had no attribution.
 *
 * It is a RENDERED control, not a static grep. Each surface is rendered with the real `AnalyticsProvider`, and the
 * assertion is on what a real click through the provider's delegated listener produces — so deleting `ctaAttrs` from
 * any one of the four fails here, and so does a click that produces two events or the wrong source.
 *
 * What it does NOT prove: a browser's own Enter-to-activate on an anchor (jsdom has no activation behaviour for it,
 * see the keyboard case below), and nothing about PostHog delivery — `analytics.track` is spied on.
 */
const track = vi.spyOn(analytics, "track").mockImplementation(() => {});
/**
 * jsdom would navigate on a link click. Only anchors are prevented: preventing every click stops Radix's own
 * controls (the preview's Preview/Code strip) from working, and the provider listens during bubbling and never
 * consults `defaultPrevented`, exactly as in production.
 */
const noNavigate = (e: Event) => {
  if ((e.target as Element | null)?.closest?.("a[href]")) e.preventDefault();
};

beforeAll(() => {
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} unobserve() {} });
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener() {}, removeEventListener() {} }) as never;
  window.addEventListener("click", noNavigate, true);
});
afterAll(() => {
  window.removeEventListener("click", noNavigate, true);
  vi.unstubAllGlobals();
  track.mockRestore();
});
afterEach(cleanup);
beforeEach(() => {
  resetAnalyticsForTests();
  nav.pathname = "/docs/components/button";
  window.history.pushState({}, "", "/docs/components/button");
});

/** The four surfaces, each with the link a visitor would press to reach installation from it. */
type Surface = {
  surface: string;
  source: "footer" | "not_found" | "component_page";
  /** IA-5.21: which control on the surface, where `source` alone cannot say (both component-page paths share one). */
  location: "footer" | "not_found" | "component_preview" | "component_onboarding";
  path: string;
  render: () => unknown;
  /** Some surfaces hide the link behind one step a reader takes anyway (the preview's Code tab). */
  reveal?: () => Promise<void>;
  link: () => HTMLElement;
};

const SURFACES: readonly Surface[] = [
  {
    surface: "footer",
    source: "footer",
    location: "footer",
    path: "/docs/theming",
    render: () => render(<><AnalyticsProvider /><SiteFooter /></>),
    link: () => within(screen.getByRole("contentinfo")).getByRole("link", { name: "Installation" }),
  },
  {
    surface: "404 page",
    source: "not_found",
    location: "not_found",
    path: "/docs/does-not-exist",
    render: () => render(<><AnalyticsProvider /><NotFound /></>),
    link: () => screen.getByRole("link", { name: "Installation" }),
  },
  {
    surface: "component preview",
    source: "component_page",
    location: "component_preview",
    path: "/docs/components/button",
    render: () => render(<><AnalyticsProvider /><ComponentPreview name="button-demo" /></>),
    // the setup link lives in the Code tab, which is where a reader who wants React source actually is
    reveal: async () => { await userEvent.click(screen.getByRole("radio", { name: "code" })); },
    link: () => screen.getByRole("link", { name: "React installation and setup" }),
  },
  {
    surface: "component onboarding (install strip)",
    source: "component_page",
    location: "component_onboarding",
    path: "/docs/components/button",
    render: () => render(<><AnalyticsProvider /><ComponentMeta /></>),
    link: () => screen.getByRole("link", { name: "React Setup →" }),
  },
];

describe("every internal path to installation is attributed", () => {
  it.each(SURFACES)("$surface: one click, exactly one cta_clicked from $source at $location", async ({ path, source, location, render: renderSurface, reveal, link }) => {
    nav.pathname = path;
    window.history.pushState({}, "", path);
    renderSurface();
    await reveal?.();
    const anchor = link();
    track.mockClear();
    await userEvent.click(anchor);
    expect(track.mock.calls).toEqual([["cta_clicked", { source, target: "installation", location }]]);
  });

  it.each(SURFACES)("$surface: the CTA's destination is the installation page itself", async ({ path, render: r, reveal, link }) => {
    nav.pathname = path;
    window.history.pushState({}, "", path);
    r();
    await reveal?.();
    const anchor = link();
    expect(new URL(anchor.getAttribute("href")!, window.location.origin).pathname).toBe("/docs/installation");
    expect(anchor.dataset.analyticsCta).toBe("installation");
  });

  it.each(SURFACES)("$surface: fires no cta_clicked on render — the CTA is a click, not an impression", ({ path, render: r }) => {
    nav.pathname = path;
    window.history.pushState({}, "", path);
    track.mockClear();
    r();
    expect(track.mock.calls.filter(([event]) => event === "cta_clicked")).toEqual([]);
  });

  it.each(SURFACES)("$surface: a keyboard reaches the CTA and Enter produces the same single event", async ({ path, source, location, render: r, reveal, link }) => {
    nav.pathname = path;
    window.history.pushState({}, "", path);
    r();
    await reveal?.();
    const anchor = link();
    // A keyboard user reaches it by Tab, so it must stay a focusable anchor with an href and no tabindex taking it out.
    anchor.focus();
    expect(document.activeElement).toBe(anchor);
    expect(anchor.tagName).toBe("A");
    expect(anchor.getAttribute("tabindex")).toBeNull();
    track.mockClear();
    await userEvent.keyboard("{Enter}");
    // The provider listens for `click`, which is what Enter on a focused anchor produces — so the keyboard path and
    // the pointer path are one event, not two code paths. (This is jsdom's activation, not a real browser's.)
    expect(track.mock.calls).toEqual([["cta_clicked", { source, target: "installation", location }]]);
  });
});

describe("the four surfaces tag nothing else", () => {
  it("the footer marks only its installation link", () => {
    render(<SiteFooter />);
    const marked = [...screen.getByRole("contentinfo").querySelectorAll<HTMLAnchorElement>("a[data-analytics-cta]")];
    expect(marked.map((a) => `${a.dataset.analyticsCta} → ${a.getAttribute("href")}`)).toEqual(["installation → /docs/installation"]);
  });

  it("the 404 page marks only its installation link, so a wrong turn is not read as intent", () => {
    const { container } = render(<NotFound />);
    const marked = [...container.querySelectorAll<HTMLAnchorElement>("a[data-analytics-cta]")];
    expect(marked.map((a) => `${a.dataset.analyticsCta} → ${a.getAttribute("href")}`)).toEqual(["installation → /docs/installation"]);
  });

  it("the preview's code tab tags React's setup link only, across all five platform tabs", async () => {
    render(<ComponentPreview name="button-demo" />);
    await userEvent.click(screen.getByRole("radio", { name: "code" }));
    const tagged: string[] = [];
    for (const label of ["React", "Angular", "SwiftUI", "Jetpack Compose", "Flutter"]) {
      await userEvent.click(screen.getByRole("tab", { name: new RegExp(`^${label}`) }));
      for (const a of document.querySelectorAll<HTMLAnchorElement>("a[data-analytics-cta]")) tagged.push(`${label}: ${a.getAttribute("href")}`);
    }
    expect(tagged).toEqual(["React: /docs/installation"]);
  });

  it("the install strip tags React's setup link only: the event has no platform, so five destinations must not merge", () => {
    const { container } = render(<ComponentMeta />);
    const marked = [...container.querySelectorAll<HTMLAnchorElement>("a[data-analytics-cta]")];
    expect(marked.map((a) => a.getAttribute("href"))).toEqual(["/docs/installation"]);
  });
});
