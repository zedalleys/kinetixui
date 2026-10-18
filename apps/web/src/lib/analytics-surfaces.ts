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
import { PLATFORMS, PLATFORM_DEFINITIONS, type Platform } from "./platform-parity";
import { SETUP_HREF, type CodeTab } from "./platform-tabs";
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
  if (pathname === "/blocks") return "blocks_gallery";
  if (pathname === "/iot") return "iot_page";
  if (pathname === "/demos/building-operations") return "building_operations_demo";
  if (pathname === "/capabilities") return "use_cases_hub";
  // only a use-case page that exists: a 404 at a use-case-shaped URL is not a use-case page
  if (pathname.startsWith("/use-cases/") && PUBLIC_ROUTES.has(pathname)) return "use_case_page";
  return null;
}

/* ------------------------------------------------------------------ route views (semantic classification) */

/**
 * A platform's own setup page → its platform, from the same `SETUP_HREF` every "Setup →" link uses. These pages keep
 * emitting `docs_viewed` (neither QE nor AI, analytics.md §3/§4); the platform only makes setup interest per platform
 * readable (BD-W4 F-06). React's setup page is /docs/installation, whose `installation_viewed` carries `react`.
 */
function setupPagePlatform(path: string): AnalyticsPlatform | null {
  const platform = PLATFORMS.find((p) => SETUP_HREF[p] === path && path !== "/docs/installation");
  return platform ? analyticsPlatformFor(platform) : null;
}

/**
 * The semantic view event for a route, fired once per navigation by `AnalyticsProvider`. Only real, listed public
 * routes qualify, so a 404 at a docs-shaped URL is not counted as a docs view.
 */
export function trackRouteView(pathname: string): void {
  const path = cleanPath(pathname);
  if (!path) return;

  if (path === "/docs/installation") return analytics.track("installation_viewed", { source: "installation_page", platform: "react" });
  if (path === "/docs/changelog") return analytics.track("changelog_viewed", { source: "changelog_page" });

  const component = componentSlugFor(path);
  if (component) return analytics.track("component_viewed", { component, source: "component_page" });

  if ((path === "/docs" || path.startsWith("/docs/")) && PUBLIC_ROUTES.has(path)) {
    const platform = setupPagePlatform(path);
    return analytics.track("docs_viewed", { page: path, source: "docs_page", ...(platform ? { platform } : {}) });
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

export type CommandCopy = { event: "cli_command_copied"; package: string } | { event: "install_command_copied"; package: string; platform?: AnalyticsPlatform };

/**
 * A published platform package → its platform (`@kinetixui/ui` → react, `@kinetixui/angular` → angular), from the
 * manifest's distribution coordinates. An npm install of one is that platform's install; tokens, the CLI and IoT
 * belong to no single platform and carry none (BD-W4 F-07: an Angular npm copy used to arrive without a platform).
 */
const PACKAGE_PLATFORM: ReadonlyMap<string, AnalyticsPlatform> = new Map(
  PLATFORMS.flatMap((p) => {
    const { published, coordinate } = PLATFORM_DEFINITIONS[p].distribution;
    const id = analyticsPlatformFor(p);
    return published && coordinate && id ? [[coordinate, id] as const] : [];
  }),
);

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
    if (known) {
      const platform = PACKAGE_PLATFORM.get(known);
      return platform ? { event: "install_command_copied", package: known, platform } : { event: "install_command_copied", package: known };
    }
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

/**
 * A manifest platform name ("SwiftUI", "Compose") as an analytics platform, or null.
 *
 * Lower-casing happens to map all five today, so the mapping is derived rather than listed — but the result
 * is checked against `ANALYTICS_PLATFORMS` before it is returned. A sixth manifest platform whose name does
 * not lower-case into the vocabulary therefore produces *no* platform rather than a new, unvalidated string
 * in the event stream. Silence is the safe failure; an invented dimension is not.
 */
export function analyticsPlatformFor(manifestPlatform: string | undefined): AnalyticsPlatform | null {
  const candidate = manifestPlatform?.toLowerCase();
  return candidate && isMember(ANALYTICS_PLATFORMS, candidate) ? candidate : null;
}

/* ------------------------------------------------------------------ native installs (no command to recognise) */

/**
 * The native ports are not on SwiftPM, Maven Central or pub.dev, so installing one is not a shell command: it is a
 * Package.swift dependency, a Gradle module registration, a pubspec dependency, or a git command that pins a
 * checkout. `classifyCommand` never matches any of those, so copying them used to be silent — native install
 * intent was invisible. Each rule below recognises one documented snippet shape. As with commands, the text is
 * only inspected; the event carries the platform's package identifier from the manifest and nothing else.
 */
const NATIVE_INSTALL: readonly { platform: Platform; language: ReadonlySet<string>; test: (text: string) => boolean }[] = [
  // .package(path: "Vendor/kinetixui/packages/ui-swiftui")
  { platform: "SwiftUI", language: new Set(["swift"]), test: (t) => /\.package\s*\(/.test(t) && t.includes(PLATFORM_DEFINITIONS.SwiftUI.dir) },
  // include(":kinetixui-ui") in settings, or implementation(project(":kinetixui-ui")) in the app module
  { platform: "Compose", language: new Set(["kotlin", "kt", "kts"]), test: (t) => /(?:include|project)\(\s*":kinetixui-ui"\s*\)/.test(t) },
  // a pubspec dependency on the package, by path or by git
  { platform: "Flutter", language: new Set(["yaml", "yml"]), test: (t) => new RegExp(`^\\s+${escape(PLATFORM_DEFINITIONS.Flutter.package)}:\\s*$`, "m").test(t) },
];

/** A native setup page → its platform. A git command that clones or pins this repository there installs that port. */
const SETUP_PAGE_PLATFORM: Readonly<Record<string, Platform>> = { "/docs/swiftui": "SwiftUI", "/docs/compose": "Compose", "/docs/flutter": "Flutter" };

export type NativeInstallCopy = { package: string; platform: AnalyticsPlatform };

/** Which native port a copied snippet installs, or null. Never reads anything from the snippet into the result. */
export function classifyNativeInstall(text: string, language: string | undefined, pathname: string): NativeInstallCopy | null {
  const lang = language?.toLowerCase();
  if (!lang) return null;
  let platform: Platform | undefined = NATIVE_INSTALL.find((r) => r.language.has(lang) && r.test(text))?.platform;
  if (!platform && SHELL_LANGUAGES.has(lang) && /^\s*\$?\s*git\s/m.test(text) && text.includes(REPO_PATH.slice(1))) {
    platform = SETUP_PAGE_PLATFORM[pathname];
  }
  if (!platform || !PLATFORMS.includes(platform)) return null;
  const id = analyticsPlatformFor(platform);
  return id ? { package: PLATFORM_DEFINITIONS[platform].package, platform: id } : null;
}

/** The docs code-block ids used by `platform-code.ts` mapped to analytics platforms. */
export const PLATFORM_FROM_CODE_TAB = { react: "react", angular: "angular", swift: "swiftui", kotlin: "compose", dart: "flutter" } as const satisfies Record<CodeTab, AnalyticsPlatform>;

/**
 * A fenced code block in the docs was copied. A KinetixUI command → the matching command event. Otherwise, on a
 * component's own page, a fence in a platform language → `component_code_copied`. Anything else (theme CSS, JSON,
 * an unrelated shell command) is not a measured copy and produces nothing.
 */
export function trackFenceCopy(text: string, language: string | undefined, pathname: string): void {
  const source = sourceForPath(pathname);
  const command = classifyCommand(text, language);
  if (command) {
    if (!source) return;
    if (command.event === "cli_command_copied") analytics.track("cli_command_copied", { source, package: command.package });
    else analytics.track("install_command_copied", { source, package: command.package, ...(command.platform ? { platform: command.platform } : {}) });
    return;
  }

  const native = classifyNativeInstall(text, language, pathname);
  if (native) {
    if (source) analytics.track("install_command_copied", { source, package: native.package, platform: native.platform });
    return;
  }

  const component = componentSlugFor(pathname);
  const platform = platformForLanguage(language);
  if (component && platform) analytics.track("component_code_copied", { component, platform, source: "component_page" });
}
