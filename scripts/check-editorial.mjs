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
  .filter((p) => !p.noindex);
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
for (const name of PLATFORM_PAGES) {
  const file = join(DOCS_SRC, name, "page.mdx");
  const lines = readFileSync(file, "utf8").split("\n");
  let fenced = false;
  lines.forEach((line, i) => {
    if (line.trimStart().startsWith("```")) fenced = !fenced;
    if (fenced) return;
    for (const m of line.matchAll(COUNT)) fail("count-hardcoded", `docs/${name}/page.mdx:${i + 1}`, `typed count "${m[0]}"`);
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

/* --------------------------------------------------------------------------------------------- report */

const editorialPages = readdirSync(componentDir).filter((s) => existsSync(join(componentDir, s, "page.mdx")) && readFileSync(join(componentDir, s, "page.mdx"), "utf8").includes("<ComponentIntro")).length;
console.log(
  `check:editorial — ${editorialPages} component pages with editorial copy, ${PLATFORM_PAGES.length} platform pages scanned for typed counts, ` +
    `${owners.size} primary intents, ${others.length} non-component pages compared`,
);
if (failures.length) {
  const counts = failures.reduce((acc, f) => ((acc[f.rule] = (acc[f.rule] ?? 0) + 1), acc), {});
  for (const [rule, n] of Object.entries(counts)) console.log(`  ✗ ${rule}: ${n}`);
  for (const f of failures.slice(0, 40)) console.log(`    [${f.rule}] ${f.where} — ${f.msg}`);
  process.exit(1);
}
console.log("  ✓ all editorial rules pass");
