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
 * reach PostHog even from an event we didn't think of. Campaign parameters (`utm_*`, `gclid`, …) are not saved
 * either: UTM attribution is a separate, deliberate task.
 *
 * NOT DONE HERE: client IP capture cannot be turned off from the browser (PostHog's `ip` option is deprecated
 * and has no effect). Enable "Discard client IP data" in the PostHog project settings.
 */
import type { CaptureResult, PostHogConfig } from "posthog-js";
import type { AnalyticsClient, AnalyticsConfig } from "./analytics";

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
 * Marketing / click-id parameters. `save_campaign_params: false` stops the SDK saving them as event properties,
 * but it still copies them into session-entry properties (`$session_entry_utm_source`, `$session_entry_gclid`) —
 * found by the real-SDK test in analytics-posthog.integration.test.ts. UTM attribution is a separate, deliberate
 * task; until it lands they are removed here. That task deletes this list and the `campaign` step below.
 */
const CAMPAIGN_PARAM = /^(utm_[a-z0-9_]+|gclid|gbraid|wbraid|gad_source|gad_campaignid|fbclid|msclkid|dclid|twclid|ttclid|li_fat_id|mc_cid|mc_eid|igshid|rdt_cid|epik|qclid|sccid|irclid|_kx)$/;

/** `$session_entry_utm_source` / `$initial_gclid` / `utm_source` → the bare parameter name. */
const bareParamName = (key: string) => key.replace(/^\$?(session_entry_|initial_)?/, "");

/**
 * PostHog `before_send`: before anything is sent, remove the query string and hash from every URL-valued
 * property, and drop every campaign parameter.
 */
export function sanitizeCapture(result: CaptureResult | null): CaptureResult | null {
  if (!result) return result;
  for (const bag of [result.properties, result.$set, result.$set_once] as Array<Record<string, unknown> | undefined>) {
    if (!bag) continue;
    for (const key of Object.keys(bag)) {
      if (URL_KEY.test(key)) bag[key] = stripQueryAndHash(bag[key]);
      else if (CAMPAIGN_PARAM.test(bareParamName(key))) delete bag[key];
    }
  }
  return result;
}

export function posthogOptions(host: string): Partial<PostHogConfig> {
  return {
    api_host: host,

    // pageviews: manual, see the header
    capture_pageview: false,
    capture_pageleave: false,

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

    // no campaign / query capture
    save_campaign_params: false,

    before_send: sanitizeCapture,
  };
}

export async function createPostHogClient(config: AnalyticsConfig): Promise<AnalyticsClient> {
  const { default: posthog } = await import("posthog-js");
  if (!posthog.__loaded) posthog.init(config.key, posthogOptions(config.host));

  return {
    capture: (event, props) => {
      posthog.capture(event, props);
    },
    pageview: (path) => {
      posthog.capture("$pageview", { $current_url: window.location.origin + path });
    },
  };
}
