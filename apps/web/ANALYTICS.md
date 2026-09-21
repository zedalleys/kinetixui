# Analytics (website)

Product analytics for kinetixui.com use PostHog, behind one interface: [`src/lib/analytics.ts`](src/lib/analytics.ts).

## Configuration

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_POSTHOG_KEY` | the project's public `phc_…` key |
| `NEXT_PUBLIC_POSTHOG_HOST` | an https origin, e.g. `https://us.i.posthog.com` (US) or `https://eu.i.posthog.com` (EU) |

Set them in `apps/web/.env.local` locally (git-ignored; template in [`.env.example`](.env.example)) and in the
Vercel project's environment variables for production. `NEXT_PUBLIC_*` values are baked in at **build** time, so
change them, then redeploy.

## When it runs

Analytics sends only when **all** of these hold; otherwise every call is a silent no-op and the SDK is never downloaded:

- both variables are set and valid (a missing or malformed value disables analytics — it never throws);
- it is a production build (`next dev` and the test runner never send);
- the page is on `kinetixui.com`. Vercel preview deployments are production builds too, so this is checked
  against the hostname at runtime rather than trusting which environment the variables were scoped to.

## Rules for UI code

- Call `analytics.track("event_name", { … })`. **Never** call `posthog.capture` (or import `posthog-js`) from a
  component — only `src/lib/analytics-posthog.ts` may.
- Events and their properties are the typed contract `AnalyticsEvents`. Add a new event there; an unknown event or
  property is a compile error. `source` is a closed union — extend it rather than passing free text.
- **No PII, ever.** Property values must be identifiers: a slug, a package name, a hostname, a version. Never an
  email, a name, form or search text, clipboard contents, a full URL or a query string. Anything that is not
  identifier-shaped is dropped at runtime, and query strings and hashes are stripped from every URL sent.
- Do not call `analytics.pageview` from a page: `AnalyticsProvider` (mounted in the root layout) reports one page
  view per route change.

## What is deliberately off

Session recording, autocapture, heatmaps, dead/rage-click capture, surveys, exception capture, web vitals,
feature-flag requests, person profiles and `identify()`. Campaign parameters (`utm_*`, `gclid`, …) are not saved.
Change these in `analytics-posthog.ts` only, with a reason.

## One thing only the PostHog project can do

Client IP capture can't be disabled from the browser. In the PostHog project settings, turn on
**Discard client IP data**.
