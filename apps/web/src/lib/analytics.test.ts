import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  analytics,
  attachAnalytics,
  cleanPath,
  disableAnalytics,
  resetAnalyticsForTests,
  resolveAnalyticsConfig,
  sanitizeProps,
  startAnalytics,
  type AnalyticsClient,
  type AnalyticsEnv,
} from "./analytics";

const KEY = "phc_TestKey1234567890";
const HOST = "https://us.i.posthog.com";
/** A fully valid production environment; each test below breaks exactly one part of it. */
const good: AnalyticsEnv = { key: KEY, host: HOST, nodeEnv: "production", hostname: "kinetixui.com" };

const fakeClient = () => ({ capture: vi.fn(), pageview: vi.fn() }) satisfies AnalyticsClient;

beforeEach(() => resetAnalyticsForTests());

describe("resolveAnalyticsConfig — when analytics is on", () => {
  it("is on for a production build on the real hostname with valid config, normalising the host to its origin", () => {
    expect(resolveAnalyticsConfig(good)).toEqual({ key: KEY, host: HOST });
    expect(resolveAnalyticsConfig({ ...good, host: `${HOST}/some/path/` })?.host).toBe(HOST);
  });

  it.each<[string, Partial<AnalyticsEnv>]>([
    ["the key is missing", { key: undefined }],
    ["the key is blank", { key: "  " }],
    ["the key is a placeholder, not a phc_ project key", { key: "your-key-here" }],
    ["the host is missing", { host: undefined }],
    ["the host is not a URL", { host: "posthog" }],
    ["the host is not https", { host: "http://us.i.posthog.com" }],
    ["it is not a production build (dev)", { nodeEnv: "development" }],
    ["it is not a production build (tests)", { nodeEnv: "test" }],
    ["there is no browser hostname (the server)", { hostname: undefined }],
    ["it is localhost", { hostname: "localhost" }],
    ["it is a Vercel preview deployment", { hostname: "kinetixui-git-some-branch-zed-alleys.vercel.app" }],
  ])("is off when %s", (_why, override) => {
    expect(resolveAnalyticsConfig({ ...good, ...override })).toBeNull();
  });

  it("can skip only the hostname check, for verifying the pipeline locally — never the other conditions", () => {
    expect(resolveAnalyticsConfig({ ...good, hostname: "localhost", anyHost: true })?.key).toBe(KEY);
    expect(resolveAnalyticsConfig({ ...good, hostname: "localhost", anyHost: true, nodeEnv: "development" })).toBeNull();
    expect(resolveAnalyticsConfig({ ...good, hostname: "localhost", anyHost: true, key: undefined })).toBeNull();
  });

  it("is off in this test run, whatever the process env says", () => {
    // the test runner is NODE_ENV=test, so real env vars can never make a test send
    expect(process.env.NODE_ENV).toBe("test");
  });
});

describe("what may leave the browser", () => {
  it("keeps allowlisted identifier-shaped properties", () => {
    expect(sanitizeProps({ source: "header", component: "data-grid", package: "@kinetixui/cli", version: "0.22.0", target: "github.com" })).toEqual({
      source: "header",
      component: "data-grid",
      package: "@kinetixui/cli",
      version: "0.22.0",
      target: "github.com",
    });
  });

  it("drops anything that is not an allowlisted key", () => {
    const out = sanitizeProps({ source: "header", email: "a@b.co", clipboard: "npx add button", q: "search" } as never);
    expect(out).toEqual({ source: "header" });
  });

  it.each([
    ["an email address", "someone@example.com "],
    ["free text with spaces", "Get started now"],
    ["a query string", "/components?filter=data"],
    ["a hash", "/docs#section"],
    ["a full URL with a query", "https://a.com/?token=1"],
    ["a form-encoded value", "a=b&c=d"],
    ["a quote", "it's"],
    ["something over 100 characters", "a".repeat(101)],
    ["an empty string", ""],
  ])("drops a value that is %s", (_what, value) => {
    expect(sanitizeProps({ target: value })).toEqual({});
  });

  it("drops non-string values", () => {
    expect(sanitizeProps({ version: 22, target: null, page: { a: 1 } } as never)).toEqual({});
  });

  it("cleans a path to bare pathname and rejects non-paths", () => {
    expect(cleanPath("/components?filter=data&q=secret")).toBe("/components");
    expect(cleanPath("/docs/changelog?q=x#0.22.0")).toBe("/docs/changelog");
    expect(cleanPath("/")).toBe("/");
    expect(cleanPath("https://evil.example/x")).toBeNull();
    expect(cleanPath("docs")).toBeNull();
  });
});

describe("the dispatcher", () => {
  it("queues calls made before a client is ready, then flushes them in order", () => {
    analytics.pageview("/docs");
    analytics.track("cta_clicked", { source: "homepage_hero", target: "get_started" });
    const c = fakeClient();
    expect(c.pageview).not.toHaveBeenCalled();

    attachAnalytics(c);

    expect(c.pageview).toHaveBeenCalledExactlyOnceWith("/docs");
    expect(c.capture).toHaveBeenCalledExactlyOnceWith("cta_clicked", { source: "homepage_hero", target: "get_started" });
  });

  it("sends straight through once a client is ready, sanitised", () => {
    const c = fakeClient();
    attachAnalytics(c);
    analytics.track("component_viewed", { component: "button", platform: "swiftui" });
    analytics.pageview("/components?filter=secret");
    expect(c.capture).toHaveBeenCalledExactlyOnceWith("component_viewed", { component: "button", platform: "swiftui" });
    expect(c.pageview).toHaveBeenCalledExactlyOnceWith("/components"); // the query never got through
  });

  it("accepts an event whose properties are all optional with no argument", () => {
    const c = fakeClient();
    attachAnalytics(c);
    analytics.track("changelog_viewed");
    expect(c.capture).toHaveBeenCalledExactlyOnceWith("changelog_viewed", {});
  });

  it("drops the queue and ignores everything once disabled", () => {
    analytics.pageview("/docs");
    disableAnalytics();
    const c = fakeClient();
    attachAnalytics(c); // a late client must not resurrect what was queued before
    analytics.track("github_clicked", { source: "footer" });
    expect(c.pageview).not.toHaveBeenCalled();
  });

  it("never lets the pre-start queue grow without bound", () => {
    for (let i = 0; i < 500; i++) analytics.pageview("/docs");
    const c = fakeClient();
    attachAnalytics(c);
    expect(c.pageview.mock.calls.length).toBeLessThanOrEqual(50);
  });
});

describe("startAnalytics", () => {
  it("does not load the vendor SDK, and drops calls, when analytics is off", async () => {
    const loader = vi.fn();
    await startAnalytics(loader, { ...good, key: undefined });
    expect(loader).not.toHaveBeenCalled();

    const c = fakeClient();
    attachAnalytics(c);
    analytics.track("github_clicked", { source: "footer" });
    expect(c.capture).not.toHaveBeenCalled();
  });

  it("is off when the environment is unavailable (server)", async () => {
    const loader = vi.fn();
    await startAnalytics(loader, null);
    expect(loader).not.toHaveBeenCalled();
  });

  it("loads the adapter once, however many times it is called (StrictMode's double effect)", async () => {
    const c = fakeClient();
    const createPostHogClient = vi.fn(() => c);
    const loader = vi.fn(async () => ({ createPostHogClient }));

    analytics.pageview("/docs");
    await Promise.all([startAnalytics(loader, good), startAnalytics(loader, good)]);

    expect(loader).toHaveBeenCalledOnce();
    expect(createPostHogClient).toHaveBeenCalledExactlyOnceWith({ key: KEY, host: HOST });
    expect(c.pageview).toHaveBeenCalledExactlyOnceWith("/docs");
  });

  it("goes quietly off — no throw — when the SDK fails to load (ad blocker, network)", async () => {
    const loader = vi.fn(async () => {
      throw new Error("blocked");
    });
    await expect(startAnalytics(loader, good)).resolves.toBeUndefined();

    const c = fakeClient();
    attachAnalytics(c);
    analytics.track("npm_clicked", { source: "footer" });
    expect(c.capture).not.toHaveBeenCalled();
  });
});

describe("the event contract, at compile time", () => {
  // These run under `tsc --noEmit` (pnpm typecheck): an unused or wrong @ts-expect-error fails the build.
  it("accepts every declared event with its properties", () => {
    disableAnalytics();
    analytics.track("cta_clicked", { source: "header", target: "get_started" });
    analytics.track("docs_viewed", { page: "/docs/installation" });
    analytics.track("installation_viewed");
    analytics.track("cli_command_copied", { source: "homepage_hero", package: "@kinetixui/cli" });
    analytics.track("install_command_copied", { source: "installation_page", platform: "flutter" });
    analytics.track("component_viewed", { component: "button" });
    analytics.track("component_code_copied", { component: "button", platform: "compose" });
    analytics.track("platform_selected", { platform: "react", location: "code_tab" });
    analytics.track("github_clicked", { source: "footer" });
    analytics.track("npm_clicked", { source: "footer", package: "@kinetixui/ui" });
    analytics.track("changelog_viewed", { version: "0.22.0" });
    analytics.track("external_link_clicked", { target: "figma.com" });
  });

  it("rejects misuse", () => {
    disableAnalytics();
    // @ts-expect-error — not a declared event
    analytics.track("button_clicked", { source: "header" });
    // @ts-expect-error — a property this event doesn't declare
    analytics.track("cta_clicked", { source: "header", target: "x", email: "a@b.co" });
    // @ts-expect-error — required property missing
    analytics.track("cta_clicked", { source: "header" });
    // @ts-expect-error — `source` is a closed union, not free text
    analytics.track("cta_clicked", { source: "my own label", target: "x" });
    // @ts-expect-error — `platform` is a closed union
    analytics.track("component_code_copied", { component: "button", platform: "angular" });
    // @ts-expect-error — required props cannot be omitted entirely
    analytics.track("cta_clicked");
  });
});
