/**
 * KinetixUI product analytics — the ONE interface UI code uses.
 *
 * Components call `analytics.track(...)`; nothing outside `analytics-posthog.ts` knows PostHog exists, so the
 * vendor can change without touching a component. See `apps/web/ANALYTICS.md` for the rules.
 *
 * This file is deliberately small and has no runtime dependency: it holds the event contract, the config gate,
 * a property allowlist, and a tiny dispatcher that queues calls until a client is attached.
 */
import { siteConfig } from "./site";

/* ------------------------------------------------------------------ event contract */

/** The implementation platforms the site can attribute an event to. Not package managers — those are not platforms. */
export const ANALYTICS_PLATFORMS = ["react", "swiftui", "compose", "flutter"] as const;
export type AnalyticsPlatform = (typeof ANALYTICS_PLATFORMS)[number];

/**
 * Where on the site something happened. A closed union on purpose: a free-text `source` is how a label, a
 * search string or a name ends up in analytics. Add a member here when a real new surface is instrumented.
 */
export const ANALYTICS_SOURCES = [
  "header",
  "footer",
  "homepage_hero",
  "homepage",
  "docs_sidebar",
  "docs_page",
  "component_page",
  "components_gallery",
  "installation_page",
  "changelog_page",
  "not_found",
] as const;
export type AnalyticsSource = (typeof ANALYTICS_SOURCES)[number];

/** The position inside a surface. Stable identifiers, never visible text. */
export const ANALYTICS_LOCATIONS = ["hero", "primary_nav", "sidebar", "installation", "code_example", "platform_tabs", "component_header", "footer", "content"] as const;
export type AnalyticsLocation = (typeof ANALYTICS_LOCATIONS)[number];

/** What a product call-to-action is FOR — never its visible label and never its destination URL. */
export const ANALYTICS_CTA_TARGETS = ["get_started", "browse_components", "read_docs", "installation", "view_changelog"] as const;
export type AnalyticsCtaTarget = (typeof ANALYTICS_CTA_TARGETS)[number];

/**
 * Properties an event may carry. Every value is a short identifier — a slug, a package name, a hostname, a
 * version — never user text. Anything that is not (see `sanitizeProps`) is dropped before it leaves the browser.
 */
interface EventProps {
  /** which surface produced the event */
  source?: AnalyticsSource;
  /** finer position inside the surface */
  location?: AnalyticsLocation;
  /** a site path WITHOUT query string or hash: "/docs/installation" */
  page?: string;
  /** a component slug: "button", "data-grid" */
  component?: string;
  platform?: AnalyticsPlatform;
  /** an npm package name: "@kinetixui/cli" */
  package?: string;
  /** what was targeted: a destination name ("get_started") or a hostname ("github.com") — never a full URL */
  target?: string;
  /** a release version: "0.22.0" */
  version?: string;
}

/** Pick which properties an event takes, and which of them are required. */
type Shape<Required extends keyof EventProps, Optional extends keyof EventProps = never> = {
  [K in Required]-?: NonNullable<EventProps[K]>;
} & { [K in Optional]?: EventProps[K] };

/**
 * The funnel, as a contract. Only events Step 2 will actually fire are declared, and each names exactly the
 * properties it may carry. Adding an event is one line here; a call with an unknown event or property is a
 * compile error.
 */
export interface AnalyticsEvents {
  cta_clicked: { source: AnalyticsSource; target: AnalyticsCtaTarget };
  docs_viewed: Shape<"page", "source">;
  installation_viewed: Shape<never, "source" | "platform">;
  cli_command_copied: Shape<"source", "package">;
  install_command_copied: Shape<"source", "package" | "platform">;
  component_viewed: Shape<"component", "platform" | "source">;
  component_code_copied: Shape<"component" | "platform", "source">;
  platform_selected: Shape<"platform", "location" | "component" | "source">;
  github_clicked: Shape<"source", "location">;
  npm_clicked: Shape<"source", "package">;
  changelog_viewed: Shape<never, "version" | "source">;
  external_link_clicked: Shape<"target", "source" | "location">;
}

export type AnalyticsEventName = keyof AnalyticsEvents;

/** `track(name)` alone is fine when every property is optional; otherwise the props argument is required. */
type TrackArgs<E extends AnalyticsEventName> = Record<never, never> extends AnalyticsEvents[E]
  ? [props?: AnalyticsEvents[E]]
  : [props: AnalyticsEvents[E]];

/* ------------------------------------------------------------------ what may leave the browser */

const ALLOWED_KEYS: ReadonlySet<string> = new Set([
  "source",
  "location",
  "page",
  "component",
  "platform",
  "package",
  "target",
  "version",
]);

/**
 * A value must look like an identifier: letters, digits and `_ . @ : / -`, at most 100 characters. That admits
 * slugs, paths, package names, hostnames and versions, and rejects whitespace, `?`, `=`, `#`, `&`, quotes and
 * anything else that free text, an email address or a query string needs.
 */
const SAFE_VALUE = /^[A-Za-z0-9_.@:/-]{1,100}$/;

/** Keep only allowlisted keys with identifier-shaped string values. Everything else is dropped, never sent. */
export function sanitizeProps(props: object | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!props) return out;
  for (const [key, value] of Object.entries(props)) {
    if (!ALLOWED_KEYS.has(key)) continue;
    if (typeof value === "string" && SAFE_VALUE.test(value)) out[key] = value;
    else if (process.env.NODE_ENV !== "production") console.warn(`[analytics] dropped property "${key}": not an identifier-shaped string`);
  }
  return out;
}

/** "/components?filter=data" → "/components". Query and hash never reach analytics. */
export function cleanPath(path: string): string | null {
  const bare = path.split(/[?#]/)[0] ?? "";
  return bare.startsWith("/") && SAFE_VALUE.test(bare) ? bare : null;
}

/* ------------------------------------------------------------------ the config gate */

export interface AnalyticsConfig {
  key: string;
  /** an https origin with no path: "https://us.i.posthog.com" */
  host: string;
}

export interface AnalyticsEnv {
  key?: string;
  host?: string;
  nodeEnv?: string;
  /** `window.location.hostname` — absent on the server, which therefore never starts analytics */
  hostname?: string;
  /** local verification of the pipeline only: skip the production-hostname check */
  anyHost?: boolean;
}

/**
 * Whether analytics runs, and with what. Returns null (analytics off) unless ALL of these hold:
 *  - a project key and an https host are configured (a missing or malformed value disables it, never throws);
 *  - this is a production build (`next dev` and the test runner never send);
 *  - we are running in a browser on the real site's hostname — so Vercel preview deployments, which are
 *    production builds that may inherit the same env vars, don't pollute production data. This is a runtime
 *    check on the hostname, not an environment guess.
 */
export function resolveAnalyticsConfig(env: AnalyticsEnv): AnalyticsConfig | null {
  const key = env.key?.trim();
  if (!key || !/^phc_[A-Za-z0-9]+$/.test(key)) return null;

  let host: URL;
  try {
    host = new URL(env.host?.trim() ?? "");
  } catch {
    return null;
  }
  if (host.protocol !== "https:") return null;

  if (env.nodeEnv !== "production") return null;
  if (!env.hostname) return null;
  if (!env.anyHost && env.hostname !== new URL(siteConfig.url).hostname) return null;

  return { key, host: host.origin };
}

/**
 * Reads the public env vars. Next inlines `process.env.NEXT_PUBLIC_*` only when written out literally, so
 * these accesses must stay spelled out — do not turn them into a lookup by name.
 */
export function readAnalyticsEnv(hostname: string | undefined): AnalyticsEnv {
  return {
    key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    nodeEnv: process.env.NODE_ENV,
    hostname,
    anyHost: process.env.NEXT_PUBLIC_ANALYTICS_ANY_HOST === "true",
  };
}

/* ------------------------------------------------------------------ the dispatcher */

/** What a vendor adapter must provide. `analytics-posthog.ts` is the only implementation. */
export interface AnalyticsClient {
  capture(event: string, props: Record<string, string>): void;
  pageview(path: string): void;
}

type Call = (client: AnalyticsClient) => void;

const MAX_QUEUE = 50;
let client: AnalyticsClient | null = null;
let state: "pending" | "ready" | "off" = "pending";
let queue: Call[] = [];
let starting: Promise<void> | null = null;

function dispatch(call: Call) {
  // Never on the server: this module is shared across requests there, so nothing may accumulate in it.
  if (typeof window === "undefined") return;
  if (state === "off") return;
  if (state === "ready" && client) return call(client);
  if (queue.length < MAX_QUEUE) queue.push(call);
}

/** Attach a vendor client and flush anything queued while it loaded. "Off" is terminal for the page load. */
export function attachAnalytics(next: AnalyticsClient) {
  if (state === "off") return;
  client = next;
  state = "ready";
  const pending = queue;
  queue = [];
  for (const call of pending) call(next);
}

/** Analytics is off for this page load: drop the queue and ignore every later call. */
export function disableAnalytics() {
  client = null;
  state = "off";
  queue = [];
}

type AdapterLoader = () => Promise<{ createPostHogClient(config: AnalyticsConfig): AnalyticsClient | Promise<AnalyticsClient> }>;

/**
 * Start analytics once per page load. Safe to call repeatedly and from React StrictMode's double effect: the
 * second call returns the first call's promise. The vendor SDK is imported only when analytics is enabled, so a
 * disabled build (dev, CI, previews, no env) never downloads it.
 */
export function startAnalytics(
  loadAdapter: AdapterLoader = () => import("./analytics-posthog"),
  env: AnalyticsEnv | null = typeof window === "undefined" ? null : readAnalyticsEnv(window.location.hostname),
): Promise<void> {
  if (starting) return starting;
  const config = env && resolveAnalyticsConfig(env);
  if (!config) {
    disableAnalytics();
    return (starting = Promise.resolve());
  }
  starting = loadAdapter()
    .then((adapter) => adapter.createPostHogClient(config))
    .then(attachAnalytics)
    // A blocked script (ad blocker) or network error must never surface to the visitor.
    .catch(disableAnalytics);
  return starting;
}

/** Test-only: forget all module state. */
export function resetAnalyticsForTests() {
  client = null;
  state = "pending";
  queue = [];
  starting = null;
}

export const analytics = {
  /** Record a funnel event. Properties are checked at compile time and allowlisted again at runtime. */
  track<E extends AnalyticsEventName>(event: E, ...args: TrackArgs<E>): void {
    const props = sanitizeProps(args[0]);
    dispatch((c) => c.capture(event, props));
  },

  /** Record a page view for a site path. Called by `AnalyticsProvider` on every route change — not by pages. */
  pageview(path: string): void {
    const clean = cleanPath(path);
    if (clean) dispatch((c) => c.pageview(clean));
  },
};
