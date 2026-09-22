import posthog, { type CaptureResult } from "posthog-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { analytics, attachAnalytics, resetAnalyticsForTests, startAnalytics } from "./analytics";
import { getAttributionContext, initAttribution, resetAttributionForTests } from "./analytics-attribution";
import { createPostHogClient, posthogOptions, sanitizeCapture } from "./analytics-posthog";

/**
 * The REAL SDK, configured exactly as production, on a URL full of things that must never leave the browser, with
 * events created through the REAL adapter. Sending is blocked: the last `before_send` records the event and returns
 * null. This is the test that proves enrichment happens at the analytics boundary — no component below knows
 * anything about acquisition.
 */
const HOST = "https://posthog.invalid";
/** Exactly the `before_send` steps `posthogOptions` ships, so this test cannot drift from production. */
const productionChain = () => [posthogOptions(HOST).before_send].flat() as never[];
const seen: CaptureResult[] = [];
const wire = () => JSON.stringify(seen);
const byEvent = (name: string) => seen.filter((e) => e.event === name);
const referrer = (value: string) => Object.defineProperty(document, "referrer", { value, configurable: true });

const LANDING = "/?utm_source=linkedin&utm_medium=social&utm_campaign=kx_launch_2026&utm_content=hero_a&gclid=DO_NOT_SEND&fbclid=ALSO_NO&utm_term=secret-term&q=private-search";
const config = { key: "phc_integrationtest0000", host: HOST };

beforeAll(() => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("no network in tests"))));
  posthog.init(config.key, {
    ...posthogOptions(HOST),
    // the PRODUCTION chain (attach attribution, then sanitise), followed by a recorder that swallows the event
    before_send: [
      ...productionChain(),
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

beforeEach(() => {
  seen.length = 0;
  resetAnalyticsForTests();
  resetAttributionForTests();
  window.sessionStorage.clear();
  window.localStorage.clear();
});

/** Land on `url` from `from`, start attribution as production does, and attach the real adapter's client. */
async function visit(url: string, from = "") {
  window.history.replaceState({}, "", url);
  referrer(from);
  initAttribution(undefined, false);
  attachAnalytics(await createPostHogClient(config));
}

describe("attribution at the analytics/adapter boundary (real SDK)", () => {
  it("$pageview carries the safe attribution context and a clean $current_url", async () => {
    await visit(LANDING, "https://www.google.com/search?q=kinetixui&email=a@b.co");
    analytics.pageview("/");
    const [pv] = byEvent("$pageview");
    expect(pv!.properties).toMatchObject({
      $current_url: `${window.location.origin}/`,
      kx_source: "linkedin",
      kx_medium: "social",
      kx_campaign: "kx_launch_2026",
      kx_content: "hero_a",
      kx_referrer: "google",
      kx_landing_page: "/",
      kx_first_source: "linkedin",
      kx_first_medium: "social",
      kx_first_campaign: "kx_launch_2026",
      kx_first_content: "hero_a",
      kx_first_referrer: "google",
      kx_first_landing_page: "/",
    });
  });

  it("each product event keeps its own properties and gains the attribution, without the caller knowing", async () => {
    await visit(LANDING);
    analytics.track("cta_clicked", { source: "homepage_hero", target: "get_started" });
    analytics.track("cli_command_copied", { source: "homepage_hero", package: "@kinetixui/cli" });
    analytics.track("component_code_copied", { component: "button", platform: "react", source: "component_page" });

    const attribution = { kx_source: "linkedin", kx_medium: "social", kx_campaign: "kx_launch_2026", kx_content: "hero_a", kx_first_source: "linkedin", kx_first_medium: "social" };
    expect(byEvent("cta_clicked")[0]!.properties).toMatchObject({ source: "homepage_hero", target: "get_started", ...attribution });
    expect(byEvent("cli_command_copied")[0]!.properties).toMatchObject({ source: "homepage_hero", package: "@kinetixui/cli", ...attribution });
    expect(byEvent("component_code_copied")[0]!.properties).toMatchObject({ component: "button", platform: "react", source: "component_page", ...attribution });
  });

  it("nothing raw is in anything the SDK would send: no utm_*, click id, query, referrer or search text", async () => {
    await visit(LANDING, "https://www.google.com/search?q=kinetixui&email=a@b.co");
    analytics.pageview("/");
    analytics.track("cta_clicked", { source: "homepage_hero", target: "get_started" });
    analytics.track("component_code_copied", { component: "button", platform: "react", source: "component_page" });

    expect(seen.length).toBeGreaterThanOrEqual(3);
    for (const leak of ["DO_NOT_SEND", "ALSO_NO", "gclid", "fbclid", "secret-term", "private-search", "utm_", "a@b.co", "google.com", "search?q", "?", "#"]) {
      expect(wire(), `leaked "${leak}"`).not.toContain(leak);
    }
    for (const e of seen) {
      for (const key of Object.keys(e.properties)) {
        expect(key, `property ${key}`).not.toMatch(/(^|_)utm|gclid|fbclid|^\$.*referrer|referring_domain/i);
      }
      expect(e.properties).not.toHaveProperty("$referrer");
      expect(e.properties).not.toHaveProperty("$referring_domain");
    }
  });

  it("an unknown referrer and a junk UTM become 'other' — the raw values never appear", async () => {
    await visit("/?utm_source=hello%40example.com&utm_campaign=launch%20John%20Smith&utm_content=user%40example.com", "https://example-secret-domain.com/private?q=email@example.com");
    analytics.pageview("/");
    expect(byEvent("$pageview")[0]!.properties).toMatchObject({ kx_source: "other", kx_referrer: "other" });
    expect(byEvent("$pageview")[0]!.properties).not.toHaveProperty("kx_campaign");
    expect(byEvent("$pageview")[0]!.properties).not.toHaveProperty("kx_content");
    const hits = [...wire().matchAll(/.{0,70}(hello|example|secret|John|Smith|private|email).{0,30}/g)].map((m) => m[0]);
    expect(hits).toEqual([]);
  });

  it("UI code cannot inject attribution: kx_* passed to track is dropped by the allowlist", async () => {
    await visit("/");
    // @ts-expect-error — not part of the event contract
    analytics.track("cta_clicked", { source: "header", target: "get_started", kx_source: "evil", kx_campaign: "kx_forged" });
    const props = byEvent("cta_clicked")[0]!.properties;
    expect(props.kx_source).toBe("direct");
    expect(props).not.toHaveProperty("kx_campaign");
    expect(wire()).not.toMatch(/evil|kx_forged/);
  });

  it("a forged kx_* value that reaches before_send anyway is removed there", () => {
    const out = sanitizeCapture({
      uuid: "u",
      event: "x",
      properties: { kx_source: "hello@example.com", kx_medium: "social", kx_campaign: "not ours", kx_extra: "1" },
    } as CaptureResult)!;
    expect(out.properties).toEqual({ kx_medium: "social" });
  });

  describe("$pageleave (session duration and bounce rate)", () => {
    const leave = () => window.dispatchEvent(new Event("pagehide"));

    it("is captured when the page is hidden, once, with the attribution and a clean URL", async () => {
      await visit(LANDING, "https://www.google.com/search?q=kinetixui&email=a@b.co");
      analytics.pageview("/");
      seen.length = 0;
      leave();

      expect(byEvent("$pageleave")).toHaveLength(1);
      expect(byEvent("$pageleave")[0]!.properties).toMatchObject({
        $current_url: `${window.location.origin}/`,
        kx_source: "linkedin",
        kx_medium: "social",
        kx_campaign: "kx_launch_2026",
        kx_content: "hero_a",
        kx_referrer: "google",
        kx_first_source: "linkedin",
      });
    });

    it("carries nothing raw: no query, click id, referrer or search text — and no property names that would hold them", async () => {
      await visit(LANDING, "https://www.google.com/search?q=kinetixui&email=a@b.co");
      analytics.pageview("/");
      seen.length = 0;
      leave();
      const props = byEvent("$pageleave")[0]!.properties;

      for (const leakedText of ["DO_NOT_SEND", "ALSO_NO", "gclid", "fbclid", "secret-term", "private-search", "utm_", "a@b.co", "google.com", "search?q", "?", "#"]) {
        expect(wire(), `leaked "${leakedText}"`).not.toContain(leakedText);
      }
      for (const key of Object.keys(props)) expect(key).not.toMatch(/(^|_)utm|gclid|fbclid|^\$.*referrer|referring_domain|ph_keyword|search_engine/i);
    });

    it("adds only measurements, an id and the previous page's clean path: every $prev_pageview_* value", async () => {
      await visit(LANDING);
      analytics.pageview("/");
      seen.length = 0;
      leave();
      const measured = Object.entries(byEvent("$pageleave")[0]!.properties).filter(([k]) => k.startsWith("$prev_pageview_"));
      expect(measured.length).toBeGreaterThan(0);
      for (const [key, value] of measured) {
        if (key === "$prev_pageview_id") expect(typeof value).toBe("string");
        else if (key === "$prev_pageview_pathname") expect(value, key).toBe("/"); // a pathname, never a URL with a query
        else expect(typeof value, key).toBe("number"); // duration and scroll / content depth
      }
    });

    it("measures the page you navigated away from on the next $pageview, with a clean URL", async () => {
      await visit(LANDING);
      analytics.pageview("/");
      window.history.pushState({}, "", "/docs/installation");
      analytics.pageview("/docs/installation");
      const second = byEvent("$pageview")[1]!.properties;
      expect(second.$current_url).toBe(`${window.location.origin}/docs/installation`);
      expect(typeof second.$prev_pageview_duration).toBe("number");
      expect(second).toMatchObject({ kx_source: "linkedin", kx_landing_page: "/" });
    });

    it("does not add a second copy of page views: exactly one $pageview per call", async () => {
      await visit(LANDING);
      analytics.pageview("/");
      analytics.pageview("/docs");
      expect(byEvent("$pageview")).toHaveLength(2);
    });

    it("still carries no attribution when there is none (dev-like state), and still sends nothing raw", async () => {
      window.history.replaceState({}, "", "/?utm_source=linkedin&gclid=NOPE");
      referrer("");
      resetAttributionForTests(); // attribution never initialised: analytics off for attribution
      attachAnalytics(await createPostHogClient(config));
      analytics.pageview("/");
      seen.length = 0;
      leave();
      const props = byEvent("$pageleave")[0]!.properties;
      expect(Object.keys(props).some((k) => k.startsWith("kx_"))).toBe(false);
      expect(wire()).not.toMatch(/NOPE|gclid|utm_/);
    });
  });

  it("internal client-side navigation keeps the session's attribution on later events", async () => {
    await visit(LANDING);
    analytics.pageview("/");
    window.history.pushState({}, "", "/docs/installation"); // an internal navigation: no query, no new referrer
    analytics.pageview("/docs/installation");
    analytics.track("installation_viewed", { source: "installation_page" });
    for (const e of seen) expect(e.properties).toMatchObject({ kx_source: "linkedin", kx_campaign: "kx_launch_2026", kx_landing_page: "/" });
    expect(byEvent("$pageview")[1]!.properties.$current_url).toBe(`${window.location.origin}/docs/installation`);
  });

  it("a later session has its own source while first touch stays the original", async () => {
    await visit(LANDING);
    analytics.track("cta_clicked", { source: "homepage_hero", target: "get_started" });

    // a new session: sessionStorage is fresh, localStorage (first touch) persists
    resetAnalyticsForTests();
    resetAttributionForTests();
    window.sessionStorage.clear();
    seen.length = 0;
    await visit("/docs?utm_source=reddit&utm_medium=community&utm_campaign=kx_other&gclid=NOPE");
    analytics.track("cta_clicked", { source: "docs_sidebar", target: "installation" });

    expect(byEvent("cta_clicked")[0]!.properties).toMatchObject({
      kx_source: "reddit",
      kx_medium: "community",
      kx_campaign: "kx_other",
      kx_landing_page: "/docs",
      kx_first_source: "linkedin",
      kx_first_medium: "social",
      kx_first_campaign: "kx_launch_2026",
      kx_first_landing_page: "/",
    });
    expect(wire()).not.toContain("NOPE");
  });

  it("with attribution unavailable (blocked storage) product events still send, just without kx_first_*", async () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new Error("blocked");
    });
    try {
      await visit(LANDING);
      analytics.track("cli_command_copied", { source: "homepage_hero", package: "@kinetixui/cli" });
      const props = byEvent("cli_command_copied")[0]!.properties;
      expect(props).toMatchObject({ source: "homepage_hero", package: "@kinetixui/cli", kx_source: "linkedin" });
      expect(Object.keys(props).some((k) => k.startsWith("kx_first_"))).toBe(false);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("startAnalytics is what establishes the context (the only caller in the app)", async () => {
    window.history.replaceState({}, "", "/?utm_source=devto&utm_medium=community&utm_campaign=kx_design_tokens_article");
    referrer("");
    resetAnalyticsForTests();
    await startAnalytics(async () => ({ createPostHogClient: async () => ({ capture: vi.fn(), pageview: vi.fn() }) }), {
      key: config.key,
      host: HOST,
      nodeEnv: "production",
      hostname: "kinetixui.com",
    });
    expect(getAttributionContext()).toMatchObject({ kx_source: "devto", kx_medium: "community", kx_campaign: "kx_design_tokens_article" });
  });
});
