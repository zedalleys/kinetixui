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
feature-flag requests, person profiles and `identify()`. The SDK's own campaign parsing is off and everything it
derives from a URL or referrer (`utm_*`, click ids, `$referrer`, `$referring_domain`, the search keyword) is deleted
before sending; acquisition is reported only through the `kx_*` properties below.
Change these in `analytics-posthog.ts` only, with a reason.

## One thing only the PostHog project can do

Client IP capture can't be disabled from the browser. In the PostHog project settings, turn on
**Discard client IP data**.

## The funnel: what fires, and where

One user action produces one semantic event. `$pageview` (navigation, from `AnalyticsProvider`) is separate and
unchanged. Rules live in [`src/lib/analytics-surfaces.ts`](src/lib/analytics-surfaces.ts), which is where to look
first — and to change — when a surface changes.

**What the marketing metrics are built from** is decided in [`marketing/analytics.md`](../../marketing/analytics.md)
§3 (Qualified Evaluation) and §4 (Adoption Intent), not here. Their executable form is
[`src/lib/analytics-measurement.ts`](src/lib/analytics-measurement.ts), and `analytics-measurement.test.tsx` fails when
the strategy, that module and the emitters disagree. None of these events measures activation: analytics.md §5 is
explicit that installs are not measurable on-site, and there is deliberately no `activated` event.

**Copy events:**

| Event | Fires when | Owner |
| --- | --- | --- |
| `cli_command_copied` | a `npx @kinetixui/cli …` command is copied | `HeroCommand` (homepage), `CodePre` (any docs fence) and the install strip on component pages (`ComponentMeta`) |
| `install_command_copied` | an `npm i @kinetixui/…` (or pnpm / yarn / bun add) command is copied, or a native port's install snippet is copied: a `Package.swift` dependency on `packages/ui-swiftui`, a Gradle `":kinetixui-ui"` registration, a `kinetix_ui:` pubspec entry, or a git command that clones or pins this repository on that port's setup page. Native copies carry the manifest package (`KinetixUI`, `com.kinetixui:ui-compose`, `kinetix_ui`) and `platform`; npm copies carry the package, plus `platform` when it is a platform's own package (`@kinetixui/ui` → react, `@kinetixui/angular` → angular) | `CodePre`, and the install strip on component pages (`ComponentMeta`) |
| `component_code_copied` | a component's code is copied, with its component and platform | `ComponentPreview` code tabs and `CodePre` on a component page |
| `block_code_copied` | a block's source is copied on `/blocks`, with its block and platform | `Showcase` (`analyticsBlock` set by the blocks gallery only) |

**View, navigation and selection events:**

| Event | Fires when | Owner |
| --- | --- | --- |
| `docs_viewed` | a listed `/docs/*` page is viewed (not installation, changelog or a component page); on a platform's setup page (/docs/angular, /docs/swiftui, /docs/compose, /docs/flutter) it also carries that `platform` | `AnalyticsProvider` |
| `installation_viewed` | `/docs/installation` is viewed, with `platform: react` | `AnalyticsProvider` |
| `component_viewed` | a component's docs page is viewed | `AnalyticsProvider` |
| `changelog_viewed` | `/docs/changelog` is viewed | `AnalyticsProvider` |
| `cta_clicked` | a link marked with `ctaAttrs(source, target, location?)` is clicked. `location` is OPTIONAL and limited to the four `CTA_LOCATIONS` (`footer`, `not_found`, `component_preview`, `component_onboarding`); a CTA that names none emits no `location` property at all, so every event recorded before the property existed stays valid and comparable. An unrecognised value is dropped and the CTA still counts | `AnalyticsProvider` listener; markup on the homepage, `/iot`, the Use cases hub (`/capabilities`, source `use_cases_hub`), each use-case page's next steps (source `use_case_page`), and the four paths to installation: the footer (source `footer`), the 404 page (source `not_found`), and on a component page both the preview's React setup link and the install strip's "React Setup →" (both source `component_page`, told apart only by `location`: `component_preview` versus `component_onboarding`). Only React's setup destination is `/docs/installation`, so the other four platforms' setup links are not tagged: the event has no `platform` property and tagging them would merge five destinations into one count |
| `platform_selected` | the user switches a platform tab: in a component's code view, a block's code view on `/blocks` (with `block`), or the homepage cross-platform example. The choice is shared by every switcher and remembered between pages (`platform-preference.ts`); restoring it on a later page, or opening a page with `?platform=`, is not a selection and fires nothing | `ComponentPreview`, `Showcase`, `CrossPlatformFlagship` |
| `component_code_viewed` | on a component page, the user opens the Code tab (`location: code_tab`) or, with it open, switches to another platform's code (`location: platform_tabs`). Carries `component`, the `platform` whose code is now on screen, and `source: component_page`; never the code. Not fired on render, on a restored platform, on a planned port (no code shown) or on a copy. Neither Qualified Evaluation nor Adoption Intent (analytics.md §3) | `ComponentPreview` |
| `github_clicked` | a link into our GitHub repository is clicked | `AnalyticsProvider` listener |
| `npm_clicked` | a link to one of our npm packages is clicked | `AnalyticsProvider` listener |
| `external_link_clicked` | a link to a listed external host with no more specific event (today: the Figma file) | `AnalyticsProvider` listener |
| `iot_example_copied` | an IoT example's source is copied from `/iot` | `IotExampleShowcase` |
| `search_result_selected` | a result is chosen in the command menu (⌘K), by Enter or pointer. `target` is the kind of destination only (`SEARCH_RESULT_TYPES`: component, docs, link, block, use_case, workflow, capability, theme), with `source: header`, `location: command_menu`. Never the search text, the title or the URL. Neither Qualified Evaluation nor Adoption Intent | `CommandMenu` |
| `verification_inspected` | the first opening, on a page view, of a component page's "Verification details" (`location: verification_details`, with `component`) or a use-case workflow's "Evidence for each part" (`location: workflow_evidence`, with `page`), or the first click on the "how the levels are earned" link there (`location: evidence_link`). Closing, re-opening and a disclosure that is only on screen send nothing; which rows were read is never sent. Neither Qualified Evaluation nor Adoption Intent | `AnalyticsProvider` listener; `inspectAttrs(...)` markup in `PlatformVerification` and `WorkflowReadiness` |

`iot_example_copied` is deliberately **not** `component_code_copied`, and the distinction is the reason the
component signal still means something. `component_code_copied` says code for a component from the 98-component
catalogue was copied; an IoT example is a whole composition copied off a marketing page, from a separate
Experimental module that is not in that catalogue. Folding the two together would inflate every measure built
on `component_code_copied` with a different kind of action and make its trend unreadable in both directions — a rise could be either
thing, and so could a fall. Adding an `example` property to the existing event was considered and rejected for
the same reason: a metric that needs a filter to mean what it used to mean has already changed.

It carries a `source` and a `location` and nothing else. Not the example's slug, which is a name and would be
the first piece of free text in the schema, and not a line of the snippet.

The view events are mutually exclusive: a page produces exactly one of `installation_viewed`,
`changelog_viewed`, `component_viewed` or `docs_viewed`. The more specific event wins, so a funnel step for
"read the docs" is `docs_viewed` OR `installation_viewed` OR `component_viewed`. The same rule applies to links: a
GitHub click is `github_clicked` and never also `external_link_clicked` or `cta_clicked`.

### Adding or changing instrumentation

- **A product CTA** (server-rendered page, no client component needed): `<Link href="/docs" {...ctaAttrs("homepage_hero", "get_started")}>`.
  `source` and `target` are closed unions in `analytics.ts`; extend them for a new surface, never pass a label.
  Ordinary navigation links are **not** CTAs.
- **A copy button**: pass `onCopy` to `CopyButton`. It runs only after the clipboard write succeeded and receives
  nothing, so the copied text can't reach an event. Never read the value into `analytics.track`.
- **Packages** come from `lib/packages.ts` (each package's own `package.json`); components come from the docs'
  own component list. Don't hand-type either.
- **`platform` means an implementation platform** (`react`, `swiftui`, `compose`, `flutter`). A package manager
  (npm/pnpm/yarn/bun) is not a platform; if it ever needs measuring, add a typed property instead.
- Tests in `analytics-surfaces.test.ts`, `analytics-provider.test.tsx` and `analytics-instrumentation.test.tsx`
  show each pattern; `analytics.architecture.test.ts` guards the rules above.

### Not instrumented on purpose

Copy buttons on `/charts`, `/docs/colors` and "copy page as markdown" (no component + platform to attribute, or not
code), and the homepage cross-platform example's copy button (a composed example, not a catalogue component —
`cross-platform-flagship.test.tsx` asserts the silence); `/create` reports only its own `preset_*` / `create_export_*`
events; the `/demos/building-operations` console's own controls (scenario, playback, floor, camera, zone and status
filters, layers, fullscreen — demo state, and the one signal worth having from the demo is whether it is found, which
`cta_clicked` with target `building_operations_demo` from `/iot` answers; the page itself is source
`building_operations_demo`); ordinary navigation, what is typed into the search palette (only the kind of result chosen is reported, as
`search_result_selected`), gallery search and filters (their text must never be sent);
attribution links (Radix, Lucide, Recharts). `npm_clicked` has no surface yet — the site links to no npm page —
but any link to one of our packages on npmjs.com is reported the moment it is added.

## Acquisition attribution

Where did a developer come from, what did they do, and did it reach Qualified Evaluation or Adoption Intent?
Attribution answers the first part
with a deliberately simple, inspectable model. **It is directional evidence, not causal truth**: referrers are
stripped by many apps and privacy tools, a link can be shared beyond the audience it was made for, and a visit is
credited to a channel, not to the effect of a post. Use it to compare channels, not to prove one caused an install.

It lives in [`src/lib/analytics-attribution.ts`](src/lib/analytics-attribution.ts). No cookies, no server, no
dependency, no identification — the anonymous PostHog id is unchanged. UI code knows nothing about it: the adapter
adds the attribution to **every** event (including `$pageview`) centrally.

### Session entry vs first touch

| | Answers | Stored in | Lifetime | Rule |
| --- | --- | --- | --- | --- |
| `kx_*` (session entry) | How did *this browsing session* begin? | `sessionStorage` (`kx_analytics_session_v1`) | the tab | derived on the first page of the session, then reused. Later pages, referrers and every client-side navigation leave it alone; a later arrival carrying a **different valid `kx_` campaign tag** starts a new session entry. Only the values the query string carries are compared (campaign, content, and a tagged source or medium), never a source inferred from the referrer, so a reload keeps the channel |
| `kx_first_*` (first touch) | How was this *browser* first acquired? | `localStorage` (`kx_analytics_first_touch_v1`) | until cleared | **write-once**. Never overwritten, and never replaced by `direct` |

A second tagged arrival changes the record each later event carries; it does **not** start a new PostHog session.
Session-level reporting takes one campaign per `$session_id` — the earliest tagged one
(`argMin(properties.kx_campaign, timestamp)` in `scripts/marketing-weekly-report.mjs`, the rule in
`marketing/analytics.md`) — so a tab that arrives on two campaigns inside one PostHog session is still counted
under the first. Per-event attribution is right; the session rollup is unchanged, deliberately, because changing
it would break comparability with every week already reported.

Properties (each present only when known): `kx_source`, `kx_medium`, `kx_campaign`, `kx_content`, `kx_referrer`,
`kx_landing_page`, and the same six as `kx_first_*`; plus `kx_traffic_type` on diagnostic traffic only (below). Only normalised values are ever stored or sent — never a query
string, a referrer, a click id or a full URL. Storage is re-validated when read (it is user-editable).

### Source taxonomy (closed)

`direct`, `google`, `bing`, `duckduckgo`, `github`, `linkedin`, `x`, `reddit`, `devto`, `hashnode`, `producthunt`,
`youtube`, `newsletter`, `other`.

`utm_source` is normalised, never forwarded: `twitter` / `x.com` / `t.co` → `x`; `dev.to` / `dev_to` → `devto`;
`google`, `google.com`, `google_search` → `google`; **anything unrecognised → `other`**, and the raw value is
discarded. `kx_referrer` uses the same list without `newsletter`, classified from the referrer's *hostname only*.

### Medium taxonomy (closed)

`organic`, `social`, `community`, `referral`, `email`, `launch`, `video`, `direct`, `other`.

A known `utm_medium` is used. An unknown one is ignored (never forwarded), and the medium is inferred from the
source: google / bing / duckduckgo → `organic`; linkedin / x → `social`; reddit / devto / hashnode → `community`;
producthunt → `launch`; youtube → `video`; newsletter → `email`; github → `referral`; direct → `direct`; an
unrecognised external site → `referral`; otherwise `other`.

### Campaign and content

`utm_campaign` is kept **only** if it matches `kx_[a-z0-9][a-z0-9_-]{0,62}` — a KinetixUI campaign. `utm_content`
is kept only if it is a slug `[a-z0-9][a-z0-9_-]{0,63}` **and** a valid campaign is present. Anything else is
omitted, never "cleaned" into a different value. A campaign is never inferred.

### Precedence

- **Source:** (1) a `utm_source` that maps to a known source; (2) a recognised external referrer; (3) `other` if a
  tag or an unrecognised external site existed; (4) `direct`.
- **Medium:** (1) a known `utm_medium`; (2) inferred from the source.
- **Referrer:** our own site (or a subdomain), no referrer, or a non-web referrer is `direct`. An internal referrer
  never creates or overwrites acquisition.
- **Landing page:** the clean pathname of the session's first page.

### Campaign links

Use `utm_*` on **external** links only, never on links inside kinetixui.com. Campaigns must use the `kx_` prefix.

```
LinkedIn      ?utm_source=linkedin&utm_medium=social&utm_campaign=kx_launch_2026&utm_content=component_demo
Reddit        ?utm_source=reddit&utm_medium=community&utm_campaign=kx_launch_2026&utm_content=designsystems_post
DEV           ?utm_source=devto&utm_medium=community&utm_campaign=kx_design_tokens_article
Product Hunt  ?utm_source=producthunt&utm_medium=launch&utm_campaign=kx_producthunt_launch
```

Spaces, `@`, dots, slashes, colons, uppercase or any URL characters in a campaign or content value cause it to be
omitted (the source and medium still count).

### Privacy rules

- The query string is read in one place (`analytics-attribution.ts`); each value is normalised at once and the raw
  text discarded. Click ids (`gclid`, `fbclid`, `msclkid`, `li_fat_id`, …) are never read, stored or sent.
- `document.referrer` is never sent or stored: it becomes a category (`kx_referrer`), and an unknown hostname
  becomes `other` without being kept.
- The SDK derives its own `$referrer`, `$referring_domain`, `$search_engine` and search keyword
  (`$session_entry_ph_keyword` is the visitor's search text) and its own `utm_*` copies. All are deleted in
  `before_send`, and every `kx_*` value is re-validated there, so nothing can carry acquisition out except the
  validated `kx_*` set. `$current_url` remains origin + clean pathname.
- Attribution starts only after analytics is enabled (production, real hostname, valid config) and Do Not Track
  is off; otherwise nothing is written to storage.
- **Storage blocked?** Nothing throws and no console noise. The session's attribution is kept in memory for the
  page's life; first touch is omitted (it could not be persisted, so claiming it would be wrong). Product events
  are unaffected.

### Limitations

- A tab that stays open keeps its session attribution however long it lives, and a first visit that arrives with
  no referrer (typed URL, a privacy-stripped click) locks first touch as `direct` — write-once means it is never
  upgraded.
- Referrers are often absent or trimmed to an origin; `direct` overstates typed visits.
- Clearing site data, private windows and another browser or device all start a new "first touch".
- Only KinetixUI-tagged campaigns are named. Untagged shares appear as their referrer or as `other`/`direct`.

- **Session entry is per tab; PostHog's `$session_id` is not.** `kx_*` lives in the tab's sessionStorage, while the
  SDK's session id (localStorage) spans every tab of the browser. A component opened in a new tab from a campaign
  landing carries `kx_source=direct` and no `kx_campaign` — still in the campaign's PostHog session, and still with
  `kx_first_campaign` if that was the first touch. So attribute a SESSION by any of its events carrying a campaign,
  never by filtering individual evaluation events on `kx_campaign`; `summarizeSessions` in
  `src/lib/analytics-measurement.ts` is the rule in code, and `analytics-posthog.attribution.test.ts` pins the tab
  behaviour.

### Diagnostic traffic

A test of the site or its analytics is marked, not filtered at the source: open its first page with
`?kx_traffic=diagnostic`. The tab stores the mark in `sessionStorage` (`kx_analytics_traffic_v1`) and every event it
sends carries `kx_traffic_type: "diagnostic"`, the only value that property may take (`sanitizeAttributionProps`
drops anything else). `?kx_traffic=clear` removes it. The mark does not change attribution, so a campaign link can
still be tested. Reporting drops every session holding a marked event; PostHog keeps the raw events. The policy and
the probe checklist are in [`marketing/analytics.md`](../../marketing/analytics.md) §11 *Diagnostic traffic*.

### Internal traffic

The team's own browsing is marked once per browser, not per test: open any page with `?kx_traffic=internal`. The
mark lives in `localStorage` (`kx_analytics_internal_v1`), so it survives new tabs and restarts of that browser, and
every event carries `kx_traffic_type: "internal"`. A diagnostic mark in the same tab wins; `?kx_traffic=clear`
removes both. Vercel Web Analytics drops internal page views for the same reason it drops diagnostic ones. Why a mark
and not PostHog's "internal users" cohort: with `person_profiles: identified_only` and no sign-in, the site never
identifies anyone, so a person cohort is always empty (marketing/analytics.md §11 *Traffic cohorts*).

### Engagement (`page_engaged`)

`AnalyticsProvider` sends `page_engaged` on the first trusted pointer, key, touch or wheel input after each page view,
at most once per page view, with `source` where the page has one. Scroll, focus and mouse movement do not count, and
neither do synthetic events (`isPersonInput` checks `isTrusted`). It is an arrival event and evidence that someone was
there, never a Qualified Evaluation or Adoption Intent signal. Reporting uses it to tell a page that was only loaded
from a page someone used (marketing/analytics.md §11 *Traffic cohorts*).

### Marketing metrics

Defined in [`marketing/analytics.md`](../../marketing/analytics.md) — Qualified Evaluation Rate, Adoption Intent
Rate and Evaluation → Intent Progression, all derived in PostHog and counted in **sessions** (`$session_id`), never in
events. The "Developer Activation Rate" this section used to define (copy events ÷ visitors) is retired: analytics.md
§5 rules out reporting any on-site signal as activation.

## Page leave, session duration and bounce rate

`capture_pageleave` is **on**. Without `$pageleave`, PostHog cannot tell how long the last page of a session was
viewed, so session duration and bounce rate come out too low. (The SDK's default, `'if_capture_pageview'`, is *off*
for us because our page views are manual, so it has to be set explicitly.)

- **When it fires:** when the page is hidden (`pagehide`), once per page. Between pages of a client-side visit there is
  no `$pageleave`: the next `$pageview` carries `$prev_pageview_duration` and the scroll-depth of the page just left.
- **What it carries:** the clean `$current_url`, the `kx_*` attribution, and only measurements — duration, scroll and
  content depth, the previous page-view id and the previous page's clean pathname. Nothing the visitor typed or
  clicked. Everything else in this document about URLs, referrers and campaigns still applies to it.
- **Attribution reaches it because it is attached in `before_send`**, for every event, not at the call sites. The SDK
  creates `$pageleave` itself and it never passes through our `capture` wrapper, so enrichment there would have missed it.
- **Volume:** roughly one extra event per page view. Keep that in mind against your PostHog event quota.
- **It does not make a session an arrival.** A tab left idle past PostHog's 30-minute session timeout sends its
  `$pageleave` under a new `$session_id`, so that session holds nothing else. The marketing denominator counts only
  sessions with a `$pageview` or a product event (`ARRIVAL_EVENTS` in `src/lib/analytics-measurement.ts`; marketing/
  analytics.md §4 *Eligible arriving session*). Exclude it from any breakdown that counts "events per visitor".
- Do Not Track still applies: with it on, nothing is captured, `$pageleave` included.

## Vercel Web Analytics and Speed Insights (second view of traffic and performance)

Two smaller Vercel tools next to PostHog: Web Analytics (page views, visitors, top pages, referrers, countries and
devices) and Speed Insights (Core Web Vitals per page: LCP, INP, CLS, FCP, TTFB). Both are context only. Qualified Evaluation, Adoption Intent and attribution stay in PostHog,
and nothing here feeds them; the two tools count visitors differently, so their totals will not match.

Rules in [`src/lib/analytics-vercel.ts`](src/lib/analytics-vercel.ts); both SDKs are imported only by
[`src/components/vercel-analytics.tsx`](src/components/vercel-analytics.tsx), mounted next to `AnalyticsProvider`.

- **Same gate as PostHog.** Both scripts load only in a production build on `kinetixui.com` (or with
  `NEXT_PUBLIC_ANALYTICS_ANY_HOST=true`), so `next dev`, tests and Vercel preview deployments never load them. They
  need no environment variables. The React entry points are used, not `/next`, so nothing reads `useSearchParams`;
  every route here is a literal path, so `/next`'s dynamic-route grouping would add nothing.
- **A page view is a pathname change**, reported from `usePathname()`, not from the history API: passing `route`
  turns the script's own `pushState` tracking off, so a query-only change (the changelog filter) is not counted as
  another view of the same page.
- **Page views only.** No custom events: `track` from `@vercel/analytics` is not used (the architecture test pins
  it), and `beforeSend` cancels any `event` that arrives anyway. Never send copied code, commands or URLs to it.
- **Speed Insights sends measurements only** (`vital`); its `beforeSend` cancels anything else.
- **URLs are cut to origin + path** in `beforeSend`, so no query string (`?q=`, `?filter=`, `utm_*`) or hash is sent.
  A path that is not identifier-shaped (`cleanPath`) is dropped, exactly as for PostHog page views.
- **Do Not Track** cancels every page view and measurement. A tab marked `?kx_traffic=diagnostic`, and a browser marked
  `?kx_traffic=internal`, are also cancelled, because a
  Vercel event cannot carry the mark and so could not be filtered out afterwards. The check uses the same writer as
  PostHog, so the mark holds for the rest of the tab even when PostHog is off; with storage blocked it holds in
  memory until a full reload.
- **What Vercel itself collects** (its documented behaviour, not something this code controls): Web Analytics gets
  the page URL we pass, the referrer, the country from the request, browser, OS and device type, sets no cookie, and
  counts a visitor by a request hash it resets daily. Speed Insights gets the page URL we pass, the Web Vitals
  values, and browser, OS, device type, country and connection type; it identifies no visitor. Both scripts and
  their ingest are same-origin (`/_vercel/insights/*`, `/_vercel/speed-insights/*`), so the CSP needs no change.
- **To turn them on:** enable Web Analytics and Speed Insights on the Vercel project (each has its own tab), then
  redeploy. Until then each script request 404s and nothing is collected. Speed Insights may be billed beyond the
  plan's free allowance; check the project's plan.
