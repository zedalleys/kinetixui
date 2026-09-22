import posthog, { type CaptureResult } from "posthog-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { posthogOptions } from "./analytics-posthog";

/**
 * The unit tests check our options and sanitiser in isolation. This one runs the REAL SDK with our exact options,
 * landing on a URL full of things that must never leave the browser, and inspects every event it would send —
 * catching a property the SDK adds that we didn't think of. Sending is blocked: the last `before_send` returns null.
 */
const SECRET = "very-secret-search";
const seen: CaptureResult[] = [];

beforeAll(() => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("no network in tests"))));
  window.history.replaceState({}, "", `/components?filter=data&q=${SECRET}&utm_source=newsletter&gclid=abc123#frag`);

  posthog.init("phc_integrationtest0000", {
    ...posthogOptions("https://posthog.invalid"),
    // the PRODUCTION chain, then a recorder that swallows the event so nothing is sent
    before_send: [
      ...([posthogOptions("https://posthog.invalid").before_send].flat() as never[]),
      // annotated because the `as never[]` spread above erases the array's contextual type, so the recorder's
      // parameter would otherwise be an implicit any. This is `BeforeSendFn`'s own parameter type.
      (result: CaptureResult | null) => {
        if (result) seen.push(JSON.parse(JSON.stringify(result)) as CaptureResult);
        return null;
      },
    ],
  });
});

afterAll(() => vi.unstubAllGlobals());

const wire = () => JSON.stringify(seen);

describe("a real PostHog instance configured by posthogOptions()", () => {
  it("sends no query string, hash, search text or campaign parameter in anything it emits", () => {
    posthog.capture("$pageview", { $current_url: `${window.location.origin}/components` });
    posthog.capture("github_clicked", { source: "footer" });

    expect(seen.map((e) => e.event)).toEqual(["$pageview", "github_clicked"]);
    for (const leak of [SECRET, "filter=data", "utm_source", "newsletter", "gclid", "abc123", "#frag", "?"]) {
      expect(wire(), `leaked "${leak}"`).not.toContain(leak);
    }
  });

  it("carries only the path in the URL properties it derives itself", () => {
    const urls = seen.flatMap((e) => Object.entries(e.properties).filter(([k]) => /^\$.*url$/.test(k)).map(([, v]) => String(v)));
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(url).toBe(`${window.location.origin}/components`);
  });

  it("does not autocapture a click", () => {
    const before = seen.length;
    const button = document.createElement("button");
    button.textContent = "Some visible label";
    document.body.append(button);
    button.click();
    expect(seen.length).toBe(before);
    expect(wire()).not.toContain("Some visible label");
    expect(wire()).not.toContain("$autocapture");
  });

  it("emits no session-recording, exception or web-vitals events", () => {
    const names = seen.map((e) => e.event);
    for (const banned of ["$snapshot", "$exception", "$web_vitals", "$pageleave", "$dead_click", "$rageclick"]) {
      expect(names).not.toContain(banned);
    }
  });
});
