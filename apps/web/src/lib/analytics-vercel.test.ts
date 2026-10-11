import { afterEach, describe, expect, it } from "vitest";
import { isDiagnosticTab } from "./analytics-attribution";
import { shouldLoadVercelAnalytics, vercelBeforeSend } from "./analytics-vercel";

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

  it("drops a diagnostic tab, which Vercel could not filter out later", () => {
    expect(vercelBeforeSend({ type: "pageview", url: "https://kinetixui.com/" }, { dnt: false, diagnostic: true })).toBeNull();
  });

  it("drops a URL it cannot read or a path that is not identifier-shaped", () => {
    expect(vercelBeforeSend({ type: "pageview", url: "not a url" }, ok)).toBeNull();
    expect(vercelBeforeSend({ type: "pageview", url: "https://kinetixui.com/a%20b" }, ok)).toBeNull();
  });
});

describe("isDiagnosticTab reads the mark without writing it", () => {
  afterEach(() => window.sessionStorage.clear());

  it("follows the URL, then the stored mark, and never stores anything itself", () => {
    expect(isDiagnosticTab("?kx_traffic=diagnostic")).toBe(true);
    expect(window.sessionStorage.length).toBe(0);
    expect(isDiagnosticTab("")).toBe(false);

    window.sessionStorage.setItem("kx_analytics_traffic_v1", "diagnostic");
    expect(isDiagnosticTab("")).toBe(true);
    expect(isDiagnosticTab("?kx_traffic=clear")).toBe(false);
    expect(window.sessionStorage.getItem("kx_analytics_traffic_v1")).toBe("diagnostic");
  });
});
