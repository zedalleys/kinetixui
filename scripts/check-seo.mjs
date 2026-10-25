/**
 * SEO regression gate over the PRODUCTION BUILD, not over React output.
 *
 * Every route on this site is prerendered (`○ Static` in `next build`), so the HTML a crawler receives is
 * already on disk under `apps/web/.next/server/app/**.html`, together with the built `sitemap.xml` and
 * `robots.txt`. Reading those files covers the whole inventory (130-odd pages) in a few seconds without a
 * server or a browser; `scripts/seo-browser.mjs` then checks a representative handful in real Chromium.
 *
 *   pnpm --filter @kinetixui/web build && pnpm check:seo
 *   node scripts/check-seo.mjs --report out.json   # also dump the per-page extraction (used for the baseline)
 *
 * What it fails on, by rule id (each one has a negative control in marketing/seo/SEO-BASELINE.md §8):
 *
 *   title-missing        an indexable page has no <title>
 *   title-duplicate      two indexable pages share a <title>
 *   desc-missing         an indexable page has no meta description
 *   desc-markup          a description carries Markdown/MDX markup (backticks, angle brackets) into a plain-text snippet
 *   desc-duplicate       two indexable pages share a meta description
 *   canonical-missing    an indexable page has no <link rel=canonical>
 *   canonical-host       a canonical is not on the production origin
 *   canonical-query      a canonical carries query state (?platform=, ?filter=, ?q=) or a fragment
 *   canonical-self       a canonical points at a different route than the page it is on
 *   og-url               og:url disagrees with the canonical
 *   h1-count             a page does not have exactly one <h1>
 *   sitemap-missing-page a sitemap URL has no built page
 *   sitemap-bad-url      a sitemap URL has a query/fragment, is off-host, is noindex, or is a utility route
 *   sitemap-omits        an indexable built page is missing from the sitemap
 *   link-broken          an internal href resolves to no built page, public file or redirect
 *   route-parent         a nested route's parent path is neither a built page nor a redirect (truncating the URL 404s)
 *   og-image             an indexable page has no og:image, or it does not resolve to a built image
 *   jsonld-invalid       a JSON-LD block does not parse, or has no @context/@type
 *   breadcrumb-mismatch  BreadcrumbList JSON-LD disagrees with the visible breadcrumb
 *   breadcrumb-missing   a /use-cases page has no visible breadcrumb or no BreadcrumbList JSON-LD
 *   component-title      a component page's title/description does not name the component and a platform
 *   component-related    a component page has no "Related components" links to other component pages
 *   noindex-important    a sitemap or core page is noindex
 *   robots               robots.txt disallows a page route or points at the wrong sitemap
 *   orphan               an indexable page no other page links to (the sitemap alone is not a link graph)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { NOT_FOUND, siteInventory, unresolvedPath } from "./site-inventory.mjs";

const require = createRequire(resolve("apps/web/package.json"));
const { JSDOM } = require("jsdom");

const ORIGIN = "https://kinetixui.com";
const args = process.argv.slice(2);
const argValue = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
const NEXT_DIR = resolve(argValue("--dir") ?? "apps/web/.next");
const PUBLIC_DIR = resolve("apps/web/public");
const APP_DIR = join(NEXT_DIR, "server/app");
const reportPath = argValue("--report");

/**
 * Pages allowed a second <h1>, each with the reason. A debt register, not an allowlist: the gate FAILS if an
 * entry stops being needed (the page is back to one <h1>), so an exception cannot outlive its defect.
 *
 * /docs/components/page-header: the PageHeader demo renders the component, and PageHeader hard-codes an
 * <h1> for its title (packages/ui/src/components/page-header.tsx). Giving it a heading-level prop is a public
 * API change to @kinetixui/ui, out of scope for an SEO slice; it is in marketing/seo/SEO-BASELINE.md §6 (P2).
 */
const SECOND_H1 = { "/docs/components/page-header": "PageHeader demo renders the component's own <h1>" };

/** Routes that must never be noindex, whatever the sitemap says. */
const CORE = ["/", "/components", "/docs", "/docs/platforms", "/docs/installation", "/docs/tokens", "/blocks", "/iot"];

if (!existsSync(APP_DIR)) {
  console.error(`check:seo — no build at ${APP_DIR}. Run \`pnpm --filter @kinetixui/web build\` first.`);
  process.exit(2);
}

/* ----------------------------------------------------------------------------------------- inventory */

/**
 * The built pages, the files under public/, the non-HTML routes Next builds itself and the configured
 * redirects. Shared with `check:release-links`, which asks the same questions about release-note hrefs:
 * one inventory, so the two gates cannot come to different conclusions about what exists.
 */
const inventory = await siteInventory({ nextDir: NEXT_DIR, publicDir: PUBLIC_DIR });
const { pages, publicFiles, builtAssets } = inventory;

const sitemapXml = readFileSync(join(APP_DIR, "sitemap.xml.body"), "utf8");
const sitemapUrls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
const robotsTxt = readFileSync(join(APP_DIR, "robots.txt.body"), "utf8");

/* ---------------------------------------------------------------------------------------- extraction */

/** Whether `url` is on the site's own origin. Parsed, not prefix-matched: `https://kinetixui.com.evil.example` is not. */
const onOrigin = (url) => {
  try {
    return new URL(url).origin === ORIGIN;
  } catch {
    return false;
  }
};

const toPath = (url) => {
  if (!onOrigin(url)) return null;
  const rest = url.slice(ORIGIN.length);
  return rest === "" ? "/" : rest;
};

function extract(route, file) {
  const dom = new JSDOM(readFileSync(file, "utf8"));
  const d = dom.window.document;
  const meta = (sel) => d.querySelector(sel)?.getAttribute("content") ?? null;
  const robots = meta('meta[name="robots"]');
  const jsonld = [...d.querySelectorAll('script[type="application/ld+json"]')].map((s) => {
    try {
      return { ok: true, data: JSON.parse(s.textContent) };
    } catch (e) {
      return { ok: false, error: String(e.message ?? e) };
    }
  });
  const crumbNav = d.querySelector('nav[aria-label="Docs breadcrumb"], nav[aria-label="Breadcrumb"]');
  const crumbs = crumbNav
    ? [...crumbNav.querySelectorAll("a, span[data-crumb]")].map((el) => ({
        name: el.textContent.trim(),
        href: el.tagName === "A" ? el.getAttribute("href") : null,
      }))
    : null;
  const page = {
    route,
    title: d.querySelector("head > title")?.textContent.trim() ?? null,
    description: meta('meta[name="description"]'),
    canonical: d.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
    robots,
    noindex: /noindex/i.test(robots ?? ""),
    ogTitle: meta('meta[property="og:title"]'),
    ogDescription: meta('meta[property="og:description"]'),
    ogUrl: meta('meta[property="og:url"]'),
    ogImage: meta('meta[property="og:image"]'),
    twitterCard: meta('meta[name="twitter:card"]'),
    h1: [...d.querySelectorAll("h1")].map((h) => h.textContent.replace(/\s+/g, " ").trim()),
    related: [...d.querySelectorAll("[data-related-components] a[href]")].map((a) => a.getAttribute("href")),
    jsonld,
    crumbs,
    links: [...new Set([...d.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")))],
  };
  dom.window.close();
  return page;
}

const extracted = [...pages].map(([route, file]) => extract(route, file));
const byRoute = new Map(extracted.map((p) => [p.route, p]));
const indexable = extracted.filter((p) => p.route !== NOT_FOUND && !p.noindex);

/* -------------------------------------------------------------------------------------------- checks */

const failures = [];
const fail = (rule, where, msg) => failures.push({ rule, where, msg });

function dupes(field, rule) {
  const seen = new Map();
  for (const p of indexable) {
    const v = p[field];
    if (!v) continue;
    if (seen.has(v)) fail(rule, p.route, `same ${field} as ${seen.get(v)}: "${v}"`);
    else seen.set(v, p.route);
  }
}

for (const p of indexable) {
  if (!p.title) fail("title-missing", p.route, "no <title>");
  if (!p.description) fail("desc-missing", p.route, "no meta description");
  else if (/[`<>]/.test(p.description)) fail("desc-markup", p.route, `description carries markup: ${p.description}`);
  if (!p.canonical) fail("canonical-missing", p.route, "no rel=canonical");
  else {
    if (!onOrigin(p.canonical)) fail("canonical-host", p.route, `canonical ${p.canonical} is not on ${ORIGIN}`);
    if (/[?#]/.test(p.canonical)) fail("canonical-query", p.route, `canonical carries query/fragment: ${p.canonical}`);
    const path = toPath(p.canonical.replace(/[?#].*$/, ""));
    if (path !== null && path !== p.route) fail("canonical-self", p.route, `canonical points at ${path}`);
    if (p.ogUrl !== p.canonical) fail("og-url", p.route, `og:url ${p.ogUrl} ≠ canonical ${p.canonical}`);
  }
  const allowedH1 = SECOND_H1[p.route] ? 2 : 1;
  if (p.h1.length !== allowedH1)
    fail(
      "h1-count",
      p.route,
      SECOND_H1[p.route] && p.h1.length === 1
        ? "is back to one <h1>: remove its SECOND_H1 entry"
        : `${p.h1.length} <h1> elements: ${JSON.stringify(p.h1)}`,
    );
  if (!p.ogImage) fail("og-image", p.route, "no og:image");
  else {
    const img = toPath(p.ogImage.replace(/\?.*$/, ""));
    if (img === null) fail("og-image", p.route, `og:image off-origin: ${p.ogImage}`);
    else if (!publicFiles.has(img) && !builtAssets.has(img)) fail("og-image", p.route, `og:image ${img} is not a built image`);
  }
  for (const [i, block] of p.jsonld.entries()) {
    if (!block.ok) fail("jsonld-invalid", p.route, `JSON-LD #${i} does not parse: ${block.error}`);
    else if (!block.data["@context"] || !(block.data["@type"] || block.data["@graph"]))
      fail("jsonld-invalid", p.route, `JSON-LD #${i} has no @context/@type`);
  }
  if (p.route.startsWith("/docs/components/")) {
    // The page's own <h1> is the component's name. Compared loosely ("Input Otp" vs "Input OTP", "Multi Select"
    // vs "Multi-Select"): the rule is that search results name the component, not that two casings agree.
    const norm = (t) => (t ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
    const name = p.h1[0];
    const PLATFORM = /React|Angular|SwiftUI|Compose|Flutter/;
    if (!name || !norm(p.title).includes(norm(name))) fail("component-title", p.route, `title "${p.title}" does not name "${name}"`);
    if (!PLATFORM.test(p.title ?? "")) fail("component-title", p.route, `title "${p.title}" names no platform`);
    if (!name || !norm(p.description).includes(norm(name))) fail("component-title", p.route, `description does not name "${name}"`);
    const related = p.related.filter((h) => h.startsWith("/docs/components/") && h !== p.route);
    if (related.length === 0) fail("component-related", p.route, "no Related components links to other component pages");
  }
}
dupes("title", "title-duplicate");
dupes("description", "desc-duplicate");

/* Breadcrumbs: every BreadcrumbList must agree, item for item, with the linked crumbs a reader sees. */
for (const p of indexable) {
  const lists = p.jsonld
    .filter((b) => b.ok)
    .flatMap((b) => (b.data["@graph"] ?? [b.data]).filter((n) => n["@type"] === "BreadcrumbList"));
  if (lists.length === 0) continue;
  if (!p.crumbs) {
    fail("breadcrumb-mismatch", p.route, "BreadcrumbList JSON-LD but no visible breadcrumb");
    continue;
  }
  for (const list of lists) {
    const items = list.itemListElement ?? [];
    const badPos = items.findIndex((e, i) => e["@type"] !== "ListItem" || e.position !== i + 1);
    if (badPos !== -1) fail("breadcrumb-mismatch", p.route, `BreadcrumbList item ${badPos + 1} is not a ListItem at position ${badPos + 1}`);
    const ld = items.map((e) => ({ name: e.name, path: e.item ? toPath(e.item) : null }));
    const visible = p.crumbs.map((c) => ({ name: c.name, path: c.href }));
    const same =
      ld.length === visible.length &&
      ld.every((e, i) => e.name.toLowerCase() === visible[i].name.toLowerCase() && (e.path ?? null) === (visible[i].path ?? null));
    if (!same) fail("breadcrumb-mismatch", p.route, `JSON-LD ${JSON.stringify(ld)} ≠ visible ${JSON.stringify(visible)}`);
  }
}

/* Use-case pages: each one must carry the trail back to the hub, both visible and as BreadcrumbList JSON-LD. */
for (const p of indexable.filter((x) => x.route.startsWith("/use-cases/"))) {
  const hasList = p.jsonld.some((b) => b.ok && (b.data["@graph"] ?? [b.data]).some((n) => n["@type"] === "BreadcrumbList"));
  if (!p.crumbs?.length) fail("breadcrumb-missing", p.route, "no visible breadcrumb");
  else if (p.crumbs[0].href !== "/capabilities") fail("breadcrumb-missing", p.route, `the trail starts at ${p.crumbs[0].href ?? "nothing"}, not the hub`);
  else if (!hasList) fail("breadcrumb-missing", p.route, "no BreadcrumbList JSON-LD");
}

/* Sitemap. */
const sitemapPaths = new Set();
for (const url of sitemapUrls) {
  if (/[?#]/.test(url)) fail("sitemap-bad-url", url, "sitemap URL carries query/fragment");
  const path = toPath(url);
  if (path === null) {
    fail("sitemap-bad-url", url, `sitemap URL is not on ${ORIGIN}`);
    continue;
  }
  const clean = path.replace(/[?#].*$/, "");
  sitemapPaths.add(clean);
  const page = byRoute.get(clean);
  if (!page) fail("sitemap-missing-page", url, "no built page for this sitemap URL");
  else if (page.noindex) fail("sitemap-bad-url", url, "sitemap lists a noindex page");
  if (/^\/(r|_next|api)\//.test(clean) || clean === NOT_FOUND) fail("sitemap-bad-url", url, "utility route in sitemap");
}
for (const p of indexable) {
  if (!sitemapPaths.has(p.route)) fail("sitemap-omits", p.route, "indexable page missing from sitemap");
}

/* Noindex on important pages. */
for (const route of new Set([...CORE, ...sitemapPaths])) {
  const p = byRoute.get(route);
  if (p?.noindex) fail("noindex-important", route, `robots meta is "${p.robots}"`);
}

/* robots.txt. */
if (!robotsTxt.includes(`Sitemap: ${ORIGIN}/sitemap.xml`)) fail("robots", "/robots.txt", "sitemap line missing or wrong");
for (const line of robotsTxt.split("\n").filter((l) => /^disallow:/i.test(l))) {
  const rule = line.split(":")[1].trim();
  if (rule === "/" || (rule && [...pages.keys()].some((r) => r !== NOT_FOUND && r.startsWith(rule))))
    fail("robots", "/robots.txt", `"${line}" blocks page routes`);
}

/* Internal links. */
const linkOk = (href) => unresolvedPath(inventory, href) === null;
for (const p of extracted) {
  if (p.route === NOT_FOUND) continue;
  for (const href of p.links) {
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    if (!linkOk(href)) fail("link-broken", p.route, `→ ${href}`);
  }
}

/*
 * Parent routes. Truncating a URL to its parent is something readers and crawlers both do, and every nested
 * route on this site publishes its own parent as a path: `/use-cases/commerce` implies `/use-cases`,
 * `/docs/components/button` implies `/docs/components`. Neither existed until this rule was written; nothing
 * caught them, because `link-broken` only sees hrefs that are actually in the HTML and a parent nobody links
 * is a path nobody wrote down. So the check is derived from the route tree itself rather than from the links:
 * every ancestor of a built route must resolve to a built page or to a redirect in next.config.mjs.
 *
 * PARENT_404 is a debt register, not an allowlist: an entry whose parent now resolves FAILS, so an exception
 * cannot outlive the defect it was written for. It is empty, and the intent is that it stays that way --
 * a new nested route gets a parent or a redirect in the same change.
 */
const PARENT_404 = {};
// one entry per missing parent, not per child: 109 component pages share one hole, and 109 lines would hide it
const orphanedParents = new Map();
for (const route of pages.keys()) {
  if (route === NOT_FOUND) continue;
  const parts = route.split("/").filter(Boolean);
  for (let i = 1; i < parts.length; i++) {
    const parent = "/" + parts.slice(0, i).join("/");
    if (pages.has(parent) || redirectSources.has(parent)) continue;
    (orphanedParents.get(parent) ?? orphanedParents.set(parent, []).get(parent)).push(route);
  }
}
for (const [parent, children] of [...orphanedParents].sort()) {
  if (parent in PARENT_404) continue;
  const n = children.length;
  fail("route-parent", parent, `no page and no redirect, but ${n} route${n === 1 ? " is" : "s are"} published under it (e.g. ${children[0]})`);
}
for (const [parent, why] of Object.entries(PARENT_404))
  if (!orphanedParents.has(parent)) fail("route-parent", parent, `registered as a known 404 ("${why}") but it resolves now — drop the entry`);

/* Orphans: every indexable page must be reachable by a link from at least one other page. */
const inbound = new Map();
for (const p of extracted) {
  if (p.route === NOT_FOUND) continue;
  for (const href of p.links) {
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    const target = href.replace(/[?#].*$/, "") || "/";
    if (target !== p.route) inbound.set(target, (inbound.get(target) ?? 0) + 1);
  }
}
for (const p of indexable) if (!inbound.get(p.route)) fail("orphan", p.route, "no other page links here");

/* --------------------------------------------------------------------------------------------- report */

if (reportPath) {
  writeFileSync(
    reportPath,
    JSON.stringify({ sitemap: sitemapUrls, robots: robotsTxt, pages: extracted.map(({ links, ...rest }) => ({ ...rest, linkCount: links.length })) }, null, 2),
  );
}

const counts = failures.reduce((acc, f) => ((acc[f.rule] = (acc[f.rule] ?? 0) + 1), acc), {});
console.log(
  `check:seo — ${extracted.length} built pages, ${indexable.length} indexable, ${sitemapUrls.length} sitemap URLs, ` +
    `${extracted.reduce((n, p) => n + p.links.filter((h) => h.startsWith("/")).length, 0)} internal links checked`,
);
if (failures.length) {
  for (const [rule, n] of Object.entries(counts)) console.log(`  ✗ ${rule}: ${n}`);
  const limit = args.includes("--all") ? Infinity : 40;
  for (const f of failures.slice(0, limit)) console.log(`    [${f.rule}] ${f.where} — ${f.msg}`);
  if (failures.length > limit) console.log(`    … ${failures.length - limit} more (--all to list)`);
  process.exit(1);
}
console.log("  ✓ all SEO rules pass");
