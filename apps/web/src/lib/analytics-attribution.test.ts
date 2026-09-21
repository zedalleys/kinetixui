import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startAnalytics } from "./analytics";
import {
  ATTRIBUTION_REFERRERS,
  ATTRIBUTION_SOURCES,
  classifyReferrer,
  deriveAttribution,
  getAttributionContext,
  initAttribution,
  normalizeCampaign,
  normalizeContent,
  normalizeMedium,
  normalizeSource,
  resetAttributionForTests,
  sanitizeAttributionProps,
  toProps,
  type AttributionInput,
} from "./analytics-attribution";

const OWN = "kinetixui.com";
const input = (search = "", referrer = "", pathname = "/"): AttributionInput => ({ search, referrer, pathname, ownHostname: OWN });
const SESSION_KEY = "kx_analytics_session_v1";
const FIRST_KEY = "kx_analytics_first_touch_v1";

beforeEach(() => {
  resetAttributionForTests();
  window.sessionStorage.clear();
  window.localStorage.clear();
});
afterEach(() => vi.restoreAllMocks());

/** Everything that could hold a leak: both storages and the outgoing context. */
const everything = () => JSON.stringify({ s: { ...window.sessionStorage }, l: { ...window.localStorage }, c: getAttributionContext() });

describe("normalizeSource", () => {
  it.each([
    ["linkedin", "linkedin"],
    ["LinkedIn", "linkedin"],
    ["  linkedin  ", "linkedin"],
    ["twitter", "x"],
    ["Twitter.com", "x"],
    ["x", "x"],
    ["t.co", "x"],
    ["dev.to", "devto"],
    ["dev_to", "devto"],
    ["dev-to", "devto"],
    ["devto", "devto"],
    ["google", "google"],
    ["www.google.com", "google"],
    ["google_search", "google"],
    ["reddit", "reddit"],
    ["hashnode", "hashnode"],
    ["product_hunt", "producthunt"],
    ["producthunt", "producthunt"],
    ["youtube", "youtube"],
    ["youtu.be", "youtube"],
    ["github", "github"],
    ["bing", "bing"],
    ["ddg", "duckduckgo"],
    ["newsletter", "newsletter"],
  ])("%s → %s", (raw, expected) => {
    expect(normalizeSource(raw)).toBe(expected);
  });

  it.each(["hello@example.com", "Some Random Blog", "acme-corp", "utm", "https://evil.example/x", "constructor", "__proto__", "toString", "a".repeat(500)])(
    "maps the unknown value %j to other, never forwarding it",
    (raw) => {
      expect(normalizeSource(raw)).toBe("other");
    },
  );

  it("is undefined for absent or empty", () => {
    expect(normalizeSource(null)).toBeUndefined();
    expect(normalizeSource("")).toBeUndefined();
    expect(normalizeSource("   ")).toBeUndefined();
  });

  it("only ever returns a member of the closed taxonomy", () => {
    for (const raw of ["linkedin", "junk@x.co", "twitter", "", "DEV.TO"]) {
      const v = normalizeSource(raw);
      if (v) expect(ATTRIBUTION_SOURCES).toContain(v);
    }
  });
});

describe("normalizeMedium", () => {
  it.each([
    ["social", "social"],
    ["Social_Media", "social"],
    ["organic", "organic"],
    ["community", "community"],
    ["e-mail", "email"],
    ["launch", "launch"],
  ])("%s → %s", (raw, expected) => expect(normalizeMedium(raw)).toBe(expected));

  it.each(["cpc", "paid", "hello@example.com", "constructor", "x".repeat(300)])("does not forward the unknown medium %j", (raw) => {
    expect(normalizeMedium(raw)).toBeUndefined();
  });
});

describe("normalizeCampaign / normalizeContent", () => {
  it.each(["kx_launch_2026", "kx_component_week", "kx_design_tokens_article", "kx_react_flutter_demo", "kx_a", `kx_${"a".repeat(63)}`])("keeps %s", (v) => {
    expect(normalizeCampaign(v)).toBe(v);
  });

  it.each([
    ["launch John Smith"],
    ["kx_launch John Smith"],
    ["launch_2026"], // valid slug but not a KinetixUI campaign
    ["KX_launch"], // wrong case: omitted, not lower-cased into something else
    ["kx_"],
    ["kx_-lead"],
    ["kx_launch.2026"],
    ["kx_a@b.co"],
    ["kx_x/y"],
    ["kx_x:y"],
    [`kx_${"a".repeat(64)}`], // one over the limit
    [""],
  ])("omits the campaign %j — never sanitised into another value", (v) => {
    expect(normalizeCampaign(v)).toBeUndefined();
  });

  it("keeps a safe content slug only alongside a valid campaign", () => {
    expect(normalizeContent("hero_video", "kx_launch_2026")).toBe("hero_video");
    expect(normalizeContent("carousel_1", "kx_launch_2026")).toBe("carousel_1");
    expect(normalizeContent("hero_video", undefined)).toBeUndefined();
  });

  it.each(["user@example.com", "has space", "a.b", "a/b", "a:b", "https://x.example", "-lead", "UPPER", "a".repeat(65), ""])("omits the content %j", (v) => {
    expect(normalizeContent(v, "kx_launch_2026")).toBeUndefined();
  });
});

describe("classifyReferrer", () => {
  it.each([
    ["https://www.google.com/search?q=kinetixui", "google"],
    ["https://www.google.co.uk/", "google"],
    ["https://google.com.au/search", "google"],
    ["https://www.bing.com/search?q=x", "bing"],
    ["https://duckduckgo.com/?q=x", "duckduckgo"],
    ["https://github.com/zedalleys/kinetixui", "github"],
    ["https://www.linkedin.com/feed/", "linkedin"],
    ["https://lnkd.in/abc", "linkedin"],
    ["https://t.co/abc", "x"],
    ["https://twitter.com/someone/status/1", "x"],
    ["https://old.reddit.com/r/reactjs/comments/abc", "reddit"],
    ["https://dev.to/someone/post", "devto"],
    ["https://someone.hashnode.dev/post", "hashnode"],
    ["https://www.producthunt.com/posts/kinetixui", "producthunt"],
    ["https://www.youtube.com/watch?v=abc", "youtube"],
  ])("%s → %s", (ref, category) => {
    expect(classifyReferrer(ref, OWN)).toEqual({ category, external: true });
  });

  it("treats an unknown site as other, and says only that", () => {
    const r = classifyReferrer("https://example-secret-domain.com/private?q=email@example.com", OWN);
    expect(r).toEqual({ category: "other", external: true });
    expect(JSON.stringify(r)).not.toMatch(/secret|private|email|example/);
  });

  it.each([
    ["https://google.com.evil.example/"],
    ["https://evilgoogle.com/"],
    ["https://github.com.evil.example/"],
    ["https://notlinkedin.com/"],
  ])("does not mistake the look-alike %s for a known site", (ref) => {
    expect(classifyReferrer(ref, OWN).category).toBe("other");
  });

  it.each([[""], [undefined], [null], ["not a url"], ["android-app://com.example.app"], ["javascript:alert(1)"], ["about:blank"]])(
    "treats %j as direct (no usable referrer)",
    (ref) => {
      expect(classifyReferrer(ref as string, OWN)).toEqual({ category: "direct", external: false });
    },
  );

  it("treats our own site — and its subdomains — as direct, so an internal referrer never overwrites acquisition", () => {
    expect(classifyReferrer("https://kinetixui.com/docs", OWN)).toEqual({ category: "direct", external: false });
    expect(classifyReferrer("https://www.kinetixui.com/", OWN)).toEqual({ category: "direct", external: false });
    expect(classifyReferrer("https://preview.kinetixui.com/x", OWN)).toEqual({ category: "direct", external: false });
  });

  it("only ever returns a category from the closed list", () => {
    for (const ref of ["https://www.google.com/", "https://x.example/", "", "https://t.co/y"]) expect(ATTRIBUTION_REFERRERS).toContain(classifyReferrer(ref, OWN).category);
  });
});

describe("deriveAttribution — the spec's privacy cases", () => {
  it("A. utm_source=linkedin → linkedin", () => {
    expect(deriveAttribution(input("?utm_source=linkedin")).source).toBe("linkedin");
  });

  it("B. utm_source=twitter → x", () => {
    expect(deriveAttribution(input("?utm_source=twitter")).source).toBe("x");
  });

  it("C. utm_source=hello@example.com → other, and the address appears nowhere", () => {
    const a = deriveAttribution(input("?utm_source=hello%40example.com"));
    expect(a.source).toBe("other");
    initAttribution(input("?utm_source=hello%40example.com"), false);
    expect(everything()).not.toMatch(/hello|example/);
  });

  it("D. utm_campaign=launch John Smith → omitted", () => {
    const a = deriveAttribution(input("?utm_source=linkedin&utm_campaign=launch%20John%20Smith"));
    expect(a.campaign).toBeUndefined();
    expect(JSON.stringify(a)).not.toMatch(/John|Smith/);
  });

  it("E. utm_campaign=kx_launch_2026 → retained", () => {
    expect(deriveAttribution(input("?utm_source=linkedin&utm_campaign=kx_launch_2026")).campaign).toBe("kx_launch_2026");
  });

  it("F. utm_content=user@example.com → omitted, even with a valid campaign", () => {
    const a = deriveAttribution(input("?utm_source=linkedin&utm_campaign=kx_launch_2026&utm_content=user%40example.com"));
    expect(a.campaign).toBe("kx_launch_2026");
    expect(a.content).toBeUndefined();
  });

  it("keeps a valid content slug with a valid campaign, and drops it without one", () => {
    expect(deriveAttribution(input("?utm_source=linkedin&utm_campaign=kx_launch_2026&utm_content=hero_a")).content).toBe("hero_a");
    expect(deriveAttribution(input("?utm_source=linkedin&utm_content=hero_a")).content).toBeUndefined();
    expect(deriveAttribution(input("?utm_source=linkedin&utm_campaign=not_ours&utm_content=hero_a")).content).toBeUndefined();
  });

  it("G. a click id is never read, stored or emitted", () => {
    const search = "?utm_source=linkedin&gclid=SECRET123&fbclid=SECRET456&msclkid=SECRET789&gbraid=S&wbraid=S&dclid=S&twclid=S&ttclid=S&li_fat_id=S";
    expect(JSON.stringify(deriveAttribution(input(search)))).not.toMatch(/SECRET|gclid|fbclid/);
    initAttribution(input(search), false);
    expect(everything()).not.toMatch(/SECRET|gclid|fbclid|msclkid|li_fat_id/);
  });

  it("H. an external referrer with a query → a category; the query is never stored", () => {
    const a = deriveAttribution(input("", "https://www.google.com/search?q=kinetixui"));
    expect(a).toMatchObject({ source: "google", medium: "organic", referrer: "google" });
    initAttribution(input("", "https://www.google.com/search?q=kinetixui"), false);
    expect(everything()).not.toMatch(/search|q=|google\.com/);
  });

  it("I. an unknown referrer → other; its hostname, path and query are never stored", () => {
    const ref = "https://example-secret-domain.com/private?q=email@example.com";
    const a = deriveAttribution(input("", ref));
    expect(a).toMatchObject({ source: "other", medium: "referral", referrer: "other" });
    initAttribution(input("", ref), false);
    expect(everything()).not.toMatch(/secret|private|email|example/);
  });

  it("J. the landing page is the clean pathname", () => {
    expect(deriveAttribution(input("?utm_source=linkedin", "", "/components?filter=data")).landing).toBe("/components");
    expect(deriveAttribution(input("", "", "/docs/components/button#x")).landing).toBe("/docs/components/button");
    expect(deriveAttribution(input("", "", "/")).landing).toBe("/");
  });

  it("omits a landing page that is not a clean path rather than sending it", () => {
    expect(deriveAttribution(input("", "", "/has space")).landing).toBeUndefined();
    expect(deriveAttribution(input("", "", "no-slash")).landing).toBeUndefined();
  });
});

describe("deriveAttribution — precedence", () => {
  it("source: a known UTM source beats a referrer", () => {
    expect(deriveAttribution(input("?utm_source=linkedin", "https://www.reddit.com/")).source).toBe("linkedin");
  });

  it("source: a recognised referrer is used when there is no UTM", () => {
    expect(deriveAttribution(input("", "https://github.com/x/y")).source).toBe("github");
  });

  it("source: an unrecognised UTM source yields to a recognised referrer", () => {
    expect(deriveAttribution(input("?utm_source=junk%40x.co", "https://www.google.com/")).source).toBe("google");
  });

  it("source: an unrecognised UTM source alone is other — the tag existed, the value is unknown", () => {
    expect(deriveAttribution(input("?utm_source=junk%40x.co")).source).toBe("other");
  });

  it("source: nothing at all is direct", () => {
    expect(deriveAttribution(input())).toMatchObject({ source: "direct", medium: "direct", referrer: "direct" });
  });

  it("source: an internal referrer is direct and does not create acquisition", () => {
    expect(deriveAttribution(input("", "https://kinetixui.com/docs")).source).toBe("direct");
  });

  it("medium: a known UTM medium beats the inferred one", () => {
    expect(deriveAttribution(input("?utm_source=github&utm_medium=launch")).medium).toBe("launch");
  });

  it("medium: an unknown UTM medium is ignored and the medium is inferred from the source", () => {
    expect(deriveAttribution(input("?utm_source=linkedin&utm_medium=whatever%40x.co")).medium).toBe("social");
  });

  it.each([
    ["?utm_source=linkedin", "social"],
    ["?utm_source=x", "social"],
    ["?utm_source=reddit", "community"],
    ["?utm_source=devto", "community"],
    ["?utm_source=hashnode", "community"],
    ["?utm_source=producthunt", "launch"],
    ["?utm_source=youtube", "video"],
    ["?utm_source=newsletter", "email"],
    ["?utm_source=github", "referral"],
    ["?utm_source=google", "organic"],
  ])("medium: %s is inferred as %s", (search, medium) => {
    expect(deriveAttribution(input(search)).medium).toBe(medium);
  });

  it("campaign is never inferred: no valid kx_ campaign, no campaign", () => {
    for (const search of ["", "?utm_source=linkedin", "?utm_source=linkedin&utm_campaign=whatever"]) {
      expect(deriveAttribution(input(search, "https://www.google.com/")).campaign).toBeUndefined();
    }
  });

  it("is deterministic and reads no key but the four allowed ones", () => {
    const search = "?utm_source=linkedin&utm_medium=social&utm_term=secret&ref=abc&source=other&campaign=x";
    expect(deriveAttribution(input(search))).toEqual(deriveAttribution(input(search)));
    expect(JSON.stringify(deriveAttribution(input(search)))).not.toMatch(/secret|abc|term/);
  });
});

describe("toProps / sanitizeAttributionProps", () => {
  const full = deriveAttribution(input("?utm_source=linkedin&utm_medium=social&utm_campaign=kx_launch_2026&utm_content=hero_a", "https://www.google.com/x", "/docs"));

  it("flattens to kx_* and kx_first_* names", () => {
    expect(toProps(full, "kx_")).toEqual({
      kx_source: "linkedin",
      kx_medium: "social",
      kx_referrer: "google",
      kx_campaign: "kx_launch_2026",
      kx_content: "hero_a",
      kx_landing_page: "/docs",
    });
    expect(Object.keys(toProps(full, "kx_first_")).every((k) => k.startsWith("kx_first_"))).toBe(true);
  });

  it("keeps valid values and leaves other properties alone", () => {
    const bag: Record<string, unknown> = { ...toProps(full, "kx_"), ...toProps(full, "kx_first_"), component: "button" };
    const before = { ...bag };
    sanitizeAttributionProps(bag);
    expect(bag).toEqual(before);
  });

  it("removes any kx_* value that is not valid attribution", () => {
    const bag: Record<string, unknown> = {
      kx_source: "hello@example.com",
      kx_medium: "cpc",
      kx_campaign: "launch John Smith",
      kx_referrer: "example-secret-domain.com",
      kx_landing_page: "/x?utm_source=a",
      kx_first_source: "https://evil.example",
      kx_first_campaign: 42,
      kx_first_medium: "social", // valid: stays
    };
    sanitizeAttributionProps(bag);
    expect(bag).toEqual({ kx_first_medium: "social" });
  });

  it("removes content that has no valid campaign beside it, and any unknown kx_ key", () => {
    const bag: Record<string, unknown> = { kx_content: "hero_a", kx_first_content: "hero_a", kx_first_campaign: "kx_launch_2026", kx_anything: "x", kx_first_email: "a@b.co" };
    sanitizeAttributionProps(bag);
    expect(bag).toEqual({ kx_first_content: "hero_a", kx_first_campaign: "kx_launch_2026" });
  });
});

describe("initAttribution — session entry and first touch", () => {
  const LINKEDIN = "?utm_source=linkedin&utm_medium=social&utm_campaign=kx_launch_2026&utm_content=hero_a";
  const REDDIT = "?utm_source=reddit&utm_medium=community&utm_campaign=kx_other_campaign";

  it("is empty before it runs", () => {
    expect(getAttributionContext()).toEqual({});
  });

  it("writes the session record and the first-touch record, and emits both", () => {
    initAttribution(input(LINKEDIN, "", "/docs"), false);
    expect(getAttributionContext()).toEqual({
      kx_source: "linkedin",
      kx_medium: "social",
      kx_referrer: "direct",
      kx_campaign: "kx_launch_2026",
      kx_content: "hero_a",
      kx_landing_page: "/docs",
      kx_first_source: "linkedin",
      kx_first_medium: "social",
      kx_first_referrer: "direct",
      kx_first_campaign: "kx_launch_2026",
      kx_first_content: "hero_a",
      kx_first_landing_page: "/docs",
    });
    expect(window.sessionStorage.getItem(SESSION_KEY)).not.toBeNull();
    expect(window.localStorage.getItem(FIRST_KEY)).not.toBeNull();
  });

  it("stores only normalised fields — never the query, referrer or a click id", () => {
    initAttribution(input(`${LINKEDIN}&gclid=SECRET123&email=a%40b.co`, "https://www.google.com/search?q=private", "/components?filter=data"), false);
    const stored = window.sessionStorage.getItem(SESSION_KEY)! + window.localStorage.getItem(FIRST_KEY)!;
    expect(stored).not.toMatch(/SECRET|gclid|private|search|q=|filter|email|a@b|google\.com|utm_/);
    expect(Object.keys(JSON.parse(window.sessionStorage.getItem(SESSION_KEY)!)).sort()).toEqual(["campaign", "content", "landing", "medium", "referrer", "source"]);
  });

  it("L. later navigation in the same session does not change the session attribution", () => {
    initAttribution(input(LINKEDIN, "", "/"), false);
    const first = { ...getAttributionContext() };
    // a later page in the same tab — even one carrying a different UTM — must not replace the session entry
    initAttribution(input(REDDIT, "https://www.reddit.com/", "/docs/installation"), false);
    expect(getAttributionContext()).toEqual(first);
    initAttribution(input("", "https://kinetixui.com/", "/docs/components/button"), false);
    expect(getAttributionContext()).toEqual(first);
  });

  it("K. first touch is write-once", () => {
    initAttribution(input(LINKEDIN), false);
    const stored = window.localStorage.getItem(FIRST_KEY);
    window.sessionStorage.clear(); // a new session
    initAttribution(input(REDDIT), false);
    window.sessionStorage.clear();
    initAttribution(input("?utm_source=x"), false);
    expect(window.localStorage.getItem(FIRST_KEY)).toBe(stored);
  });

  it("M. a new session gets new session attribution while first touch stays", () => {
    initAttribution(input(LINKEDIN), false);
    window.sessionStorage.clear();
    initAttribution(input(REDDIT, "", "/components"), false);
    expect(getAttributionContext()).toMatchObject({
      kx_source: "reddit",
      kx_medium: "community",
      kx_campaign: "kx_other_campaign",
      kx_landing_page: "/components",
      kx_first_source: "linkedin",
      kx_first_medium: "social",
      kx_first_campaign: "kx_launch_2026",
      kx_first_content: "hero_a",
    });
  });

  it("a first visit that was direct stays direct: first touch never upgrades and a valid one is never replaced", () => {
    initAttribution(input(), false);
    window.sessionStorage.clear();
    initAttribution(input(LINKEDIN), false);
    expect(getAttributionContext()).toMatchObject({ kx_source: "linkedin", kx_first_source: "direct" });
  });

  it("a later direct session does not replace an existing first touch with direct", () => {
    initAttribution(input(LINKEDIN), false);
    window.sessionStorage.clear();
    initAttribution(input(), false);
    expect(getAttributionContext()).toMatchObject({ kx_source: "direct", kx_first_source: "linkedin" });
  });

  it("does not persist or emit anything with Do Not Track on", () => {
    initAttribution(input(LINKEDIN), true);
    expect(getAttributionContext()).toEqual({});
    expect(window.sessionStorage.length + window.localStorage.length).toBe(0);
  });

  it("does nothing without a browser (server)", () => {
    initAttribution(null, false);
    expect(getAttributionContext()).toEqual({});
  });

  it("re-validates storage: a tampered session or first-touch record is ignored, not emitted", () => {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ source: "hello@example.com", medium: "social", referrer: "direct" }));
    window.localStorage.setItem(FIRST_KEY, JSON.stringify({ source: "linkedin", medium: "<script>", referrer: "direct" }));
    initAttribution(input(LINKEDIN), false);
    expect(getAttributionContext()).toMatchObject({ kx_source: "linkedin", kx_first_source: "linkedin" });
    expect(everything()).not.toMatch(/hello|example|script/);
  });

  it("drops extra fields and an invalid campaign or content from a stored record", () => {
    window.sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ source: "linkedin", medium: "social", referrer: "direct", campaign: "launch John Smith", content: "hero_a", email: "a@b.co", landing: "/x?y=1" }),
    );
    initAttribution(input(REDDIT), false);
    const ctx = getAttributionContext();
    expect(ctx).toMatchObject({ kx_source: "linkedin" });
    expect(ctx).not.toHaveProperty("kx_campaign");
    expect(ctx).not.toHaveProperty("kx_content");
    expect(ctx).not.toHaveProperty("kx_landing_page");
    expect(JSON.stringify(ctx)).not.toMatch(/John|a@b|email/);
  });

  it("ignores unparseable storage", () => {
    window.sessionStorage.setItem(SESSION_KEY, "{not json");
    window.localStorage.setItem(FIRST_KEY, "null");
    expect(() => initAttribution(input(LINKEDIN), false)).not.toThrow();
    expect(getAttributionContext()).toMatchObject({ kx_source: "linkedin", kx_first_source: "linkedin" });
  });

  it("returns a frozen context that cannot be edited by a caller", () => {
    initAttribution(input(LINKEDIN), false);
    expect(Object.isFrozen(getAttributionContext())).toBe(true);
  });
});

describe("initAttribution — storage failure", () => {
  const quiet = () => {
    const spies = (["error", "warn", "log", "info"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    return () => spies.forEach((s) => expect(s).not.toHaveBeenCalled());
  };

  it("survives both storages being blocked outright: session attribution is kept in memory, first touch is omitted", () => {
    const assertQuiet = quiet();
    vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(() => initAttribution(input("?utm_source=linkedin&utm_medium=social"), false)).not.toThrow();
    const ctx = getAttributionContext();
    expect(ctx).toMatchObject({ kx_source: "linkedin", kx_medium: "social" });
    expect(Object.keys(ctx).some((k) => k.startsWith("kx_first_"))).toBe(false); // it can't be persisted, so it isn't claimed
    assertQuiet();
  });

  it("survives writes failing (quota, private mode) the same way", () => {
    const assertQuiet = quiet();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(() => initAttribution(input("?utm_source=reddit"), false)).not.toThrow();
    expect(getAttributionContext()).toMatchObject({ kx_source: "reddit" });
    expect(Object.keys(getAttributionContext()).some((k) => k.startsWith("kx_first_"))).toBe(false);
    assertQuiet();
  });

  it("survives reads failing", () => {
    const assertQuiet = quiet();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("boom");
    });
    expect(() => initAttribution(input("?utm_source=github"), false)).not.toThrow();
    expect(getAttributionContext()).toMatchObject({ kx_source: "github" });
    assertQuiet();
  });
});

describe("startAnalytics and attribution: only when analytics is on", () => {
  const good = { key: "phc_TestKey1234567890", host: "https://us.i.posthog.com", nodeEnv: "production", hostname: "kinetixui.com" };
  const fakeAdapter = () => ({ createPostHogClient: () => ({ capture: vi.fn(), pageview: vi.fn() }) });

  beforeEach(() => window.history.replaceState({}, "", "/?utm_source=linkedin&utm_medium=social&utm_campaign=kx_launch_2026&gclid=SECRET123"));
  afterEach(() => window.history.replaceState({}, "", "/"));

  it("persists nothing and emits nothing when config is missing", async () => {
    const { resetAnalyticsForTests } = await import("./analytics");
    resetAnalyticsForTests();
    await startAnalytics(async () => fakeAdapter(), { ...good, key: undefined });
    expect(window.sessionStorage.length + window.localStorage.length).toBe(0);
    expect(getAttributionContext()).toEqual({});
  });

  it.each([
    ["a development build", { nodeEnv: "development" }],
    ["the test runner", { nodeEnv: "test" }],
    ["a preview hostname", { hostname: "kinetixui-git-x-zed-alleys.vercel.app" }],
    ["localhost", { hostname: "localhost" }],
    ["the server", { hostname: undefined }],
  ])("persists nothing in %s", async (_what, override) => {
    const { resetAnalyticsForTests } = await import("./analytics");
    resetAnalyticsForTests();
    await startAnalytics(async () => fakeAdapter(), { ...good, ...override });
    expect(window.sessionStorage.length + window.localStorage.length).toBe(0);
    expect(getAttributionContext()).toEqual({});
  });

  it("persists nothing with Do Not Track on, even in production on the real hostname", async () => {
    const { resetAnalyticsForTests } = await import("./analytics");
    resetAnalyticsForTests();
    Object.defineProperty(navigator, "doNotTrack", { value: "1", configurable: true });
    try {
      await startAnalytics(async () => fakeAdapter(), good);
      expect(window.sessionStorage.length + window.localStorage.length).toBe(0);
      expect(getAttributionContext()).toEqual({});
    } finally {
      delete (navigator as unknown as { doNotTrack?: unknown }).doNotTrack;
    }
  });

  it("derives attribution from the LANDING page, before the lazy SDK loads, when analytics is on", async () => {
    const { resetAnalyticsForTests } = await import("./analytics");
    resetAnalyticsForTests();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const started = startAnalytics(async () => {
      await gate; // the SDK import is still in flight...
      return fakeAdapter();
    }, good);
    // ...and a fast client-side navigation has already changed the URL (no query on an internal navigation)
    window.history.pushState({}, "", "/docs/installation");
    expect(getAttributionContext()).toMatchObject({ kx_source: "linkedin", kx_campaign: "kx_launch_2026", kx_landing_page: "/" });
    release();
    await started;
    expect(everythingIn()).not.toMatch(/SECRET|gclid/);
  });

  it("never lets an attribution failure stop analytics from starting", async () => {
    const { resetAnalyticsForTests } = await import("./analytics");
    resetAnalyticsForTests();
    vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new Error("blocked");
    });
    const create = vi.fn(() => ({ capture: vi.fn(), pageview: vi.fn() }));
    await startAnalytics(async () => ({ createPostHogClient: create }), good);
    expect(create).toHaveBeenCalledOnce();
  });
});

function everythingIn() {
  return JSON.stringify({ s: { ...window.sessionStorage }, l: { ...window.localStorage }, c: getAttributionContext() });
}
