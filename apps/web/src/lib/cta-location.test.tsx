import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const nav = { pathname: "/docs/components/button" };
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

import { AnalyticsProvider } from "@/components/analytics-provider";
import { SiteFooter } from "@/components/site-footer";
import { ComponentMeta } from "@/components/component-meta";
import { ComponentPreview } from "@/components/component-preview";
import NotFound from "@/app/not-found";
import { ANALYTICS_LOCATIONS, CTA_LOCATIONS, analytics, resetAnalyticsForTests } from "./analytics";
import { ctaAttrs, trackLinkClick } from "./analytics-surfaces";

/**
 * IA-5.21 §3: `cta_clicked.location` — an OPTIONAL, closed-vocabulary discriminator.
 *
 * The question it exists to answer is one `source` cannot: a component page carries TWO paths to installation (the
 * preview's setup link and the install strip's) and both are `source: component_page`, so before this they were one
 * indistinguishable count. The property is optional precisely so every `cta_clicked` recorded before it existed
 * stays valid and comparable — the suite below asserts that absence, not just presence.
 *
 * What it does NOT prove: anything about PostHog delivery or retention. `analytics.track` is spied on, so these are
 * assertions about what the site EMITS.
 */
const track = vi.spyOn(analytics, "track").mockImplementation(() => {});
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
afterEach(() => {
  cleanup();
  while (loose.length) loose.pop()!.remove();
});
beforeEach(() => {
  resetAnalyticsForTests();
  nav.pathname = "/docs/components/button";
  window.history.pushState({}, "", "/docs/components/button");
});

type Surface = {
  surface: string;
  source: string;
  location: string;
  path: string;
  render: () => unknown;
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

/** Render a surface, reveal its link if it is behind a step, and return the anchor. */
async function openSurface(s: Surface): Promise<HTMLElement> {
  nav.pathname = s.path;
  window.history.pushState({}, "", s.path);
  s.render();
  await s.reveal?.();
  return s.link();
}

/**
 * A bare anchor driven straight through the listener, for contract cases with no surface of their own. It is
 * appended OUTSIDE React's container, which `cleanup()` does not touch, so each one is removed by hand after the
 * test — otherwise a stray anchor from one case is still in the document when the next queries for one.
 */
const loose: HTMLAnchorElement[] = [];
function anchorWith(attrs: Record<string, string>): HTMLAnchorElement {
  const a = document.createElement("a");
  a.setAttribute("href", "/docs/installation");
  for (const [k, v] of Object.entries(attrs)) a.setAttribute(k, v);
  document.body.append(a);
  loose.push(a);
  return a;
}

describe("cta_clicked.location: the vocabulary", () => {
  // 1
  it("is exactly the four approved values and nothing else", () => {
    expect([...CTA_LOCATIONS]).toEqual(["footer", "not_found", "component_preview", "component_onboarding"]);
  });

  // 2
  it("is a subset of the one shared location vocabulary, so there is no second contract to drift", () => {
    for (const l of CTA_LOCATIONS) expect(ANALYTICS_LOCATIONS).toContain(l);
  });
});

describe("cta_clicked.location: what each surface emits", () => {
  // 3 (×4 surfaces)
  it.each(SURFACES)("$surface: one click emits exactly one cta_clicked carrying location $location", async (s) => {
    const anchor = await openSurface(s);
    track.mockClear();
    await userEvent.click(anchor);
    expect(track.mock.calls).toEqual([["cta_clicked", { source: s.source, target: "installation", location: s.location }]]);
  });

  // 4
  it("tells the two component-page installation paths apart, which source alone cannot", async () => {
    const seen: string[] = [];
    for (const s of SURFACES.filter((x) => x.source === "component_page")) {
      const anchor = await openSurface(s);
      track.mockClear();
      await userEvent.click(anchor);
      const [[, props]] = track.mock.calls as [[string, { source: string; location?: string }]];
      seen.push(`${props.source}/${props.location}`);
      cleanup();
    }
    expect(seen).toEqual(["component_page/component_preview", "component_page/component_onboarding"]);
    expect(new Set(seen).size).toBe(2);
  });

  // 5
  it("every surface: a keyboard Enter carries the same location as a pointer click", async () => {
    for (const s of SURFACES) {
      const anchor = await openSurface(s);
      anchor.focus();
      track.mockClear();
      await userEvent.keyboard("{Enter}");
      expect(track.mock.calls).toEqual([["cta_clicked", { source: s.source, target: "installation", location: s.location }]]);
      cleanup();
    }
  });
});

describe("cta_clicked.location: optional, so historical events stay valid", () => {
  // 6
  it("ctaAttrs omits the attribute entirely when no location is given", () => {
    expect(ctaAttrs("homepage_hero", "get_started")).toEqual({
      "data-analytics-cta": "get_started",
      "data-analytics-source": "homepage_hero",
    });
    expect("data-analytics-location" in ctaAttrs("homepage_hero", "get_started")).toBe(false);
  });

  // 7
  it("a CTA with no location emits the pre-IA-5.21 event shape exactly, with no location key at all", async () => {
    render(<AnalyticsProvider />);
    const anchor = anchorWith({ "data-analytics-cta": "get_started", "data-analytics-source": "homepage_hero" });
    track.mockClear();
    await userEvent.click(anchor);
    expect(track.mock.calls).toEqual([["cta_clicked", { source: "homepage_hero", target: "get_started" }]]);
    const [[, props]] = track.mock.calls as [[string, object]];
    expect(Object.keys(props).sort()).toEqual(["source", "target"]);
  });
});

describe("cta_clicked.location: nothing outside the vocabulary can reach it", () => {
  // 8
  it.each([
    ["an arbitrary string", "wherever"],
    ["a route", "/docs/components/button"],
    ["a DOM id", "install-strip-react"],
    ["a query parameter value", "?ref=newsletter"],
    ["a visible label", "React Setup →"],
    ["a location that is valid elsewhere but not for a CTA", "sidebar"],
    ["an empty value", ""],
  ])("drops %s and still counts the CTA", async (_label, value) => {
    render(<AnalyticsProvider />);
    const anchor = anchorWith({
      "data-analytics-cta": "installation",
      "data-analytics-source": "footer",
      "data-analytics-location": value,
    });
    track.mockClear();
    await userEvent.click(anchor);
    // The event is NOT lost — an unrecognised location must never cost a conversion count (§3.3).
    expect(track.mock.calls).toEqual([["cta_clicked", { source: "footer", target: "installation" }]]);
  });

  // 9
  it("the markup attribute is the ONLY source of a location: the route it was clicked on never leaks in", async () => {
    nav.pathname = "/docs/components/button";
    window.history.pushState({}, "", "/docs/components/button?kx_ref=footer#install");
    render(<AnalyticsProvider />);
    const anchor = anchorWith({ "data-analytics-cta": "installation", "data-analytics-source": "footer" });
    track.mockClear();
    await userEvent.click(anchor);
    const [[, props]] = track.mock.calls as [[string, Record<string, unknown>]];
    expect(props.location).toBeUndefined();
    expect(JSON.stringify(props)).not.toContain("button");
  });

  // 10
  it("marks no location on the four surfaces' OTHER links, so an untagged link stays untagged", async () => {
    for (const s of SURFACES) {
      await openSurface(s);
      const located = [...document.querySelectorAll<HTMLAnchorElement>("a[data-analytics-location]")];
      expect(located.map((a) => a.dataset.analyticsLocation)).toEqual([s.location]);
      cleanup();
    }
  });
});

/*
 * Negative controls. Each runs the REAL assertion against a deliberately wrong input, inside the test, and asserts
 * that it fails. Nothing here mutates shipped code: if the instrument ever stopped being able to catch these, these
 * tests go red instead of quietly passing.
 */
describe("negative controls: the instrument can fail", () => {
  it("NC-1 wrong-location attribution is detected: the install strip's event does not pass as the preview's", async () => {
    const strip = SURFACES.find((s) => s.location === "component_onboarding")!;
    const anchor = await openSurface(strip);
    track.mockClear();
    await userEvent.click(anchor);
    // The true assertion passes.
    expect(track.mock.calls).toEqual([["cta_clicked", { source: "component_page", target: "installation", location: "component_onboarding" }]]);
    // The same assertion with the SIBLING location must fail — otherwise the two paths were never distinguished.
    expect(() =>
      expect(track.mock.calls).toEqual([["cta_clicked", { source: "component_page", target: "installation", location: "component_preview" }]]),
    ).toThrow();
  });

  it("NC-2 a duplicate emission is detected: two events never satisfy the one-event assertion", async () => {
    const footer = SURFACES.find((s) => s.location === "footer")!;
    const anchor = await openSurface(footer);
    const expected = ["cta_clicked", { source: "footer", target: "installation", location: "footer" }];
    track.mockClear();
    await userEvent.click(anchor);
    expect(track.mock.calls).toEqual([expected]);
    // Hand the listener the same click a second time: the surface emits once, but the assertion must be able to see
    // a second event if it ever happened.
    trackLinkClick(anchor as HTMLAnchorElement, footer.path, window.location.origin);
    expect(track.mock.calls).toHaveLength(2);
    expect(() => expect(track.mock.calls).toEqual([expected])).toThrow();
  });

  it("NC-3 a missing location is detected: an untagged anchor does not pass as a tagged one", async () => {
    render(<AnalyticsProvider />);
    const anchor = anchorWith({ "data-analytics-cta": "installation", "data-analytics-source": "footer" });
    track.mockClear();
    await userEvent.click(anchor);
    expect(() =>
      expect(track.mock.calls).toEqual([["cta_clicked", { source: "footer", target: "installation", location: "footer" }]]),
    ).toThrow();
  });
});
