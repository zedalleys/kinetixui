/**
 * Which analytics event a real interaction on the site should produce. Pure classification plus the few `track`
 * calls that need it — no React, no PostHog. UI code stays a one-liner and the rules live (and are tested) here.
 *
 * Principle: ONE semantic event per user action. The more specific event wins — a click on our GitHub repo is
 * `github_clicked`, not also `external_link_clicked`; a docs page is one of `installation_viewed` /
 * `changelog_viewed` / `component_viewed` / `docs_viewed`, never two. `$pageview` (navigation) is separate and
 * unchanged.
 *
 * Nothing here ever reads a copied string, a URL or visible text into an event: text and URLs are only INSPECTED
 * to choose an event and a known identifier (a package name, a hostname), and are never forwarded.
 */
import {
  ANALYTICS_CTA_TARGETS,
  ANALYTICS_PLATFORMS,
  ANALYTICS_SOURCES,
  analytics,
  cleanPath,
  type AnalyticsCtaTarget,
  type AnalyticsLocation,
  type AnalyticsPlatform,
  type AnalyticsSource,
} from "./analytics";
import { PACKAGE_NAMES, PACKAGES } from "./packages";
import { publicRoutes } from "./seo";
import { componentDocs, siteConfig } from "./site";

/* ------------------------------------------------------------------ where are we */

const COMPONENT_SLUGS: ReadonlySet<string> = new Set(componentDocs.map((c) => c.href.split("/").pop() ?? ""));
const PUBLIC_ROUTES: ReadonlySet<string> = new Set(publicRoutes());

/** "/docs/components/button" → "button", but only for a component the docs actually have. */
export function componentSlugFor(pathname: string): string | null {
  const m = /^\/docs\/components\/([a-z0-9-]+)$/.exec(pathname);
  return m && COMPONENT_SLUGS.has(m[1]!) ? m[1]! : null;
}

/** The analytics `source` for a page, or null for a page that has none (never invent one). */
export function sourceForPath(pathname: string): AnalyticsSource | null {
  if (pathname === "/") return "homepage";
  if (pathname === "/docs/installation") return "installation_page";
  if (pathname === "/docs/changelog") return "changelog_page";
  if (pathname.startsWith("/docs/components/")) return "component_page";
  if (pathname === "/docs" || pathname.startsWith("/docs/")) return "docs_page";
  if (pathname === "/components") return "components_gallery";
  return null;
}

/* ------------------------------------------------------------------ route views (semantic classification) */

/**
 * The semantic view event for a route, fired once per navigation by `AnalyticsProvider`. Only real, listed public
 * routes qualify, so a 404 at a docs-shaped URL is not counted as a docs view.
 */
export function trackRouteView(pathname: string): void {
  const path = cleanPath(pathname);
  if (!path) return;

  if (path === "/docs/installation") return analytics.track("installation_viewed", { source: "installation_page" });
  if (path === "/docs/changelog") return analytics.track("changelog_viewed", { source: "changelog_page" });

  const component = componentSlugFor(path);
  if (component) return analytics.track("component_viewed", { component, source: "component_page" });

  if ((path === "/docs" || path.startsWith("/docs/")) && PUBLIC_ROUTES.has(path)) {
    return analytics.track("docs_viewed", { page: path, source: "docs_page" });
  }
}

/* ------------------------------------------------------------------ CTAs (declared in markup, read by the listener) */

/**
 * Mark a link as a product CTA: `<Link href="/docs" {...ctaAttrs("homepage_hero", "get_started")}>`. Plain data
 * attributes, so a server-rendered page needs no client component for it. The provider's click listener reads them.
 */
export function ctaAttrs(source: AnalyticsSource, target: AnalyticsCtaTarget) {
  return { "data-analytics-cta": target, "data-analytics-source": source } as const;
}

const isMember = <T extends string>(list: readonly T[], value: string | null | undefined): value is T => !!value && (list as readonly string[]).includes(value);

/* ------------------------------------------------------------------ outbound links */

const REPO_PATH = new URL(siteConfig.repo).pathname.replace(/\/$/, ""); // "/zedalleys/kinetixui"

/**
 * External destinations worth their own event when they have no more specific one. A short, deliberate list,
 * derived from the site config rather than typed — attribution links (Radix, Lucide, Recharts) are not in it.
 */
const TRACKED_EXTERNAL_HOSTS: ReadonlySet<string> = new Set([new URL(siteConfig.figma).hostname.replace(/^www\./, "")]);

export type LinkEvent =
  | { event: "github_clicked" }
  | { event: "npm_clicked"; package: string }
  | { event: "external_link_clicked"; target: string };

/** Classify an absolute URL. Returns null for internal links and for external links we don't track. */
export function classifyLink(href: string, currentOrigin: string): LinkEvent | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.origin === currentOrigin) return null;

  const host = url.hostname.replace(/^www\./, "");

  // our repository (any page inside it), not GitHub in general
  if (host === "github.com" && (url.pathname === REPO_PATH || url.pathname.startsWith(`${REPO_PATH}/`))) return { event: "github_clicked" };

  // a KinetixUI package page on npm: /package/@kinetixui/ui
  if (host === "npmjs.com") {
    const name = decodeURIComponent(url.pathname).replace(/^\/package\//, "").replace(/\/$/, "");
    const known = PACKAGE_NAMES.find((p) => p === name || name.startsWith(`${p}/`));
    return known ? { event: "npm_clicked", package: known } : null;
  }

  if (TRACKED_EXTERNAL_HOSTS.has(host)) return { event: "external_link_clicked", target: host };
  return null;
}

/** Where a link sits, from the landmark it is in — the page, not the link text, decides. */
export function linkContext(anchor: Element, pathname: string): { source: AnalyticsSource; location: AnalyticsLocation } | null {
  if (anchor.closest("header")) return { source: "header", location: "primary_nav" };
  if (anchor.closest("footer")) return { source: "footer", location: "footer" };
  if (anchor.closest("aside")) return { source: "docs_sidebar", location: "sidebar" };
  const source = sourceForPath(pathname);
  return source ? { source, location: "content" } : null;
}

/**
 * Handle one click. Returns after at most one `track` call. A link declared as a CTA is a CTA (and nothing else);
 * otherwise an outbound link gets the most specific outbound event; ordinary internal links get nothing.
 */
export function trackLinkClick(anchor: HTMLAnchorElement, pathname: string, currentOrigin: string): void {
  const cta = anchor.getAttribute("data-analytics-cta");
  if (cta) {
    const source = anchor.getAttribute("data-analytics-source");
    if (isMember(ANALYTICS_CTA_TARGETS, cta) && isMember(ANALYTICS_SOURCES, source)) analytics.track("cta_clicked", { source, target: cta });
    return;
  }

  const link = classifyLink(anchor.href, currentOrigin);
  if (!link) return;
  const context = linkContext(anchor, pathname);
  if (!context) return;

  if (link.event === "github_clicked") analytics.track("github_clicked", context);
  else if (link.event === "npm_clicked") analytics.track("npm_clicked", { source: context.source, package: link.package });
  else analytics.track("external_link_clicked", { target: link.target, ...context });
}

/* ------------------------------------------------------------------ copied commands and code */

const SHELL_LANGUAGES: ReadonlySet<string> = new Set(["bash", "sh", "shell", "zsh", "console", "shellscript", "terminal"]);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

/** `npx @kinetixui/cli …`, `pnpm dlx @kinetixui/cli …`, `bunx @kinetixui/cli …` */
const CLI_COMMAND = new RegExp(`^(?:npx|bunx|pnpm dlx|yarn dlx)\\s+(?:-{1,2}[\\w-]+\\s+)*${escape(PACKAGES.cli)}(?:@\\S+)?(?:\\s|$)`);
/** `npm i …`, `pnpm add …`, `yarn add …`, `bun add …` */
const INSTALL_COMMAND = /^(?:npm|pnpm|yarn|bun)\s+(?:i|install|add)\b/;

export type CommandCopy = { event: "cli_command_copied"; package: string } | { event: "install_command_copied"; package: string };

/**
 * Decide which command a copied shell snippet is. The text is only inspected; the result carries a package name
 * from the known list and nothing from the snippet. Returns null for anything that isn't a KinetixUI command.
 */
export function classifyCommand(text: string, language: string | undefined): CommandCopy | null {
  if (!language || !SHELL_LANGUAGES.has(language)) return null;
  const lines = text
    .split("\n")
    .map((l) => l.trim().replace(/^\$\s*/, ""))
    .filter(Boolean);

  if (lines.some((l) => CLI_COMMAND.test(l))) return { event: "cli_command_copied", package: PACKAGES.cli };

  for (const line of lines) {
    if (!INSTALL_COMMAND.test(line)) continue;
    const known = PACKAGE_NAMES.find((p) => new RegExp(`(?:^|\\s)${escape(p)}(?:@\\S+)?(?:\\s|$)`).test(line));
    if (known) return { event: "install_command_copied", package: known };
  }
  return null;
}

const LANGUAGE_PLATFORM: Record<string, AnalyticsPlatform> = {
  tsx: "react",
  jsx: "react",
  ts: "react",
  typescript: "react",
  js: "react",
  javascript: "react",
  swift: "swiftui",
  kotlin: "compose",
  kt: "compose",
  dart: "flutter",
};

/** The platform a code fence's language belongs to, or null (css, json, bash… are not platforms). */
export function platformForLanguage(language: string | undefined): AnalyticsPlatform | null {
  const p = language ? LANGUAGE_PLATFORM[language] : undefined;
  return p && isMember(ANALYTICS_PLATFORMS, p) ? p : null;
}

/** The docs code-block ids used by `platform-code.ts` mapped to analytics platforms. */
export const PLATFORM_FROM_CODE_TAB = { react: "react", swift: "swiftui", kotlin: "compose", dart: "flutter" } as const satisfies Record<string, AnalyticsPlatform>;

/**
 * A fenced code block in the docs was copied. A KinetixUI command → the matching command event. Otherwise, on a
 * component's own page, a fence in a platform language → `component_code_copied`. Anything else (theme CSS, JSON,
 * an unrelated shell command) is not an activation signal and produces nothing.
 */
export function trackFenceCopy(text: string, language: string | undefined, pathname: string): void {
  const source = sourceForPath(pathname);
  const command = classifyCommand(text, language);
  if (command) {
    if (!source) return;
    if (command.event === "cli_command_copied") analytics.track("cli_command_copied", { source, package: command.package });
    else analytics.track("install_command_copied", { source, package: command.package });
    return;
  }

  const component = componentSlugFor(pathname);
  const platform = platformForLanguage(language);
  if (component && platform) analytics.track("component_code_copied", { component, platform, source: "component_page" });
}
