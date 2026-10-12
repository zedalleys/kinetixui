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
 *
 * Publication rules (SEO Phase 3; the operator procedure is marketing/seo/GUIDE-PUBLISH-RUNBOOK.md). They hold in
 * both states, all drafts and all published, so the gate guards the cluster before and after it goes live:
 *
 *   cluster-partial     the guides do not all share one status: the cluster publishes together or not at all
 *   cluster-date        published guides carry different datePublished values (one release, one real date)
 *   guide-date          (also) a draft carries a datePublished, or a published guide's registry date is not ISO
 *                       or differs from its TechArticle's
 *   sitemap-state       a published guide is missing from the sitemap (a draft in it is draft-indexed)
 *   further-reading     a docs page's "Further reading" line does not show exactly the published guides it names,
 *                       or a published guide is named by no docs page's "Further reading"
 *   guide-cta           (also) the built CTA does not point where the registry says
 *   pillar-proof        the pillar's body stops linking the proof: /docs/platforms, /docs/tokens, a platform page
 *   count-hardcoded     (also) a guide's registry title or description types a component count
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
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const PILLAR_PROOF = ["/docs/platforms", "/docs/tokens"];
const PLATFORM_ROUTES = ["/docs/angular", "/docs/swiftui", "/docs/compose", "/docs/flutter"];
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
  else if (p.ctas[0] !== g.cta.href) fail("guide-cta", route, `CTA points to ${p.ctas[0]}, the registry says ${g.cta.href}`);
  const bodyLinks = (target) => {
    const html = readFileSync(built.get(route), "utf8");
    // the prose only: not the "part of …" line under the H1, not the CTA button, not the shared "Related reading" footer
    const body = html
      .split("data-guide-related")[0]
      .replace(/<p data-guide-meta[\s\S]*?<\/p>/, "")
      .replace(/<a[^>]*data-guide-cta[^>]*>/g, "");
    return body.includes(`href="${target}"`);
  };
  if (g.role === "supporting" && !bodyLinks(`/guides/${PILLAR.slug}`)) fail("guide-pillar", route, "the body does not link back to the pillar");
  // a published pillar links the published supporting guides (a draft one would trip draft-linked); a draft pillar, all
  if (g.role === "pillar")
    for (const s of GUIDES.filter((x) => x.role === "supporting" && (g.status === "draft" || x.status === "published")))
      if (!bodyLinks(`/guides/${s.slug}`)) fail("guide-pillar", route, `the body does not link ${s.slug}`);
  // the pillar is the bridge from the architecture question to the evidence; without these it is an essay
  if (g.role === "pillar") {
    for (const proof of PILLAR_PROOF) if (!bodyLinks(proof)) fail("pillar-proof", route, `the body does not link ${proof}`);
    if (!PLATFORM_ROUTES.some(bodyLinks)) fail("pillar-proof", route, `the body links none of ${PLATFORM_ROUTES.join(", ")}`);
  }
  const article = p.jsonld.find((n) => n["@type"] === "TechArticle" || n["@type"] === "Article");
  if (g.status === "draft") {
    if (!p.noindex) fail("draft-indexed", route, "draft guide is indexable");
    if (sitemap.includes(`<loc>https://kinetixui.com${route}</loc>`)) fail("draft-indexed", route, "draft guide is in the sitemap");
    if (article) fail("draft-indexed", route, "draft guide carries article JSON-LD");
    if (g.datePublished) fail("guide-date", route, `draft carries datePublished ${g.datePublished}; a date is set only when it goes live`);
  } else {
    if (p.noindex) fail("draft-indexed", route, "published guide is noindex");
    if (!article?.datePublished) fail("guide-date", route, "published guide has no TechArticle datePublished");
    else if (!ISO_DATE.test(g.datePublished ?? "") || article.datePublished !== g.datePublished)
      fail("guide-date", route, `registry datePublished "${g.datePublished}" vs TechArticle "${article.datePublished}"`);
    if (!sitemap.includes(`<loc>https://kinetixui.com${route}</loc>`)) fail("sitemap-state", route, "published guide is not in the sitemap");
  }
}

/* Publication is one act for the whole cluster: the guides cross-link in their prose, so a partial cluster either
 * links drafts or reads as an essay with holes. Checked from the registry, independent of what was built. */
const statuses = new Set(GUIDES.map((g) => g.status));
if (statuses.size > 1)
  fail("cluster-partial", "guides-data.ts", GUIDES.map((g) => `${g.slug}=${g.status}`).join(", "));
const dates = new Set(GUIDES.filter((g) => g.status === "published").map((g) => g.datePublished));
if (dates.size > 1) fail("cluster-date", "guides-data.ts", `published guides carry ${dates.size} different dates: ${[...dates].join(", ")}`);

/* "Further reading" on docs pages: the source names guides; the build must show exactly the published ones. */
const named = new Set();
for (const file of walk(resolve("apps/web/src/app")).filter((f) => f.endsWith("page.mdx"))) {
  for (const m of readFileSync(file, "utf8").matchAll(/<FurtherReading guides=\{\[([^\]]*)\]\}/g)) {
    const slugs = [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    const route = "/" + relative(resolve("apps/web/src/app"), file).replace(/\/page\.mdx$/, "");
    slugs.forEach((x) => named.add(x));
    if (!built.has(route)) continue;
    const want = slugs.filter((x) => GUIDES.find((g) => g.slug === x)?.status === "published").map((x) => `/guides/${x}`);
    const html = readFileSync(built.get(route), "utf8");
    const line = html.match(/<p[^>]*data-further-reading[^>]*>[\s\S]*?<\/p>/)?.[0] ?? "";
    const got = [...line.matchAll(/href="([^"]+)"/g)].map((x) => x[1]);
    if (want.join() !== got.join()) fail("further-reading", route, `shows [${got.join(", ")}], published guides it names: [${want.join(", ")}]`);
  }
}
for (const g of GUIDES.filter((x) => x.status === "published"))
  if (!named.has(g.slug)) fail("further-reading", `/guides/${g.slug}`, "published, but no docs page names it in <FurtherReading>");
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

for (const g of GUIDES)
  for (const [field, text] of [["title", g.title], ["searchTitle", g.searchTitle], ["description", g.description]])
    for (const m of (text ?? "").matchAll(COUNT)) fail("count-hardcoded", `guides-data.ts ${g.slug}.${field}`, `typed count "${m[0]}"`);

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
