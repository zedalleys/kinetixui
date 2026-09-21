// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Architecture rules that are cheap to break by accident and expensive to notice later. They read source, not
 * behaviour — the behaviour is tested next to each module.
 */
const src = join(process.cwd(), "src");
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
/** Source with comments removed, so a rule about code isn't tripped by prose that mentions it. */
const code = (p: string) => read(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

function sourceFiles(dir = src): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|mdx)$/.test(name) ? [relative(process.cwd(), full).split(sep).join("/")] : [];
  });
}

describe("analytics architecture", () => {
  const files = sourceFiles();

  it("scans the whole source tree", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it("imports posthog-js only in the adapter (and its tests)", () => {
    const offenders = files.filter((f) => /from\s+["']posthog-js|import\(\s*["']posthog-js|require\(\s*["']posthog-js/.test(read(f)));
    for (const f of offenders) expect(f, `${f} imports posthog-js`).toMatch(/^src\/lib\/analytics-posthog(\.[a-z]+)?\.(test\.)?tsx?$/);
    expect(offenders.some((f) => f === "src/lib/analytics-posthog.ts")).toBe(true);
  });

  it("never calls posthog.capture or reads window.posthog outside the adapter", () => {
    const offenders = files.filter((f) => !f.includes(".test.") && !f.startsWith("src/lib/analytics-posthog") && /\bposthog\s*\.\s*capture\b|window\.posthog/.test(code(f)));
    expect(offenders).toEqual([]);
  });

  it("keeps the root layout a server component", () => {
    const layout = read("src/app/layout.tsx");
    expect(layout).not.toMatch(/^\s*["']use client["']/m);
    expect(layout).toContain("<AnalyticsProvider />");
  });

  it.each(["src/app/page.tsx", "src/app/docs/layout.tsx", "src/app/components/page.tsx", "src/app/docs/changelog/page.tsx"])(
    "keeps %s a server component — instrumentation must not turn pages into client components",
    (page) => {
      expect(read(page)).not.toMatch(/^\s*["']use client["']/m);
    },
  );

  it("keeps a single client boundary for route views and link clicks: the provider", () => {
    // the semantic-event logic is plain modules; the only component that listens for clicks is the provider
    const listeners = files.filter((f) => /document\.addEventListener\(\s*["']click["']/.test(read(f)));
    expect(listeners).toEqual(["src/components/analytics-provider.tsx"]);
  });

  it("does not enable any broad PostHog capture", () => {
    const adapter = code("src/lib/analytics-posthog.ts");
    expect(adapter).toMatch(/autocapture:\s*false/);
    expect(adapter).toMatch(/disable_session_recording:\s*true/);
    expect(adapter).toMatch(/capture_pageview:\s*false/);
    expect(adapter).toMatch(/advanced_disable_flags:\s*true/);
    expect(adapter).toMatch(/disable_surveys:\s*true/);
    expect(adapter).toMatch(/capture_heatmaps:\s*false/);
    expect(adapter).toMatch(/capture_dead_clicks:\s*false/);
    expect(adapter).toMatch(/save_campaign_params:\s*false/);
    expect(adapter).not.toMatch(/autocapture:\s*true|disable_session_recording:\s*false|identify\(/);
  });

  it("never reads a value, clipboard or input into an analytics call", () => {
    /** The argument text of every `analytics.track(...)` call in a file, found by balancing parentheses. */
    const trackCalls = (text: string) => {
      const found: string[] = [];
      for (let at = text.indexOf("analytics.track("); at >= 0; at = text.indexOf("analytics.track(", at + 1)) {
        let depth = 0;
        let end = at + "analytics.track".length;
        for (; end < text.length; end++) {
          if (text[end] === "(") depth++;
          else if (text[end] === ")" && --depth === 0) break;
        }
        found.push(text.slice(at, end + 1));
      }
      return found;
    };

    const callers = files.filter((f) => f !== "src/lib/analytics.ts" && !f.includes(".test.") && /analytics\.track\(/.test(read(f)));
    const calls = callers.flatMap((f) => trackCalls(code(f)).map((c) => ({ f, c })));
    // prove the scan sees the real call sites (routes, links, copy, tabs), so an empty result can't pass vacuously
    expect(calls.length).toBeGreaterThanOrEqual(10);

    for (const { f, c } of calls) {
      for (const risky of [/clipboard/i, /\.value\b/, /textContent/, /innerText/, /location\.search/, /location\.hash/, /useSearchParams/, /\bhref\b/, /\btext\b/]) {
        expect(c, `${f}: ${risky} inside an analytics.track call`).not.toMatch(risky);
      }
    }
  });

  describe("attribution", () => {
    const ATTRIBUTION = "src/lib/analytics-attribution.ts";
    const ADAPTER = "src/lib/analytics-posthog.ts";
    /** Non-test analytics modules: the only files that may touch the query string, the referrer or storage keys. */
    const analyticsFiles = files.filter((f) => !f.includes(".test.") && /^src\/(lib\/analytics|components\/analytics-)/.test(f));

    it("finds the analytics modules", () => {
      expect(analyticsFiles).toEqual(expect.arrayContaining([ATTRIBUTION, ADAPTER, "src/lib/analytics.ts", "src/components/analytics-provider.tsx"]));
    });

    it("keeps the kx_* attribution vocabulary inside the attribution module and the adapter — UI code cannot name it", () => {
      // a property name written out, or the "kx_" / "kx_first_" prefix it is built from
      const KX = /\bkx_(first_)?(source|medium|campaign|content|referrer|landing_page)\b|["']kx_(first_)?["']/;
      const offenders = files.filter((f) => !f.includes(".test.") && ![ATTRIBUTION, ADAPTER].includes(f) && KX.test(code(f)));
      expect(offenders).toEqual([]);
      expect(code(ATTRIBUTION)).toMatch(/"kx_first_"/);
    });

    it("reads the query string and the referrer in exactly one place", () => {
      const readers = analyticsFiles.filter((f) => /URLSearchParams|location\.search|document\.referrer|location\.href/.test(code(f)));
      expect(readers).toEqual([ATTRIBUTION]);
    });

    it("mentions utm_* and click ids only where they are read or deleted", () => {
      const offenders = analyticsFiles.filter((f) => ![ATTRIBUTION, ADAPTER].includes(f) && /utm_|gclid|fbclid|msclkid/.test(code(f)));
      expect(offenders).toEqual([]);
    });

    it("establishes attribution from one caller, startAnalytics, and nowhere in UI code", () => {
      const callers = files.filter((f) => !f.includes(".test.") && f !== ATTRIBUTION && /\binitAttribution\(/.test(code(f)));
      expect(callers).toEqual(["src/lib/analytics.ts"]);
    });

    it("enriches in before_send, once, so events the SDK creates itself ($pageleave) get attribution too", () => {
      const adapter = code(ADAPTER);
      // exactly one place reads the trusted context: the first before_send step, not the capture wrappers
      expect(adapter.match(/getAttributionContext\(\)/g)?.length).toBe(1);
      expect(adapter).toMatch(/before_send:\s*\[attachAttribution,\s*sanitizeCapture\]/);
      // ...and the wrappers add nothing themselves
      expect(adapter).not.toMatch(/\.\.\.getAttributionContext/);
      // validation follows enrichment
      expect(adapter).toMatch(/sanitizeAttributionProps\(bag\)/);
    });

    it("does not give the UI-facing property allowlist a way to carry attribution", () => {
      const analytics = code("src/lib/analytics.ts");
      expect(analytics).not.toMatch(/\bkx_/);
      expect(analytics).not.toMatch(/ALLOWED_KEYS[^;]*(kx_|utm|campaign|referrer)/s);
    });

    it("reuses the shared path sanitiser instead of defining its own", () => {
      const attribution = code(ATTRIBUTION);
      expect(attribution).toMatch(/from "\.\/analytics-safe"/);
      expect(attribution).not.toMatch(/function cleanPath|const cleanPath/);
    });

    it("uses no cookies anywhere in analytics, and only versioned storage keys", () => {
      for (const f of analyticsFiles) expect(code(f), f).not.toMatch(/document\.cookie/);
      expect(code(ATTRIBUTION)).toMatch(/"kx_analytics_session_v1"/);
      expect(code(ATTRIBUTION)).toMatch(/"kx_analytics_first_touch_v1"/);
    });

    it("adds no 'activated' or 'conversion' event: activation stays derived from the three copy events", () => {
      expect(code("src/lib/analytics.ts")).not.toMatch(/developer_activated|["']activated["']|["']conversion["']/);
    });

    it("keeps PostHog's own campaign parsing and person profiles off", () => {
      const adapter = code(ADAPTER);
      expect(adapter).toMatch(/save_campaign_params:\s*false/);
      expect(adapter).toMatch(/person_profiles:\s*"identified_only"/);
      expect(adapter).toMatch(/persistence:\s*"localStorage"/);
      expect(adapter).toMatch(/respect_dnt:\s*true/);
      expect(adapter).toMatch(/disable_external_dependency_loading:\s*true/);
    });
  });
});
