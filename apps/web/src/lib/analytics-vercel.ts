/**
 * Vercel Web Analytics — a second, deliberately smaller view of traffic next to PostHog. The only file that
 * imports `@vercel/analytics` is `components/vercel-analytics.tsx`; the rules it applies live here so they can be
 * tested without the SDK.
 *
 * WHAT IT IS FOR: page views, visitors, top pages, referrers, countries and devices in the Vercel dashboard. It is
 * NOT a source for the marketing metrics: Qualified Evaluation, Adoption Intent and attribution are PostHog's
 * (`marketing/analytics.md`), and nothing here feeds them.
 *
 * DECISIONS:
 *  - Page views only. No custom events are ever sent (`track` from `@vercel/analytics` is not imported anywhere;
 *    the architecture test pins it), and `beforeSend` drops any `event` that arrives anyway.
 *  - The same gate as PostHog: a production build on the real site's hostname, so `next dev`, tests and Vercel
 *    preview deployments never load the script. `NEXT_PUBLIC_ANALYTICS_ANY_HOST` lifts the hostname check for
 *    local pipeline checks, exactly as it does for PostHog.
 *  - Do Not Track drops every page view, as PostHog's `respect_dnt` does.
 *  - A tab marked `?kx_traffic=diagnostic` is dropped: Vercel events cannot carry the mark, so they cannot be
 *    filtered later the way PostHog sessions are.
 *  - The URL is cut to origin + path before sending, so a query string (`?q=`, `?filter=`, `utm_*`) or a hash never
 *    reaches Vercel.
 */
import { cleanPath } from "./analytics-safe";
import { doNotTrack, isDiagnosticTab } from "./analytics-attribution";
import { siteConfig } from "./site";

export interface VercelAnalyticsEnv {
  nodeEnv?: string;
  /** `window.location.hostname`; absent on the server, which therefore never loads the script */
  hostname?: string;
  anyHost?: boolean;
}

/** Whether to load the Vercel script at all on this page load. */
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

/** Structurally the SDK's `BeforeSendEvent`, kept local so this module stays SDK-free. */
export interface VercelEvent {
  type: "pageview" | "event";
  url: string;
}

export interface VercelPrivacy {
  dnt: boolean;
  diagnostic: boolean;
}

function browserPrivacy(): VercelPrivacy {
  return { dnt: doNotTrack(), diagnostic: isDiagnosticTab() };
}

/** The SDK's `beforeSend`: null cancels the event. */
export function vercelBeforeSend<E extends VercelEvent>(event: E, privacy: VercelPrivacy = browserPrivacy()): E | null {
  if (event.type !== "pageview") return null;
  if (privacy.dnt || privacy.diagnostic) return null;
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
