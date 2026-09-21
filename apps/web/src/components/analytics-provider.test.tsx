import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ pathname: "/" as string | null }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

import { AnalyticsProvider } from "./analytics-provider";
import { analytics, attachAnalytics, resetAnalyticsForTests, sanitizeProps } from "@/lib/analytics";
import { ctaAttrs } from "@/lib/analytics-surfaces";
import { PACKAGES } from "@/lib/packages";
import { siteConfig } from "@/lib/site";

// keep the real functions so one test can run the real dispatcher; every other test observes calls without sending
const real = { track: analytics.track, pageview: analytics.pageview };
const track = vi.spyOn(analytics, "track").mockImplementation(() => {});
const pageview = vi.spyOn(analytics, "pageview").mockImplementation(() => {});

/** Every payload that would be sent must already be clean: the sanitiser must drop nothing. */
const expectSanitary = () => {
  for (const [, props] of track.mock.calls) expect(sanitizeProps(props as object)).toEqual(props ?? {});
};

beforeEach(() => {
  resetAnalyticsForTests();
  nav.pathname = "/";
  window.history.pushState({}, "", "/"); // the click handler reads the real URL, which Next keeps in step with usePathname
  track.mockClear();
  pageview.mockClear();
});

/** Anchors would try to navigate jsdom; the analytics listener is on `document` and ignores defaultPrevented. */
const stop = (e: React.MouseEvent) => e.preventDefault();

describe("AnalyticsProvider — shell", () => {
  it("renders nothing — no markup to hydrate or mismatch", () => {
    const { container } = render(<AnalyticsProvider />);
    expect(container).toBeEmptyDOMElement();
  });

  it("reports the initial page and each client-side navigation exactly once", () => {
    nav.pathname = "/docs";
    const { rerender } = render(<AnalyticsProvider />);
    expect(pageview.mock.calls).toEqual([["/docs"]]);

    nav.pathname = "/components";
    rerender(<AnalyticsProvider />);
    expect(pageview.mock.calls).toEqual([["/docs"], ["/components"]]);

    rerender(<AnalyticsProvider />); // a re-render on the same route is not a navigation
    expect(pageview).toHaveBeenCalledTimes(2);
  });

  it("reports nothing when there is no pathname", () => {
    nav.pathname = null;
    render(<AnalyticsProvider />);
    expect(pageview).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
  });

  it("sends nothing in tests, even with a client attached: the test run is not a production build", () => {
    resetAnalyticsForTests();
    track.mockImplementation(real.track);
    pageview.mockImplementation(real.pageview);
    try {
      const client = { capture: vi.fn(), pageview: vi.fn() };
      attachAnalytics(client);
      nav.pathname = "/docs/installation";
      render(<AnalyticsProvider />);
      expect(client.pageview).not.toHaveBeenCalled();
      expect(client.capture).not.toHaveBeenCalled();
    } finally {
      track.mockImplementation(() => {});
      pageview.mockImplementation(() => {});
    }
  });
});

describe("AnalyticsProvider — semantic view events (one per navigation)", () => {
  it("fires installation_viewed once, and not again on a re-render", () => {
    nav.pathname = "/docs/installation";
    const { rerender } = render(<AnalyticsProvider />);
    rerender(<AnalyticsProvider />);
    rerender(<AnalyticsProvider />);
    expect(track.mock.calls).toEqual([["installation_viewed", { source: "installation_page" }]]);
  });

  it("classifies each route as the user navigates, one event each, and none for the homepage or the gallery", () => {
    const { rerender } = render(<AnalyticsProvider />); // "/"
    expect(track).not.toHaveBeenCalled();

    nav.pathname = "/docs/tokens";
    rerender(<AnalyticsProvider />);
    nav.pathname = "/docs/components/button";
    rerender(<AnalyticsProvider />);
    nav.pathname = "/docs/changelog";
    rerender(<AnalyticsProvider />);
    nav.pathname = "/components";
    rerender(<AnalyticsProvider />);

    expect(track.mock.calls).toEqual([
      ["docs_viewed", { page: "/docs/tokens", source: "docs_page" }],
      ["component_viewed", { component: "button", source: "component_page" }],
      ["changelog_viewed", { source: "changelog_page" }],
    ]);
    expectSanitary();
  });

  it("does not count a docs-shaped URL that isn't a real page", () => {
    nav.pathname = "/docs/components/definitely-not-a-component";
    render(<AnalyticsProvider />);
    expect(track).not.toHaveBeenCalled();
  });
});

describe("AnalyticsProvider — CTAs", () => {
  it("fires cta_clicked once with the declared source and target, and nothing else", async () => {
    render(
      <>
        <AnalyticsProvider />
        <a href="/docs" onClick={stop} {...ctaAttrs("homepage_hero", "get_started")}>
          Get started
        </a>
      </>,
    );
    await userEvent.click(document.querySelector("a")!);
    expect(track.mock.calls).toEqual([["cta_clicked", { source: "homepage_hero", target: "get_started" }]]);
    expectSanitary();
  });

  it("reports the declared target, not the visible label and not the destination", async () => {
    render(
      <>
        <AnalyticsProvider />
        <a href="/components?filter=secret" onClick={stop} {...ctaAttrs("homepage_hero", "browse_components")}>
          A completely different label
        </a>
      </>,
    );
    await userEvent.click(document.querySelector("a")!);
    const payload = JSON.stringify(track.mock.calls);
    expect(payload).not.toContain("different label");
    expect(payload).not.toContain("secret");
    expect(payload).not.toContain("/components");
  });

  it("fires nothing for an ordinary internal link", async () => {
    render(
      <>
        <AnalyticsProvider />
        <a href="/docs/tokens" onClick={stop}>
          Tokens
        </a>
        <a href="/components" onClick={stop}>
          Components
        </a>
      </>,
    );
    for (const a of document.querySelectorAll("a")) await userEvent.click(a);
    expect(track).not.toHaveBeenCalled();
  });

  it("ignores an unknown target or source in the markup rather than sending it", async () => {
    render(
      <>
        <AnalyticsProvider />
        <a href="/docs" onClick={stop} data-analytics-cta="Get started!" data-analytics-source="homepage_hero">
          x
        </a>
        <a href="/docs" onClick={stop} data-analytics-cta="get_started" data-analytics-source="somewhere else">
          y
        </a>
      </>,
    );
    for (const a of document.querySelectorAll("a")) await userEvent.click(a);
    expect(track).not.toHaveBeenCalled();
  });

  it("finds the link when the click lands on an element inside it", async () => {
    render(
      <>
        <AnalyticsProvider />
        <a href="/docs" onClick={stop} {...ctaAttrs("homepage", "read_docs")}>
          <span data-testid="inner">Read the docs</span>
        </a>
      </>,
    );
    await userEvent.click(document.querySelector('[data-testid="inner"]')!);
    expect(track.mock.calls).toEqual([["cta_clicked", { source: "homepage", target: "read_docs" }]]);
  });
});

describe("AnalyticsProvider — outbound links", () => {
  const repo = siteConfig.repo;

  it("reports a GitHub click in the header as github_clicked (and only that)", async () => {
    render(
      <>
        <AnalyticsProvider />
        <header>
          <a href={repo} onClick={stop}>
            GitHub
          </a>
        </header>
      </>,
    );
    await userEvent.click(document.querySelector("a")!);
    expect(track.mock.calls).toEqual([["github_clicked", { source: "header", location: "primary_nav" }]]);
  });

  it("reports the footer's source link with the footer as its position", async () => {
    render(
      <>
        <AnalyticsProvider />
        <footer>
          <a href={repo} onClick={stop}>
            Source
          </a>
        </footer>
      </>,
    );
    await userEvent.click(document.querySelector("a")!);
    expect(track.mock.calls).toEqual([["github_clicked", { source: "footer", location: "footer" }]]);
  });

  it("reports a GitHub link inside docs content, and never sends the URL, its path or its query", async () => {
    nav.pathname = "/docs/cli";
    window.history.pushState({}, "", "/docs/cli");
    render(
      <>
        <AnalyticsProvider />
        <a href={`${repo}/blob/main/scripts/check-contrast.mjs?plain=1#L10`} onClick={stop}>
          the script
        </a>
      </>,
    );
    track.mockClear(); // drop the docs_viewed for the page itself
    await userEvent.click(document.querySelector("a")!);
    expect(track.mock.calls).toEqual([["github_clicked", { source: "docs_page", location: "content" }]]);
    const payload = JSON.stringify(track.mock.calls);
    for (const leak of ["check-contrast", "plain=1", "#L10", "github.com", "blob"]) expect(payload).not.toContain(leak);
    expectSanitary();
  });

  it("does not also fire external_link_clicked or cta_clicked for the same GitHub click", async () => {
    render(
      <>
        <AnalyticsProvider />
        <header>
          <a href={repo} onClick={stop}>
            GitHub
          </a>
        </header>
      </>,
    );
    await userEvent.click(document.querySelector("a")!);
    expect(track).toHaveBeenCalledTimes(1);
    expect(track.mock.calls.map((c) => c[0])).toEqual(["github_clicked"]);
  });

  it("reports an npm package link as npm_clicked with the known package, and no URL", async () => {
    nav.pathname = "/docs/installation";
    window.history.pushState({}, "", "/docs/installation");
    render(
      <>
        <AnalyticsProvider />
        <a href={`https://www.npmjs.com/package/${PACKAGES.ui}?activeTab=versions`} onClick={stop}>
          on npm
        </a>
      </>,
    );
    track.mockClear();
    await userEvent.click(document.querySelector("a")!);
    expect(track.mock.calls).toEqual([["npm_clicked", { source: "installation_page", package: PACKAGES.ui }]]);
    expect(JSON.stringify(track.mock.calls)).not.toContain("npmjs");
    expect(JSON.stringify(track.mock.calls)).not.toContain("activeTab");
  });

  it("reports the design source as external_link_clicked with the hostname only", async () => {
    render(
      <>
        <AnalyticsProvider />
        <footer>
          <a href={siteConfig.figma} onClick={stop}>
            Design source
          </a>
        </footer>
      </>,
    );
    await userEvent.click(document.querySelector("a")!);
    expect(track.mock.calls).toEqual([["external_link_clicked", { target: "figma.com", source: "footer", location: "footer" }]]);
    expect(JSON.stringify(track.mock.calls)).not.toContain("node-id");
  });

  it("ignores attribution links and clicks that aren't on a link", async () => {
    render(
      <>
        <AnalyticsProvider />
        <a href="https://www.radix-ui.com/primitives" onClick={stop}>
          Radix
        </a>
        <button>Filter: data-display</button>
        <input aria-label="Search components" />
      </>,
    );
    await userEvent.click(document.querySelector("a")!);
    await userEvent.click(document.querySelector("button")!);
    await userEvent.type(document.querySelector("input")!, "my private search");
    expect(track).not.toHaveBeenCalled();
  });

  it("counts a middle-click (open in new tab) once, and ignores a right-click", async () => {
    render(
      <>
        <AnalyticsProvider />
        <footer>
          <a href={repo} onClick={stop}>
            Source
          </a>
        </footer>
      </>,
    );
    const a = document.querySelector("a")!;
    a.dispatchEvent(new MouseEvent("auxclick", { bubbles: true, button: 1 }));
    a.dispatchEvent(new MouseEvent("auxclick", { bubbles: true, button: 2 }));
    expect(track.mock.calls).toEqual([["github_clicked", { source: "footer", location: "footer" }]]);
  });

  it("stops listening when it unmounts", async () => {
    const { unmount } = render(
      <>
        <AnalyticsProvider />
        <footer>
          <a href={repo} onClick={stop}>
            Source
          </a>
        </footer>
      </>,
    );
    unmount();
    document.body.innerHTML = `<footer><a href="${repo}">Source</a></footer>`;
    await userEvent.click(document.querySelector("a")!);
    expect(track).not.toHaveBeenCalled();
  });
});
