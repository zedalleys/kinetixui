/**
 * Vercel Web Analytics and Speed Insights — a second, deliberately smaller view of traffic and page performance
 * next to PostHog. The only file that imports `@vercel/analytics` or `@vercel/speed-insights` is
 * `components/vercel-analytics.tsx`; the rules it applies live here so they can be tested without the SDKs.
 *
 * WHAT IT IS FOR: page views, visitors, top pages, referrers, countries and devices (Web Analytics) and Core Web
 * Vitals per page (Speed Insights) in the Vercel dashboard. It is NOT a source for the marketing metrics: Qualified Evaluation, Adoption Intent and attribution are PostHog's
 * (`marketing/analytics.md`), and nothing here feeds them.
 *
 * DECISIONS:
 *  - Page views only. No custom events are ever sent (`track` from `@vercel/analytics` is not imported anywhere;
 *    the architecture test pins it), and `beforeSend` drops any `event` that arrives anyway.
 *  - Speed Insights sends Web Vitals measurements (`vital`) only; anything else is dropped the same way.
 *  - The same gate as PostHog: a production build on the real site's hostname, so `next dev`, tests and Vercel
 *    preview deployments never load either script. `NEXT_PUBLIC_ANALYTICS_ANY_HOST` lifts the hostname check for
 *    local pipeline checks, exactly as it does for PostHog.
 *  - Do Not Track drops every page view and measurement, as PostHog's `respect_dnt` does.
 *  - A tab marked `?kx_traffic=diagnostic` is dropped: Vercel events cannot carry the mark, so they cannot be
 *    filtered later the way PostHog sessions are.
 *  - The URL is cut to origin + path before sending, so a query string (`?q=`, `?filter=`, `utm_*`) or a hash never
 *    reaches Vercel.
 */
import { cleanPath } from "./analytics-safe";
import { doNotTrack, isDiagnosticTab, isInternalBrowser } from "./analytics-attribution";
import { siteConfig } from "./site";

export interface VercelAnalyticsEnv {
  nodeEnv?: string;
  /** `window.location.hostname`; absent on the server, which therefore never loads the script */
  hostname?: string;
  anyHost?: boolean;
}

/** Whether to load the Vercel scripts at all on this page load. */
export function shouldLoadVercelAnalytics(env: VercelAnalyticsEnv): boolean {
  if (env.nodeEnv !== "production") return false;
  if (!env.hostname) return false;
  return Boolean(env.anyHost) || env.hostname === new URL(siteConfig.url).hostname;
}

/** Spelled out so Next inlines the values at build time, as in `readAnalyticsEnv`. */
export function readVercelAnalyticsEnv(hostname: string | undefined): VercelAnalyticsEnv {
  return {
    nodeEnv: process.env.NODE_ENV,
    hostname,
    anyHost: process.env.NEXT_PUBLIC_ANALYTICS_ANY_HOST === "true",
  };
}

/** Structurally the SDKs' `BeforeSendEvent`s, kept local so this module stays SDK-free. */
export interface VercelEvent {
  type: "pageview" | "event" | "vital";
  url: string;
  route?: string;
}

export interface VercelPrivacy {
  dnt: boolean;
  diagnostic: boolean;
  /** a browser marked `?kx_traffic=internal`: the team's own visits are not audience traffic either */
  internal?: boolean;
}

function browserPrivacy(): VercelPrivacy {
  return { dnt: doNotTrack(), diagnostic: isDiagnosticTab(), internal: isInternalBrowser() };
}

/**
 * The shared `beforeSend` rule: only the one event type a tool is allowed to send, nothing under Do Not Track,
 * from a diagnostic tab or from an internal browser, and the URL cut to origin + path. Null cancels the event.
 */
function allowOnly<E extends VercelEvent>(type: VercelEvent["type"], event: E, privacy: VercelPrivacy): E | null {
  if (event.type !== type) return null;
  if (privacy.dnt || privacy.diagnostic || privacy.internal) return null;
  let url: URL;
  try {
    url = new URL(event.url);
  } catch {
    return null;
  }
  const path = cleanPath(url.pathname);
  if (!path) return null;
  return { ...event, url: url.origin + path };
}

/** Web Analytics' `beforeSend`: page views only. */
export function vercelBeforeSend<E extends VercelEvent>(event: E, privacy: VercelPrivacy = browserPrivacy()): E | null {
  return allowOnly("pageview", event, privacy);
}

/** Speed Insights' `beforeSend`: Web Vitals measurements only. */
export function speedInsightsBeforeSend<E extends VercelEvent>(event: E, privacy: VercelPrivacy = browserPrivacy()): E | null {
  return allowOnly("vital", event, privacy);
}
