/**
 * Rendered SEO check: what a crawler that runs JavaScript sees on a representative set of routes, in real
 * Chromium against `next start`. `check:seo` covers the whole built inventory statically; this proves the
 * same metadata survives hydration and that query state (`?platform=`, `?filter=`, `?q=`) never leaks into a
 * canonical.
 *
 *   pnpm --filter @kinetixui/web build && pnpm --filter @kinetixui/web start &
 *   pnpm check:seo-browser                       # [--base http://127.0.0.1:3000] [--perf] [--json out.json]
 *
 * `--perf` also records lab metrics per route (LCP, CLS, long-task total as a TBT proxy, transferred JS and
 * image bytes) — used for the before/after table in marketing/seo/SEO-BASELINE.md, not asserted on, because
 * lab numbers in a shared container are too noisy to gate a build.
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium (local runs); CI uses `playwright install chromium`.
 */
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? fallback : process.argv[i + 1];
};
const base = arg("--base", "http://127.0.0.1:3000").replace(/\/$/, "");
const jsonOut = arg("--json");
const perf = process.argv.includes("--perf");
const ORIGIN = "https://kinetixui.com";

/** route, the query a visitor might arrive with, and the internal links the page must carry. */
const ROUTES = [
  { path: "/", links: ["/components", "/docs/platforms"] },
  { path: "/components", query: "?filter=Overlays&platform=SwiftUI&q=dia", links: ["/docs/components/dialog"] },
  // the #350 platform override must keep working for the visitor while the canonical stays the clean route
  { path: "/docs/components/button", query: "?platform=SwiftUI", selected: "SwiftUI", links: ["/components", "/docs/installation", "/docs/swiftui", "/docs/components/button-group"], breadcrumb: true },
  { path: "/docs/components/dialog", query: "?platform=Angular", selected: "Angular", links: ["/components", "/docs/components/alert-dialog", "/docs/components/sheet"], breadcrumb: true },
  { path: "/docs/angular", links: ["/docs/platforms"], breadcrumb: true },
  { path: "/docs/swiftui", links: ["/docs/platforms", "/components", "/docs/tokens"], breadcrumb: true },
  { path: "/docs/compose", links: ["/docs/platforms"], breadcrumb: true },
  { path: "/docs/flutter", links: ["/docs/platforms"], breadcrumb: true },
  { path: "/docs/tokens", links: ["/docs/platforms"], breadcrumb: true },
  { path: "/docs/accessibility", links: ["/docs/rtl"], breadcrumb: true },
  { path: "/blocks", query: "?filter=Forms", links: ["/components"] },
  { path: "/iot", links: ["/docs/iot"] },
  { path: "/docs/changelog", query: "?filter=components&q=angular", links: ["/docs/platforms"], breadcrumb: true },
];

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const failures = [];
const results = [];

for (const r of ROUTES) {
  const page = await context.newPage();
  const bytes = { script: 0, image: 0 };
  if (perf) {
    page.on("response", async (res) => {
      const type = res.request().resourceType();
      if (type !== "script" && type !== "image") return;
      const len = Number(res.headers()["content-length"] ?? 0) || (await res.body().catch(() => Buffer.alloc(0))).length;
      bytes[type] += len;
    });
    await page.addInitScript(() => {
      window.__seoPerf = { lcp: 0, cls: 0, longTasks: 0 };
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__seoPerf.lcp = e.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (!e.hadRecentInput) window.__seoPerf.cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__seoPerf.longTasks += Math.max(0, e.duration - 50);
      }).observe({ type: "longtask", buffered: true });
    });
  }
  const url = `${base}${r.path}${r.query ?? ""}`;
  const res = await page.goto(url, { waitUntil: "networkidle" });
  const where = `${r.path}${r.query ?? ""}`;
  const fail = (msg) => failures.push(`${where}: ${msg}`);

  const data = await page.evaluate(() => {
    const meta = (sel) => document.querySelector(sel)?.getAttribute("content") ?? null;
    return {
      title: document.title,
      description: meta('meta[name="description"]'),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
      robots: meta('meta[name="robots"]'),
      ogUrl: meta('meta[property="og:url"]'),
      h1: [...document.querySelectorAll("h1")].map((h) => h.textContent.trim()),
      links: [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")),
      jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent),
      breadcrumb: !!document.querySelector('nav[aria-label="Docs breadcrumb"]'),
      href: location.href,
    };
  });

  if (res?.status() !== 200) fail(`status ${res?.status()}`);
  if (!data.title) fail("no title");
  if (!data.description) fail("no description");
  if (data.canonical !== `${ORIGIN}${r.path === "/" ? "" : r.path}`) fail(`canonical ${data.canonical}`);
  if (data.ogUrl !== data.canonical) fail(`og:url ${data.ogUrl} ≠ canonical`);
  if (/noindex/i.test(data.robots ?? "")) fail(`robots ${data.robots}`);
  if (data.h1.length !== 1) fail(`${data.h1.length} h1: ${JSON.stringify(data.h1)}`);
  for (const l of r.links) if (!data.links.some((h) => h === l || h.startsWith(`${l}?`) || h.startsWith(`${l}#`))) fail(`no link to ${l}`);
  for (const [i, text] of data.jsonld.entries()) {
    try {
      JSON.parse(text);
    } catch {
      fail(`JSON-LD #${i} does not parse`);
    }
  }
  if (r.breadcrumb && !data.jsonld.some((t) => t.includes('"BreadcrumbList"'))) fail("no BreadcrumbList JSON-LD");
  // query state must still work for the visitor: the URL keeps it after hydration
  if (r.query && !data.href.includes(r.query.slice(1).split("&")[0])) fail(`query state dropped: ${data.href}`);
  // ...and it still does what it says: the requested platform's tab is the one showing
  if (r.selected) {
    // the platform tabs live under the first preview's Code tab
    await page.getByRole("tab", { name: "Code" }).first().click();
    const selected = await page.$$eval('[role="tab"][aria-selected="true"]', (els) => els.map((t) => t.textContent.trim()));
    if (!selected.some((t) => t.startsWith(r.selected))) fail(`?platform= did not select ${r.selected} (selected: ${JSON.stringify(selected)})`);
  }

  const row = { route: where, status: res?.status(), title: data.title, canonical: data.canonical, h1: data.h1[0] };
  if (perf) {
    await page.waitForTimeout(500);
    const p = await page.evaluate(() => window.__seoPerf);
    Object.assign(row, { lcpMs: Math.round(p.lcp), cls: Number(p.cls.toFixed(4)), tbtProxyMs: Math.round(p.longTasks), jsKB: Math.round(bytes.script / 1024), imgKB: Math.round(bytes.image / 1024) });
  }
  results.push(row);
  await page.close();
}

await browser.close();
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(results, null, 2));
for (const r of results) console.log(`  ${failures.some((f) => f.startsWith(r.route + ":")) ? "✗" : "✓"} ${r.route} — ${r.title}${perf ? ` · LCP ${r.lcpMs}ms CLS ${r.cls} TBT~${r.tbtProxyMs}ms JS ${r.jsKB}KB img ${r.imgKB}KB` : ""}`);
if (failures.length) {
  console.log(`\ncheck:seo-browser — ${failures.length} failure(s):`);
  for (const f of failures) console.log(`  ${f}`);
  process.exit(1);
}
console.log(`\ncheck:seo-browser — ${results.length} routes rendered, all pass`);
