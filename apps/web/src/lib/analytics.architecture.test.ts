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
});
