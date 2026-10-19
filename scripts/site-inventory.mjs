/**
 * The built site's inventory: which routes exist, which files are served, where a path redirects,
 * and which element ids a page actually carries.
 *
 * Every route on this site is prerendered (`○ Static` in `next build`), so `apps/web/.next/server/app`
 * is not a cache of the site — it IS the site, as a crawler and a reader receive it. That makes it the
 * only honest answer to "does /docs/motion exist?" and "does /docs/foundations have a #motion anchor?":
 *
 *   - a dynamic route is already materialised, so `/use-cases/commerce.html` exists and
 *     `/use-cases/finance.html` does not, exactly as `dynamicParams = false` and `generateStaticParams`
 *     decided — nothing here has to re-derive that from a registry, or guess with a wildcard
 *   - an id is whatever ended up in the HTML, whether rehype-slug made it from a Markdown heading or a
 *     component computed it at render time, so no slugging has to be reimplemented and kept in step
 *
 * This module exists because `check:seo` had all of it as locals and `check:release-links` needed the
 * same answers. The alternative was a second list of routes maintained by hand next to the first one,
 * which is the failure this is meant to prevent, not repeat.
 *
 * It reads the build; it never runs one. A caller that finds no build should say so and stop, rather
 * than skip itself quietly — a gate that passes because it could not look is worse than no gate.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** Next's own 404 route. It is a built page, so it has to be excluded explicitly everywhere. */
export const NOT_FOUND = "/_not-found";

export function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

/** `/docs/tokens#motion` → `/docs/tokens`; `#motion` and `""` → `/`. */
export const pathOf = (href) => href.replace(/[?#].*$/, "") || "/";

/** `/docs/tokens#motion` → `motion`; a href with no fragment → null. An empty `#` is not a fragment. */
export const fragmentOf = (href) => {
  const at = href.indexOf("#");
  return at === -1 || at === href.length - 1 ? null : href.slice(at + 1);
};

/**
 * A site-relative href, as opposed to an external URL, a mailto:, a protocol-relative `//host/path`
 * or a bare same-page `#anchor` (which names no route to resolve).
 */
export const isInternalHref = (href) => href.startsWith("/") && !href.startsWith("//");

export class MissingBuildError extends Error {
  constructor(appDir) {
    super(`No built site at ${appDir}. Run \`pnpm build:web\` first.`);
    this.name = "MissingBuildError";
    this.appDir = appDir;
  }
}

/**
 * Read the inventory out of a production build.
 *
 * Throws `MissingBuildError` when there is no build, so a caller decides between failing (a gate) and
 * skipping with a reason (a test that runs in jobs which do not build the site).
 */
export async function siteInventory({ nextDir = "apps/web/.next", publicDir = "apps/web/public", configPath = "apps/web/next.config.mjs" } = {}) {
  const appDir = join(resolve(nextDir), "server/app");
  if (!existsSync(appDir)) throw new MissingBuildError(appDir);
  const publicRoot = resolve(publicDir);

  const files = walk(appDir);
  const routeOf = (file) => {
    const r = "/" + relative(appDir, file).replace(/\.html$/, "");
    return r === "/index" ? "/" : r;
  };
  const pages = new Map(files.filter((f) => f.endsWith(".html")).map((f) => [routeOf(f), f]));
  /** Non-HTML routes Next builds itself (sitemap.xml, robots.txt, the metadata images). */
  const builtAssets = new Set(files.filter((f) => f.endsWith(".body")).map((f) => "/" + relative(appDir, f).replace(/\.body$/, "")));
  const publicFiles = existsSync(publicRoot) ? new Set(walk(publicRoot).map((f) => "/" + relative(publicRoot, f))) : new Set();

  /** Redirects, read from the same export next.config.mjs serves, so there is one mapping. */
  const { routeRedirects } = await import(pathToFileURL(resolve(configPath)).href);
  const redirects = new Map(routeRedirects.map((r) => [r.source, r.destination]));

  return { appDir, publicRoot, pages, builtAssets, publicFiles, redirects };
}

/**
 * Why an internal href does not resolve, or null when it does.
 *
 * The four ways a site-relative path can be real: a built page, a file under public/, a non-HTML route
 * Next built, or the source of a configured redirect.
 */
export function unresolvedPath(inventory, href) {
  const path = pathOf(href);
  if (inventory.pages.has(path) && path !== NOT_FOUND) return null;
  if (inventory.publicFiles.has(path) || inventory.builtAssets.has(path) || inventory.redirects.has(path)) return null;
  return `no built page, public file or redirect for ${path}`;
}

/** Back-compat shape for callers that only want the boolean. */
export const pathResolves = (inventory, href) => unresolvedPath(inventory, href) === null;

let JSDOM;
/** The element ids in a page's built HTML. Parsed, not pattern-matched: an `id="…"` inside the Flight payload is not an anchor. */
export function idsIn(html) {
  JSDOM ??= createRequire(resolve("apps/web/package.json"))("jsdom").JSDOM;
  const { document } = new JSDOM(html).window;
  return new Set([...document.querySelectorAll("[id]")].map((el) => el.id).filter(Boolean));
}

/**
 * The ids a href's target page carries, or null when no page can be read for it.
 *
 * A redirect is followed one hop, because the fragment a reader keeps is the destination's: `/colors#x`
 * lands on `/create`, so `#x` has to be an id there.
 */
export function idsForHref(inventory, href, cache = new Map()) {
  let path = pathOf(href);
  if (!inventory.pages.has(path) && inventory.redirects.has(path)) path = pathOf(inventory.redirects.get(path));
  const file = inventory.pages.get(path);
  if (!file) return null;
  if (!cache.has(path)) cache.set(path, idsIn(readFileSync(file, "utf8")));
  return cache.get(path);
}
