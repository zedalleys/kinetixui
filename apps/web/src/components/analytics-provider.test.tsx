import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ pathname: "/" as string | null }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

import { AnalyticsProvider } from "./analytics-provider";
import { analytics, attachAnalytics, resetAnalyticsForTests } from "@/lib/analytics";

beforeEach(() => {
  resetAnalyticsForTests();
  nav.pathname = "/";
  vi.restoreAllMocks();
});

describe("AnalyticsProvider", () => {
  it("renders nothing — no markup to hydrate or mismatch", () => {
    const { container } = render(<AnalyticsProvider />);
    expect(container).toBeEmptyDOMElement();
  });

  it("reports the initial page and each client-side navigation exactly once", () => {
    const pageview = vi.spyOn(analytics, "pageview");
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
    const pageview = vi.spyOn(analytics, "pageview");
    nav.pathname = null;
    render(<AnalyticsProvider />);
    expect(pageview).not.toHaveBeenCalled();
  });

  it("sends nothing in tests, even with a client attached: the test run is not a production build", () => {
    const client = { capture: vi.fn(), pageview: vi.fn() };
    attachAnalytics(client);
    nav.pathname = "/docs";
    render(<AnalyticsProvider />);
    expect(client.pageview).not.toHaveBeenCalled();
    expect(client.capture).not.toHaveBeenCalled();
  });
});
