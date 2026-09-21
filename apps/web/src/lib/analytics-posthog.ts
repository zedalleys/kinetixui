/**
 * The PostHog adapter. The only file that imports `posthog-js`, and only ever loaded through a dynamic
 * `import()` from `startAnalytics` — so it is not in the bundle a visitor downloads unless analytics is on.
 *
 * DECISIONS (each is deliberate; change them here, not at call sites):
 *
 * Pageviews are MANUAL (`capture_pageview: false`). `AnalyticsProvider` fires one `$pageview` per route change
 * from Next's `usePathname()`, with a URL rebuilt from the origin + pathname. PostHog's own pageview capture
 * would send `location.href` — query string included — and would double-count next to ours. One mechanism only.
 *
 * NO AUTOCAPTURE. The funnel is a short list of explicit product events (see `AnalyticsEvents`); autocapture
 * would add every click and its element text/attributes for no question we are asking. Dead-click, rage-click
 * and heatmap capture are autocapture's cousins and are off with it.
 *
 * NO SESSION REPLAY, surveys, conversations, experiments, exception capture, web vitals or feature-flag
 * requests. `disable_external_dependency_loading` also stops PostHog fetching any of their scripts, so the CSP
 * needs one `connect-src` origin and no `script-src` change.
 *
 * NO PERSON PROFILES for anonymous visitors, no `identify()`, and nothing is ever attached to a person: KinetixUI
 * has no login and no reason to know who a visitor is. The identifier lives in localStorage (no cookie).
 *
 * URLs are stripped of query and hash in `before_send`, so a filter (`?filter=…`) or search (`?q=…`) can never
 * reach PostHog even from an event we didn't think of.
 *
 * PAGE LEAVE is ON (`capture_pageleave: true`). Without `$pageleave` PostHog cannot tell how long the last page of a
 * session was viewed, so session duration and bounce rate come out too low. The SDK's default is
 * `'if_capture_pageview'`, which means OFF here because our page views are manual, so it must be set to `true`. The SDK
 * creates `$pageleave` itself (it never goes through our `capture` wrapper), which is why attribution is attached in
 * `before_send` and not at the call sites: every event, including this one, gets it. `$pageleave` carries only a
 * clean URL and numeric duration / scroll-depth measurements; nothing the visitor typed or clicked.
 *
 * ATTRIBUTION is owned by `analytics-attribution.ts`, not by the SDK. The SDK's own campaign parsing stays off
 * (`save_campaign_params: false`) and anything it derives anyway — `utm_*`, `$session_entry_utm_*`, click ids,
 * `$referrer`, `$referring_domain` and their initial / session-entry twins — is deleted in `before_send`. What
 * replaces them is the normalised `kx_*` / `kx_first_*` context, added HERE in `before_send` (so every event carries it and
 * no component ever touches acquisition data) and validated right after, so nothing else can carry a `kx_*` value out.
 *
 * NOT DONE HERE: client IP capture cannot be turned off from the browser (PostHog's `ip` option is deprecated
 * and has no effect). Enable "Discard client IP data" in the PostHog project settings.
 */
import type { CaptureResult, PostHogConfig } from "posthog-js";
import type { AnalyticsClient, AnalyticsConfig } from "./analytics";
import { getAttributionContext, sanitizeAttributionProps } from "./analytics-attribution";

/**
 * Properties PostHog fills in with a full URL or referrer: `$current_url`, `$referrer`, `$initial_current_url`,
 * `$session_entry_url`, … A rule rather than a list, so a property PostHog adds later is covered too. The SDK
 * also persists the landing URL, so a visit that started on `/components?filter=x` would otherwise re-send it.
 */
const URL_KEY = /^\$.*(url|referrer)$/;

/** "https://a.com/x?y=1#z" → "https://a.com/x". Anything that isn't a URL ("$direct") is returned unchanged. */
export function stripQueryAndHash(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    const url = new URL(value);
    return url.origin + url.pathname;
  } catch {
    return value;
  }
}

/**
 * Marketing / click-id parameters the SDK may derive. `save_campaign_params: false` stops it saving them as event
 * properties, but it still copies them into session-entry properties (`$session_entry_utm_source`,
 * `$session_entry_gclid`) — found by the real-SDK test in analytics-posthog.integration.test.ts. We do not use the
 * SDK's campaign properties (attribution is the `kx_*` contract) and never want ad-platform click ids, so they are
 * always removed. This list deliberately stays.
 */
const CAMPAIGN_PARAM = /^(utm_[a-z0-9_]+|gclid|gclsrc|gbraid|wbraid|gad_source|gad_campaignid|fbclid|msclkid|dclid|twclid|ttclid|li_fat_id|mc_cid|mc_eid|igshid|rdt_cid|epik|qclid|sccid|irclid|_kx)$/;

/** `$session_entry_utm_source` / `$initial_gclid` / `utm_source` → the bare parameter name. */
const bareParamName = (key: string) => key.replace(/^\$?(session_entry_|initial_)?/, "");

/**
 * Everything the SDK derives from the referrer, plus their `$initial_` and `$session_entry_` twins:
 *  - `$referrer` — a full URL, path included;
 *  - `$referring_domain` — a raw hostname;
 *  - `$search_engine` and `ph_keyword` — the SDK reads the search KEYWORD out of a search-engine referrer's query
 *    string (`$session_entry_ph_keyword`). That is the visitor's search text. Found by the real-SDK test in
 *    analytics-posthog.attribution.test.ts, not by reasoning: it only appears with a real referrer.
 * All are deleted; `kx_referrer` (a closed category) replaces them.
 */
const REFERRER_KEY = /^\$?(?:initial_|session_entry_)?(?:referrer|referring_domain|search_engine|ph_keyword)$/;

/**
 * PostHog `before_send`, first step: give EVERY event the trusted attribution context. It runs for events the SDK
 * creates on its own (`$pageleave`) as well as for ours, which is why enrichment lives here and not in `capture`.
 * The context comes only from analytics-attribution.ts, and `sanitizeCapture` validates it straight after.
 */
export function attachAttribution(result: CaptureResult | null): CaptureResult | null {
  if (!result) return result;
  Object.assign(result.properties, getAttributionContext());
  return result;
}

/**
 * PostHog `before_send`, second step: before anything is sent, delete the SDK's referrer and campaign properties, remove the
 * query string and hash from every remaining URL-valued property, and drop any `kx_*` value that is not valid
 * attribution.
 */
export function sanitizeCapture(result: CaptureResult | null): CaptureResult | null {
  if (!result) return result;
  for (const bag of [result.properties, result.$set, result.$set_once] as Array<Record<string, unknown> | undefined>) {
    if (!bag) continue;
    for (const key of Object.keys(bag)) {
      if (REFERRER_KEY.test(key) || CAMPAIGN_PARAM.test(bareParamName(key))) delete bag[key];
      else if (URL_KEY.test(key)) bag[key] = stripQueryAndHash(bag[key]);
    }
    sanitizeAttributionProps(bag);
  }
  return result;
}

export function posthogOptions(host: string): Partial<PostHogConfig> {
  return {
    api_host: host,

    // pageviews: manual, see the header
    capture_pageview: false,
    // on: needed for accurate session duration and bounce rate — see the header
    capture_pageleave: true,

    // no broad capture
    autocapture: false,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    rageclick: false,

    // no replay or other remote-configured features
    disable_session_recording: true,
    disable_surveys: true,
    disable_conversations: true,
    disable_web_experiments: true,
    capture_exceptions: false,
    capture_performance: false,
    advanced_disable_flags: true,
    disable_external_dependency_loading: true,

    // identity and storage
    person_profiles: "identified_only",
    persistence: "localStorage",
    respect_dnt: true,

    // the SDK does not parse campaigns: attribution is ours (analytics-attribution.ts)
    save_campaign_params: false,

    // order matters: attach the context, then validate and clean everything
    before_send: [attachAttribution, sanitizeCapture],
  };
}

export async function createPostHogClient(config: AnalyticsConfig): Promise<AnalyticsClient> {
  const { default: posthog } = await import("posthog-js");
  if (!posthog.__loaded) posthog.init(config.key, posthogOptions(config.host));

  return {
    // `props` were allowlisted by analytics.ts; attribution is attached in `before_send`, for every event
    capture: (event, props) => {
      posthog.capture(event, props);
    },
    pageview: (path) => {
      posthog.capture("$pageview", { $current_url: window.location.origin + path });
    },
  };
}
