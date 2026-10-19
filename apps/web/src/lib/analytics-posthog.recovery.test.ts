import { readFileSync } from "node:fs";
import posthog, { type CaptureResult } from "posthog-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { analytics, attachAnalytics, resetAnalyticsForTests } from "./analytics";
import { initAttribution, resetAttributionForTests } from "./analytics-attribution";
import { createPostHogClient, posthogOptions } from "./analytics-posthog";
import { trackPageEngaged, trackRouteView } from "./analytics-surfaces";

/**
 * M3.1 — the attribution matrix for tagged campaign arrivals, through the path a production visit takes: the REAL SDK
 * with the production `before_send` chain, events created by the real adapter and surface helpers (`$pageview`,
 * `docs_viewed`, `page_engaged`), attribution started the way `startAnalytics` starts it. Sending is blocked: a
 * recorder after the production chain keeps each event and returns null.
 *
 * It exists because the LI-001 diagnostic visit of 2026-10-18 10:30 UTC arrived with `kx_source=other`. Every
 * scenario asserts the WHOLE source/medium/campaign/content/traffic tuple, so an arrival can never be "right" on four
 * fields and silently wrong on the fifth.
 */
const HOST = "https://posthog.invalid";
const productionChain = () => [posthogOptions(HOST).before_send].flat() as never[];
const seen: CaptureResult[] = [];
const byEvent = (name: string) => seen.filter((e) => e.event === name);
const referrer = (value: string) => Object.defineProperty(document, "referrer", { value, configurable: true });
const config = { key: "phc_recoverytest0000", host: HOST };

beforeAll(() => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("no network in tests"))));
  posthog.init(config.key, {
    ...posthogOptions(HOST),
    before_send: [
      ...productionChain(),
      (result: CaptureResult | null) => {
        if (result) seen.push(JSON.parse(JSON.stringify(result)) as CaptureResult);
        return null;
      },
    ],
  });
});
afterAll(() => vi.unstubAllGlobals());

/** A fresh visitor: no storage, no events. `nextTab` keeps localStorage (the browser) and clears the tab. */
function freshBrowser() {
  seen.length = 0;
  resetAnalyticsForTests();
  resetAttributionForTests();
  window.sessionStorage.clear();
  window.localStorage.clear();
}
beforeEach(freshBrowser);

/** A full page load of `url` (attribution starts once per load, as in production), then what the provider sends. */
async function load(url: string, from = "") {
  window.history.replaceState({}, "", url);
  referrer(from);
  resetAnalyticsForTests();
  initAttribution(undefined, false);
  attachAnalytics(await createPostHogClient(config));
  view(new URL(url, window.location.origin).pathname);
}

/** One route view: the provider's `$pageview`, the route's surface event, and one person-input engagement. */
function view(path: string) {
  analytics.pageview(path);
  trackRouteView(path);
  trackPageEngaged(path);
}

const TUPLE = ["kx_source", "kx_medium", "kx_campaign", "kx_content", "kx_traffic_type"] as const;
const tuple = (e: CaptureResult | undefined) => Object.fromEntries(TUPLE.map((k) => [k, e?.properties[k]]));
const lastPageview = () => byEvent("$pageview").at(-1);

const LI_001 = "/docs/platforms?utm_source=linkedin&utm_medium=social&utm_campaign=kx_p1_a_parity_proof&utm_content=li_primary";
const X_001 = "/docs/platforms?utm_source=x&utm_medium=social&utm_campaign=kx_p1_a_parity_proof&utm_content=x_thread";
const LI_001_EXPECTED = { kx_source: "linkedin", kx_medium: "social", kx_campaign: "kx_p1_a_parity_proof", kx_content: "li_primary" };

describe("tagged arrivals keep their source (real SDK, production before_send)", () => {
  it("1. LinkedIn UTM → linkedin, on every event of the page", async () => {
    await load(LI_001);
    for (const name of ["$pageview", "docs_viewed", "page_engaged"]) {
      expect(tuple(byEvent(name)[0]), name).toEqual({ ...LI_001_EXPECTED, kx_traffic_type: undefined });
    }
  });

  it("2. X UTM → x", async () => {
    await load(X_001);
    expect(tuple(lastPageview())).toEqual({ kx_source: "x", kx_medium: "social", kx_campaign: "kx_p1_a_parity_proof", kx_content: "x_thread", kx_traffic_type: undefined });
  });

  it("3. a valid campaign with no source keeps the campaign and is direct, never guessed as linkedin", async () => {
    await load("/docs/platforms?utm_medium=social&utm_campaign=kx_p1_a_parity_proof&utm_content=li_primary");
    expect(tuple(lastPageview())).toEqual({ kx_source: "direct", kx_medium: "social", kx_campaign: "kx_p1_a_parity_proof", kx_content: "li_primary", kx_traffic_type: undefined });
  });

  it("4. an untagged direct visit is direct with no campaign", async () => {
    await load("/docs/platforms");
    expect(tuple(lastPageview())).toEqual({ kx_source: "direct", kx_medium: "direct", kx_campaign: undefined, kx_content: undefined, kx_traffic_type: undefined });
  });

  it("5. a referrer-only visit takes the referrer's category and no campaign", async () => {
    await load("/docs/platforms", "https://www.linkedin.com/feed/");
    expect(tuple(lastPageview())).toEqual({ kx_source: "linkedin", kx_medium: "social", kx_campaign: undefined, kx_content: undefined, kx_traffic_type: undefined });
  });

  it("5b. a tagged source is never overwritten by a different referrer", async () => {
    await load(X_001, "https://www.linkedin.com/feed/");
    expect(lastPageview()!.properties).toMatchObject({ kx_source: "x", kx_referrer: "linkedin" });
  });

  it.each([
    ["an unknown source", "mastodon"],
    ["an altered linkedin (zero-width space)", "linkedin%E2%80%8B"],
    ["an altered linkedin (trailing dot)", "linkedin."],
    ["a malformed source", "%3Cscript%3E"],
  ])("6. %s → other, never linkedin, and the raw value is not sent", async (_label, raw) => {
    await load(`/docs/platforms?utm_source=${raw}&utm_medium=social&utm_campaign=kx_p1_a_parity_proof&utm_content=li_primary`);
    expect(lastPageview()!.properties.kx_source).toBe("other");
    expect(JSON.stringify(seen)).not.toMatch(/mastodon|script|linkedin\./);
  });
});

describe("tagged arrivals within one tab", () => {
  it("7. a new tagged arrival replaces an earlier session entry in the same tab; first touch stays", async () => {
    await load("/docs/tokens", "https://www.google.com/");
    await load(LI_001);
    expect(tuple(lastPageview())).toEqual({ ...LI_001_EXPECTED, kx_traffic_type: undefined });
    expect(lastPageview()!.properties).toMatchObject({ kx_first_source: "google", kx_landing_page: "/docs/platforms" });
  });

  it("7b. a different campaign tag in the same tab replaces the first one", async () => {
    await load(X_001);
    await load(LI_001);
    expect(tuple(lastPageview())).toEqual({ ...LI_001_EXPECTED, kx_traffic_type: undefined });
  });

  it("8. internal navigation after a tagged arrival keeps the campaign (client-side and full reloads)", async () => {
    await load(LI_001);
    view("/docs/installation"); // client-side: attribution is not re-run
    expect(tuple(lastPageview())).toEqual({ ...LI_001_EXPECTED, kx_traffic_type: undefined });
    await load("/docs/components/button", "https://kinetixui.com/docs/installation"); // full load, untagged, internal referrer
    expect(tuple(lastPageview())).toEqual({ ...LI_001_EXPECTED, kx_traffic_type: undefined });
    await load("/components", "https://www.linkedin.com/feed/"); // untagged external referrer: still the tagged entry
    expect(lastPageview()!.properties).toMatchObject({ kx_source: "linkedin", kx_campaign: "kx_p1_a_parity_proof", kx_landing_page: "/docs/platforms" });
  });

  it("8b. reloading the same tagged URL changes nothing", async () => {
    await load(LI_001);
    const before = tuple(lastPageview());
    await load(LI_001);
    expect(tuple(lastPageview())).toEqual(before);
  });
});

describe("cohort isolation", () => {
  it("9. a diagnostic visit stays diagnostic, through navigation and a new tagged arrival", async () => {
    await load(`${LI_001}&kx_traffic=diagnostic`);
    expect(tuple(lastPageview())).toEqual({ ...LI_001_EXPECTED, kx_traffic_type: "diagnostic" });
    view("/docs/installation");
    await load(X_001);
    expect(lastPageview()!.properties).toMatchObject({ kx_source: "x", kx_traffic_type: "diagnostic" });
    for (const e of seen) expect(e.properties.kx_traffic_type, e.event).toBe("diagnostic");
  });

  it("10. an internal browser stays internal in a new tab with a tagged arrival", async () => {
    await load("/?kx_traffic=internal");
    window.sessionStorage.clear(); // a new tab of the same browser
    await load(LI_001);
    expect(tuple(lastPageview())).toEqual({ ...LI_001_EXPECTED, kx_traffic_type: "internal" });
  });

  it("10b. genuine audience traffic carries no traffic type", async () => {
    await load(LI_001);
    for (const e of seen) expect(e.properties, e.event).not.toHaveProperty("kx_traffic_type");
  });
});

describe("no duplicate events", () => {
  it("11. one page view sends exactly one $pageview, one docs_viewed and one page_engaged", async () => {
    await load(`${LI_001}&kx_traffic=diagnostic`);
    expect(seen.map((e) => e.event).sort()).toEqual(["$pageview", "docs_viewed", "page_engaged"]);
  });
});

describe("12. the four M3 campaign links arrive as the register builds them", () => {
  const register = JSON.parse(readFileSync("../../marketing/content/register.json", "utf8")) as { assets: Array<{ id: string; url?: string }> };
  const M3 = ["LI-001", "X-001", "LI-008", "X-008"];
  const links = M3.map((id) => [id, register.assets.find((a) => a.id === id)?.url] as const);

  it("finds all four links rather than checking nothing", () => {
    expect(links.filter(([, url]) => url).length).toBe(4);
  });

  it.each(links)("%s keeps source, medium, campaign and content, diagnostic and not", async (_id, url) => {
    const u = new URL(url!);
    const q = u.searchParams;
    const expected = { kx_source: q.get("utm_source"), kx_medium: q.get("utm_medium"), kx_campaign: q.get("utm_campaign"), kx_content: q.get("utm_content") };
    await load(`${u.pathname}${u.search}&kx_traffic=diagnostic`);
    for (const e of seen) expect(tuple(e), e.event).toEqual({ ...expected, kx_traffic_type: "diagnostic" });
    freshBrowser();
    await load(`${u.pathname}${u.search}`);
    for (const e of seen) expect(tuple(e), e.event).toEqual({ ...expected, kx_traffic_type: undefined });
  });
});
