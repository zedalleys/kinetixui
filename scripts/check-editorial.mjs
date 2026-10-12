/**
 * Editorial gate for SEO Phase 2: the copy written to help search visitors, checked where it can go wrong.
 *
 * `check:seo` proves the technical layer (titles, canonicals, sitemap, links). This proves the editorial layer on
 * top of it, from two inputs: the source (the intent map, the editorial data, the platform pages' MDX) and the
 * production build (`apps/web/.next/server/app/**.html`, the same files `check:seo` reads).
 *
 *   pnpm --filter @kinetixui/web build && pnpm check:editorial
 *
 * Rules (each has a negative control in scripts/editorial-negative-controls.mjs):
 *
 *   intro-missing       a page whose source renders <ComponentIntro> has no intro in its built HTML
 *   intro-empty         the built intro has fewer than 12 words
 *   intro-boilerplate   the built intro or the page description uses a stock phrase (BOILERPLATE)
 *   guide-links         a built component guide links no other component page
 *   count-hardcoded     a platform page's MDX types a component count instead of rendering it from the manifest
 *   intent-duplicate    two routes in SEARCH-INTENT-MAP.md claim the same primary intent
 *   guide-canonical     a guide (draft or published) has no self-canonical
 *   guide-h1            a guide's H1 is not its registry title
 *   guide-product-links a guide links fewer than two product pages (/docs/…, /components, /blocks)
 *   guide-cta           a guide does not have exactly one primary CTA, or it points off-site
 *   guide-pillar        the pillar does not link every supporting guide, or a supporting guide does not link the pillar
 *   draft-indexed       a draft guide is indexable, is in the sitemap, or carries article JSON-LD
 *   draft-linked        an indexable page (a published guide included) links to a draft guide
 *   guide-date          a published guide has no datePublished in its TechArticle JSON-LD
 *   guide-intent        a guide's primary intent is not the one SEARCH-INTENT-MAP.md assigns to its route
 *   near-duplicate      two indexable non-component pages have near-identical titles or descriptions
 *                       (word-set overlap ≥ 0.8; component pages are excluded because their titles share a
 *                       deliberate template and differ by the component's name)
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, resolve } from "node:path";

const require = createRequire(resolve("apps/web/package.json"));
const { JSDOM } = require("jsdom");

const APP_DIR = resolve("apps/web/.next/server/app");
const DOCS_SRC = resolve("apps/web/src/app/docs");
const INTENT_MAP = resolve("marketing/seo/SEARCH-INTENT-MAP.md");

if (!existsSync(APP_DIR)) {
  console.error(`check:editorial — no build at ${APP_DIR}. Run \`pnpm --filter @kinetixui/web build\` first.`);
  process.exit(2);
}

const { BOILERPLATE } = await import(resolve("apps/web/src/lib/component-editorial.ts"));
const { GUIDES, PILLAR } = await import(resolve("apps/web/src/lib/guides-data.ts"));
const GUIDE_ROUTES = new Set(GUIDES.map((g) => `/guides/${g.slug}`));

const failures = [];
const fail = (rule, where, msg) => failures.push({ rule, where, msg });
const words = (s) => (s ?? "").split(/\s+/).filter(Boolean);
const boilerplate = (s) => BOILERPLATE.find((re) => re.test(s ?? ""));

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
}

/* ----------------------------------------------------------------------------------------- built pages */

const built = new Map(
  walk(APP_DIR)
    .filter((f) => f.endsWith(".html"))
    .map((f) => {
      const r = "/" + relative(APP_DIR, f).replace(/\.html$/, "");
      return [r === "/index" ? "/" : r, f];
    }),
);

function read(route) {
  const dom = new JSDOM(readFileSync(built.get(route), "utf8"));
  const d = dom.window.document;
  const page = {
    route,
    title: d.querySelector("head > title")?.textContent.trim() ?? "",
    description: d.querySelector('meta[name="description"]')?.getAttribute("content") ?? "",
    noindex: /noindex/i.test(d.querySelector('meta[name="robots"]')?.getAttribute("content") ?? ""),
    intro: d.querySelector("[data-component-intro]")?.textContent.replace(/\s+/g, " ").trim() ?? null,
    guideLinks: [...d.querySelectorAll("[data-component-guide] a[href^='/docs/components/']")].map((a) => a.getAttribute("href")),
    hasGuide: Boolean(d.querySelector("[data-component-guide]")),
    canonical: d.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
    h1: [...d.querySelectorAll("h1")].map((h) => h.textContent.replace(/\s+/g, " ").trim()),
    links: [...new Set([...d.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")))],
    ctas: [...d.querySelectorAll("[data-guide-cta]")].map((a) => a.getAttribute("href")),
    jsonld: [...d.querySelectorAll('script[type="application/ld+json"]')].flatMap((el) => {
      try {
        const data = JSON.parse(el.textContent);
        return data["@graph"] ?? [data];
      } catch {
        return [];
      }
    }),
  };
  dom.window.close();
  return page;
}

/* Component pages with editorial copy: the source decides which pages must have it. */
const componentDir = join(DOCS_SRC, "components");
for (const slug of readdirSync(componentDir)) {
  const src = join(componentDir, slug, "page.mdx");
  if (!existsSync(src) || !readFileSync(src, "utf8").includes("<ComponentIntro")) continue;
  const route = `/docs/components/${slug}`;
  if (!built.has(route)) {
    fail("intro-missing", route, "page source renders <ComponentIntro> but there is no built page");
    continue;
  }
  const p = read(route);
  if (p.intro === null) fail("intro-missing", route, "no [data-component-intro] in the built HTML");
  else if (words(p.intro).length < 12) fail("intro-empty", route, `intro has ${words(p.intro).length} words: "${p.intro}"`);
  for (const [field, text] of [["intro", p.intro], ["description", p.description]]) {
    const re = boilerplate(text);
    if (re) fail("intro-boilerplate", route, `${field} matches ${re}: "${text}"`);
  }
  if (!p.hasGuide) fail("guide-links", route, "no [data-component-guide] section");
  else if (!p.guideLinks.some((h) => h !== route)) fail("guide-links", route, "the guide links no other component page");
}

/* Guides: the content cluster. Drafts are built (so they can be reviewed) but must stay out of search entirely. */
const sitemap = readFileSync(join(APP_DIR, "sitemap.xml.body"), "utf8");
const PRODUCT = /^\/(docs(\/|$)|components$|blocks$)/;
for (const g of GUIDES) {
  const route = `/guides/${g.slug}`;
  if (!built.has(route)) {
    fail("guide-canonical", route, "listed in GUIDES but no page was built");
    continue;
  }
  const p = read(route);
  if (p.canonical !== `https://kinetixui.com${route}`) fail("guide-canonical", route, `canonical is ${p.canonical}`);
  if (p.h1.length !== 1 || p.h1[0] !== g.title) fail("guide-h1", route, `H1 ${JSON.stringify(p.h1)} ≠ "${g.title}"`);
  const internal = p.links.filter((h) => h.startsWith("/") && !h.startsWith("//"));
  const product = new Set(internal.map((h) => h.replace(/[?#].*$/, "")).filter((h) => PRODUCT.test(h)));
  if (product.size < 2) fail("guide-product-links", route, `links ${product.size} product page(s): ${[...product].join(", ") || "none"}`);
  if (p.ctas.length !== 1) fail("guide-cta", route, `${p.ctas.length} primary CTAs`);
  else if (!p.ctas[0].startsWith("/") || p.ctas[0].startsWith("//")) fail("guide-cta", route, `CTA leaves the site: ${p.ctas[0]}`);
  const bodyLinks = (target) => {
    const html = readFileSync(built.get(route), "utf8");
    // the prose only: not the "part of …" line under the H1, not the shared "Related reading" footer
    const body = html.split("data-guide-related")[0].replace(/<p data-guide-meta[\s\S]*?<\/p>/, "");
    return body.includes(`href="${target}"`);
  };
  if (g.role === "supporting" && !bodyLinks(`/guides/${PILLAR.slug}`)) fail("guide-pillar", route, "the body does not link back to the pillar");
  // a published pillar links the published supporting guides (a draft one would trip draft-linked); a draft pillar, all
  if (g.role === "pillar")
    for (const s of GUIDES.filter((x) => x.role === "supporting" && (g.status === "draft" || x.status === "published")))
      if (!bodyLinks(`/guides/${s.slug}`)) fail("guide-pillar", route, `the body does not link ${s.slug}`);
  const article = p.jsonld.find((n) => n["@type"] === "TechArticle" || n["@type"] === "Article");
  if (g.status === "draft") {
    if (!p.noindex) fail("draft-indexed", route, "draft guide is indexable");
    if (sitemap.includes(`<loc>https://kinetixui.com${route}</loc>`)) fail("draft-indexed", route, "draft guide is in the sitemap");
    if (article) fail("draft-indexed", route, "draft guide carries article JSON-LD");
  } else {
    if (p.noindex) fail("draft-indexed", route, "published guide is noindex");
    if (!article?.datePublished) fail("guide-date", route, "published guide has no TechArticle datePublished");
  }
}
const drafts = new Set(GUIDES.filter((g) => g.status === "draft").map((g) => `/guides/${g.slug}`));
for (const route of built.keys()) {
  if (route === "/_not-found" || drafts.has(route)) continue; // published guides are checked too
  const p = read(route);
  if (p.noindex && !GUIDE_ROUTES.has(route)) continue; // a guide registered as published is checked even if built noindex
  for (const h of p.links) if (drafts.has(h.replace(/[?#].*$/, ""))) fail("draft-linked", route, `links draft guide ${h}`);
}

/* Near-identical titles and descriptions among the indexable pages that are not component pages. */
const jaccard = (a, b) => {
  const A = new Set(words(a.toLowerCase().replace(/[^a-z0-9\s]/g, " ")));
  const B = new Set(words(b.toLowerCase().replace(/[^a-z0-9\s]/g, " ")));
  const inter = [...A].filter((w) => B.has(w)).length;
  return inter / (A.size + B.size - inter || 1);
};
const others = [...built.keys()]
  .filter((r) => r !== "/_not-found" && !r.startsWith("/docs/components/"))
  .map(read)
  .filter((p) => !p.noindex || GUIDE_ROUTES.has(p.route)); // draft guides too: they are about to be published
for (const field of ["title", "description"]) {
  for (let i = 0; i < others.length; i++)
    for (let j = i + 1; j < others.length; j++) {
      const [a, b] = [others[i], others[j]];
      if (!a[field] || !b[field] || a[field] === b[field]) continue; // exact duplicates are check:seo's rule
      const score = jaccard(a[field], b[field]);
      if (score >= 0.8) fail("near-duplicate", `${a.route} ↔ ${b.route}`, `${field}s overlap ${score.toFixed(2)}`);
    }
}

/* --------------------------------------------------------------------------------------------- source */

/*
 * Platform pages render every count from the manifest (<PlatformCountInline>, <ComponentTotalInline>, the
 * at-a-glance block). A typed number next to "components" or "catalogue" is a count that will go stale the day
 * a port lands, as Angular's did with each wave.
 */
const PLATFORM_PAGES = ["angular", "swiftui", "compose", "flutter", "platforms", "installation"];
const COUNT = /\b\d{1,3}\s*(?:of(?: the)? \d{1,3}\b|(?:React |catalogue |Angular |native )?(?:components|catalogue entries|entries|widgets|views|composables)\b)/gi;
const GUIDES_SRC = resolve("apps/web/src/app/guides");
const COUNT_FILES = [
  ...PLATFORM_PAGES.map((name) => [`docs/${name}/page.mdx`, join(DOCS_SRC, name, "page.mdx")]),
  ...GUIDES.map((g) => [`guides/${g.slug}/page.mdx`, join(GUIDES_SRC, g.slug, "page.mdx")]),
];
for (const [name, file] of COUNT_FILES) {
  const lines = readFileSync(file, "utf8").split("\n");
  let fenced = false;
  lines.forEach((line, i) => {
    if (line.trimStart().startsWith("```")) fenced = !fenced;
    if (fenced) return;
    for (const m of line.matchAll(COUNT)) fail("count-hardcoded", `${name}:${i + 1}`, `typed count "${m[0]}"`);
  });
}

/* Search intent map: one primary intent per route. */
const map = readFileSync(INTENT_MAP, "utf8");
const owners = new Map();
for (const line of map.split("\n")) {
  const cells = line.split("|").map((c) => c.trim());
  // | `route` | primary | secondary | stage | next |
  if (cells.length < 6 || !/^`\/[^`]*`/.test(cells[1] ?? "")) continue;
  const route = cells[1].match(/^`([^`]+)`/)[1];
  const primary = (cells[2].match(/\*\*([^*]+)\*\*/)?.[1] ?? cells[2])
    .toLowerCase()
    .replace(/`[^`]*`/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!primary) continue;
  if (owners.has(primary)) fail("intent-duplicate", `${owners.get(primary)} ↔ ${route}`, `both claim "${primary}"`);
  else owners.set(primary, route);
}
const ownerOf = new Map([...owners].map(([intent, route]) => [route, intent]));
for (const g of GUIDES) {
  const route = `/guides/${g.slug}`;
  const want = g.primaryIntent.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  if (ownerOf.get(route) !== want) fail("guide-intent", route, `map says "${ownerOf.get(route) ?? "(no row)"}", GUIDES says "${want}"`);
}

/* --------------------------------------------------------------------------------------------- report */

const editorialPages = readdirSync(componentDir).filter((s) => existsSync(join(componentDir, s, "page.mdx")) && readFileSync(join(componentDir, s, "page.mdx"), "utf8").includes("<ComponentIntro")).length;
console.log(
  `check:editorial — ${editorialPages} component pages with editorial copy, ${PLATFORM_PAGES.length} platform pages scanned for typed counts, ` +
    `${GUIDES.length} guides (${drafts.size} draft), ${owners.size} primary intents, ${others.length} non-component pages compared`,
);
if (failures.length) {
  const counts = failures.reduce((acc, f) => ((acc[f.rule] = (acc[f.rule] ?? 0) + 1), acc), {});
  for (const [rule, n] of Object.entries(counts)) console.log(`  ✗ ${rule}: ${n}`);
  for (const f of failures.slice(0, 40)) console.log(`    [${f.rule}] ${f.where} — ${f.msg}`);
  process.exit(1);
}
console.log("  ✓ all editorial rules pass");
