import type { CaptureResult } from "posthog-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const posthog = vi.hoisted(() => ({
  __loaded: false,
  init: vi.fn(),
  capture: vi.fn(),
}));
vi.mock("posthog-js", () => ({ default: posthog }));

import { createPostHogClient, posthogOptions, sanitizeCapture, stripQueryAndHash } from "./analytics-posthog";

const HOST = "https://us.i.posthog.com";
const capture = (properties: Record<string, unknown>, extra: Partial<CaptureResult> = {}) =>
  ({ uuid: "u", event: "$pageview", properties, ...extra }) as CaptureResult;

beforeEach(() => {
  posthog.__loaded = false;
  posthog.init.mockReset().mockImplementation(() => {
    posthog.__loaded = true;
  });
  posthog.capture.mockReset();
});

describe("PostHog options: the conservative configuration", () => {
  const o = posthogOptions(HOST);

  it("points at the configured host", () => {
    expect(o.api_host).toBe(HOST);
  });

  it("uses manual pageviews only, so PostHog can't double-count ours", () => {
    expect(o.capture_pageview).toBe(false);
    expect(o.capture_pageleave).toBe(false);
  });

  it("turns off autocapture and its relatives", () => {
    expect(o).toMatchObject({ autocapture: false, capture_dead_clicks: false, capture_heatmaps: false, rageclick: false });
  });

  it("turns off session replay and every remote-configured feature", () => {
    expect(o).toMatchObject({
      disable_session_recording: true,
      disable_surveys: true,
      disable_conversations: true,
      disable_web_experiments: true,
      capture_exceptions: false,
      capture_performance: false,
      advanced_disable_flags: true,
      disable_external_dependency_loading: true,
    });
  });

  it("keeps anonymous visitors anonymous, stores no cookie, honours Do Not Track, and saves no campaign params", () => {
    expect(o).toMatchObject({ person_profiles: "identified_only", persistence: "localStorage", respect_dnt: true, save_campaign_params: false });
  });
});

describe("stripQueryAndHash", () => {
  it("removes the query string and hash", () => {
    expect(stripQueryAndHash("https://kinetixui.com/components?filter=data&q=secret#x")).toBe("https://kinetixui.com/components");
  });

  it("leaves non-URLs and non-strings alone", () => {
    expect(stripQueryAndHash("$direct")).toBe("$direct");
    expect(stripQueryAndHash(undefined)).toBeUndefined();
    expect(stripQueryAndHash(3)).toBe(3);
  });
});

describe("sanitizeCapture (before_send)", () => {
  it("strips query and hash from every URL PostHog adds, in properties, $set and $set_once", () => {
    const out = sanitizeCapture(
      capture(
        {
          $current_url: "https://kinetixui.com/docs/changelog?q=private#0.22.0",
          $referrer: "https://www.google.com/search?q=design+system",
          $pathname: "/docs/changelog",
          keep: "me",
        },
        {
          $set: { $current_url: "https://kinetixui.com/x?a=1" },
          $set_once: { $initial_current_url: "https://kinetixui.com/?utm_source=x", $initial_referrer: "$direct" },
        },
      ),
    )!;
    expect(out.properties).toMatchObject({
      $current_url: "https://kinetixui.com/docs/changelog",
      $referrer: "https://www.google.com/search",
      $pathname: "/docs/changelog",
      keep: "me",
    });
    expect(out.$set).toEqual({ $current_url: "https://kinetixui.com/x" });
    expect(out.$set_once).toEqual({ $initial_current_url: "https://kinetixui.com/", $initial_referrer: "$direct" });
  });

  it("drops campaign parameters, including the session-entry copies the SDK makes, and keeps unrelated properties", () => {
    const out = sanitizeCapture(
      capture(
        {
          $session_entry_url: "https://kinetixui.com/?utm_source=x",
          $session_entry_utm_source: "newsletter",
          $session_entry_gclid: "abc123",
          utm_medium: "email",
          $session_entry_pathname: "/",
          $lib: "web",
        },
        { $set_once: { $initial_fbclid: "zzz", $initial_utm_campaign: "launch", $initial_pathname: "/" } },
      ),
    )!;
    expect(out.properties).toEqual({ $session_entry_url: "https://kinetixui.com/", $session_entry_pathname: "/", $lib: "web" });
    expect(out.$set_once).toEqual({ $initial_pathname: "/" });
  });

  it("passes null through (an event another hook already dropped)", () => {
    expect(sanitizeCapture(null)).toBeNull();
  });
});

describe("createPostHogClient", () => {
  it("initialises PostHog with the key and the conservative options — and only once", async () => {
    await createPostHogClient({ key: "phc_abc", host: HOST });
    await createPostHogClient({ key: "phc_abc", host: HOST });
    expect(posthog.init).toHaveBeenCalledOnce();
    expect(posthog.init).toHaveBeenCalledWith("phc_abc", expect.objectContaining({ api_host: HOST, autocapture: false, capture_pageview: false }));
  });

  it("captures events with the properties it is given", async () => {
    const client = await createPostHogClient({ key: "phc_abc", host: HOST });
    client.capture("github_clicked", { source: "footer" });
    expect(posthog.capture).toHaveBeenCalledExactlyOnceWith("github_clicked", { source: "footer" });
  });

  it("reports a pageview with a URL rebuilt from origin + path, never location.href", async () => {
    const client = await createPostHogClient({ key: "phc_abc", host: HOST });
    client.pageview("/docs/installation");
    expect(posthog.capture).toHaveBeenCalledExactlyOnceWith("$pageview", {
      $current_url: `${window.location.origin}/docs/installation`,
    });
  });
});
