import { afterEach, describe, expect, it, vi } from "vitest";
import { isDiagnosticTab, resetAttributionForTests } from "./analytics-attribution";
import { shouldLoadVercelAnalytics, speedInsightsBeforeSend, vercelBeforeSend } from "./analytics-vercel";

const ok = { dnt: false, diagnostic: false };

describe("shouldLoadVercelAnalytics: the same gate as PostHog", () => {
  it("loads only in a production build on the real site", () => {
    expect(shouldLoadVercelAnalytics({ nodeEnv: "production", hostname: "kinetixui.com" })).toBe(true);
  });

  it.each([
    ["development build", { nodeEnv: "development", hostname: "kinetixui.com" }],
    ["test runner", { nodeEnv: "test", hostname: "kinetixui.com" }],
    ["server render (no hostname)", { nodeEnv: "production" }],
    ["Vercel preview deployment", { nodeEnv: "production", hostname: "kinetixui-git-branch-zedalleys.vercel.app" }],
    ["localhost production build", { nodeEnv: "production", hostname: "localhost" }],
  ])("never loads on a %s", (_name, env) => {
    expect(shouldLoadVercelAnalytics(env)).toBe(false);
  });

  it("the any-host switch lifts only the hostname check", () => {
    expect(shouldLoadVercelAnalytics({ nodeEnv: "production", hostname: "localhost", anyHost: true })).toBe(true);
    expect(shouldLoadVercelAnalytics({ nodeEnv: "development", hostname: "localhost", anyHost: true })).toBe(false);
  });
});

describe("vercelBeforeSend", () => {
  it("cuts the URL to origin + path", () => {
    expect(vercelBeforeSend({ type: "pageview", url: "https://kinetixui.com/components?filter=data&utm_source=x#top" }, ok)).toEqual({
      type: "pageview",
      url: "https://kinetixui.com/components",
    });
  });

  it("never sends a custom event", () => {
    expect(vercelBeforeSend({ type: "event", url: "https://kinetixui.com/" }, ok)).toBeNull();
  });

  it("drops everything under Do Not Track", () => {
    expect(vercelBeforeSend({ type: "pageview", url: "https://kinetixui.com/" }, { dnt: true, diagnostic: false })).toBeNull();
  });

  it("drops an internal browser, for the same reason", () => {
    expect(vercelBeforeSend({ type: "pageview", url: "https://kinetixui.com/" }, { dnt: false, diagnostic: false, internal: true })).toBeNull();
    expect(speedInsightsBeforeSend({ type: "vital" as const, url: "https://kinetixui.com/" }, { dnt: false, diagnostic: false, internal: true })).toBeNull();
  });

  it("drops a diagnostic tab, which Vercel could not filter out later", () => {
    expect(vercelBeforeSend({ type: "pageview", url: "https://kinetixui.com/" }, { dnt: false, diagnostic: true })).toBeNull();
  });

  it("drops a URL it cannot read or a path that is not identifier-shaped", () => {
    expect(vercelBeforeSend({ type: "pageview", url: "not a url" }, ok)).toBeNull();
    expect(vercelBeforeSend({ type: "pageview", url: "https://kinetixui.com/a%20b" }, ok)).toBeNull();
  });
});

describe("speedInsightsBeforeSend", () => {
  const vital = { type: "vital" as const, url: "https://kinetixui.com/docs/tokens?utm_source=x#a", route: "/docs/tokens" };

  it("sends a Web Vitals measurement with the URL cut to origin + path", () => {
    expect(speedInsightsBeforeSend(vital, ok)).toEqual({ ...vital, url: "https://kinetixui.com/docs/tokens" });
  });

  it("sends nothing but measurements", () => {
    expect(speedInsightsBeforeSend({ type: "pageview", url: "https://kinetixui.com/" }, ok)).toBeNull();
  });

  it("drops measurements under Do Not Track and from a diagnostic tab", () => {
    expect(speedInsightsBeforeSend(vital, { dnt: true, diagnostic: false })).toBeNull();
    expect(speedInsightsBeforeSend(vital, { dnt: false, diagnostic: true })).toBeNull();
  });
});

describe("isDiagnosticTab: the tab's mark holds across navigation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
    resetAttributionForTests();
  });

  it("stores the mark from the URL, so later pages without the query are still marked", () => {
    expect(isDiagnosticTab("?kx_traffic=diagnostic")).toBe(true);
    expect(isDiagnosticTab("")).toBe(true);
    expect(isDiagnosticTab("?kx_traffic=clear")).toBe(false);
    expect(isDiagnosticTab("")).toBe(false);
  });

  it("keeps the mark in memory when sessionStorage is blocked", () => {
    vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(isDiagnosticTab("?kx_traffic=diagnostic")).toBe(true);
    expect(isDiagnosticTab("")).toBe(true);
    expect(isDiagnosticTab("?kx_traffic=clear")).toBe(false);
    expect(isDiagnosticTab("")).toBe(false);
  });

  it("an unmarked tab stays unmarked", () => {
    expect(isDiagnosticTab("")).toBe(false);
    expect(isDiagnosticTab("?kx_traffic=other")).toBe(false);
  });
});
