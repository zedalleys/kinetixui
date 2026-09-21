// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { analytics, attachAnalytics, resetAnalyticsForTests, startAnalytics } from "./analytics";

// No `window` here — this is what server rendering looks like.
beforeEach(() => resetAnalyticsForTests());

describe("analytics on the server", () => {
  it("has no window", () => {
    expect(typeof window).toBe("undefined");
  });

  it("never starts, and never loads the vendor SDK", async () => {
    const loader = vi.fn();
    // default env argument: no window → analytics off, without touching `window.location`
    await startAnalytics(loader);
    expect(loader).not.toHaveBeenCalled();
  });

  it("does not throw when called during server rendering", () => {
    expect(() => {
      analytics.pageview("/docs");
      analytics.track("github_clicked", { source: "footer" });
    }).not.toThrow();
  });

  it("does not accumulate anything in module state — the module is shared across requests on the server", () => {
    for (let i = 0; i < 100; i++) analytics.pageview("/docs");
    const client = { capture: vi.fn(), pageview: vi.fn() };
    attachAnalytics(client);
    // had the server calls queued up, they would flush to whatever client attaches next
    expect(client.pageview).not.toHaveBeenCalled();
  });
});
